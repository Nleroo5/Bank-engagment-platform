import { Client } from 'pg';
import { sanityClient } from '@/lib/sanity/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

interface SanityQuestion {
  _id: string;
  questionNumber?: number;
  number?: number; // Legacy field
  questionText?: string;
  text?: string; // Legacy field
  category: {
    _id: string;
    name: string;
  };
  isReversed: boolean;
  isRequired: boolean;
  anchorText?: string;
}

interface SanitySurvey {
  _id: string;
  title: string;
  description?: string;
  surveyNumber?: number;
  surveyType: string;
  sections?: Array<{
    _id: string;
    title: string;
    description?: string;
    questions: SanityQuestion[];
  }>;
  scale?: {
    _id: string;
    name: string;
    scaleType: string;
  };
}

interface MigrationMapping {
  surveys: Record<string, string>;
  questions: Record<string, string>;
  categories: Record<string, string>;
  sections: Record<string, string>;
}

async function migrateSurveys() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const mapping: MigrationMapping = {
    surveys: {},
    questions: {},
    categories: {},
    sections: {},
  };

  try {
    await client.connect();
    console.log('🚀 Starting Sanity to PostgreSQL migration...\n');

    // Step 1: Fetch and map categories
    console.log('📦 Step 1: Fetching categories from Sanity...');
    const sanityCategories = await sanityClient.fetch<
      Array<{ _id: string; name: string }>
    >(`*[_type == "category"] { _id, name }`);

    console.log(`   Found ${sanityCategories.length} categories\n`);

    const pgCategoriesResult = await client.query(
      'SELECT id, name FROM categories'
    );
    for (const sanityCategory of sanityCategories) {
      const pgCategory = pgCategoriesResult.rows.find(
        (c: { name: string }) => c.name === sanityCategory.name
      );
      if (pgCategory) {
        mapping.categories[sanityCategory._id] = pgCategory.id;
        console.log(`   ✓ Mapped category "${sanityCategory.name}"`);
      }
    }

    // Step 2: Fetch scales
    console.log('\n📦 Step 2: Fetching scales...');
    const pgScalesResult = await client.query('SELECT id, name FROM scales');
    console.log(
      `   Found ${pgScalesResult.rows.length} scales in PostgreSQL\n`
    );

    // Step 3: Fetch surveys with sections and questions
    console.log('📦 Step 3: Fetching surveys from Sanity...');
    const sanitySurveys = await sanityClient.fetch<SanitySurvey[]>(`
      *[_type == "survey"] | order(surveyNumber asc) {
        _id,
        title,
        description,
        surveyNumber,
        surveyType,
        sections[]-> {
          _id,
          title,
          description,
          questions[]-> {
            _id,
            questionNumber,
            number,
            questionText,
            text,
            category-> {
              _id,
              name
            },
            isReversed,
            isRequired,
            anchorText
          }
        },
        scale-> {
          _id,
          name,
          scaleType
        }
      }
    `);

    console.log(`   Found ${sanitySurveys.length} surveys\n`);

    // Step 4: Migrate each survey
    console.log('🔄 Step 4: Migrating surveys to PostgreSQL...\n');

    for (const sanitySurvey of sanitySurveys) {
      console.log(`   Migrating: ${sanitySurvey.title}`);

      // Find matching scale
      let scaleId: string | null = null;
      if (sanitySurvey.scale) {
        const matchingScale = pgScalesResult.rows.find((s: { name: string }) =>
          s.name.toLowerCase().includes(sanitySurvey.scale!.scaleType)
        );
        scaleId = matchingScale?.id || null;
      }

      // Determine survey type
      let surveyType = 'likert5';
      if (
        sanitySurvey.surveyType === 'likert3' ||
        sanitySurvey.surveyType === 'managerial' ||
        sanitySurvey.surveyType === 'associate_180'
      ) {
        surveyType = 'likert3';
      }

      // Create survey
      const surveyResult = await client.query(
        `INSERT INTO surveys (id, title, description, "surveyType", "surveyNumber", "surveyjsSchema", status, "scaleId")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'PUBLISHED', $6)
         RETURNING id`,
        [
          sanitySurvey.title,
          sanitySurvey.description || null,
          surveyType,
          sanitySurvey.surveyNumber
            ? `Survey ${sanitySurvey.surveyNumber}`
            : null,
          JSON.stringify({ title: sanitySurvey.title }),
          scaleId,
        ]
      );

      const surveyId = surveyResult.rows[0].id;
      mapping.surveys[sanitySurvey._id] = surveyId;
      console.log(`      ✓ Created survey: ${surveyId}`);

      // Collect all questions from all sections
      const allQuestions: SanityQuestion[] = [];

      // Create sections and collect their questions
      if (sanitySurvey.sections && sanitySurvey.sections.length > 0) {
        for (let i = 0; i < sanitySurvey.sections.length; i++) {
          const section = sanitySurvey.sections[i];
          const sectionResult = await client.query(
            `INSERT INTO sections (id, "surveyId", title, description, "sortOrder")
             VALUES (gen_random_uuid(), $1, $2, $3, $4)
             RETURNING id`,
            [surveyId, section.title, section.description || null, i + 1]
          );
          mapping.sections[section._id] = sectionResult.rows[0].id;
          console.log(`      ✓ Created section: ${section.title}`);

          // Collect questions from this section
          if (section.questions && section.questions.length > 0) {
            allQuestions.push(...section.questions);
          }
        }
      }

      // Create questions
      for (const question of allQuestions) {
        // Use fallback for legacy fields
        const qNum = question.questionNumber ?? question.number;
        const qText = question.questionText ?? question.text;

        if (!qNum || !qText) {
          console.warn(
            `      ⚠️  Skipping question with missing data: ${question._id}`
          );
          continue;
        }

        const categoryId = mapping.categories[question.category._id];
        if (!categoryId) {
          // Skip demographics questions (they don't have category mappings)
          if (question.category.name === 'Demographics') {
            console.log(`      ⚠️  Skipping demographics question ${qNum}`);
            continue;
          }
          console.warn(
            `      ⚠️  Skipping question ${qNum}: No category mapping for ${question.category.name}`
          );
          continue;
        }

        const questionResult = await client.query(
          `INSERT INTO questions (id, "surveyId", "questionNumber", text, "questionType", "surveyjsName", config, "isRequired", "isReversed", "sortOrder")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            surveyId,
            qNum,
            qText,
            surveyType,
            `q${qNum}`,
            question.anchorText
              ? JSON.stringify({ anchorText: question.anchorText })
              : null,
            question.isRequired ?? true, // Default to true if null
            question.isReversed ?? false, // Default to false if null
            qNum,
          ]
        );

        const questionId = questionResult.rows[0].id;
        mapping.questions[question._id] = questionId;

        // Create question-category relationship
        await client.query(
          `INSERT INTO question_categories (id, "questionId", "categoryId")
           VALUES (gen_random_uuid(), $1, $2)`,
          [questionId, categoryId]
        );

        console.log(`      ✓ Question ${qNum}: ${qText.substring(0, 50)}...`);
      }

      console.log(
        `   ✅ Completed "${sanitySurvey.title}" (${allQuestions.length} questions)\n`
      );
    }

    // Step 5: Save mapping
    console.log('💾 Step 5: Saving ID mapping...');
    const mappingPath = path.join(__dirname, '../migration-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`   ✓ Saved to: ${mappingPath}\n`);

    // Step 6: Verification
    console.log('✅ Step 6: Migration Summary\n');
    console.log('━'.repeat(50));
    console.log(`   Surveys migrated: ${Object.keys(mapping.surveys).length}`);
    console.log(
      `   Questions migrated: ${Object.keys(mapping.questions).length}`
    );
    console.log(
      `   Categories mapped: ${Object.keys(mapping.categories).length}`
    );
    console.log(`   Sections created: ${Object.keys(mapping.sections).length}`);
    console.log('━'.repeat(50));

    const finalSurveys = await client.query(`
      SELECT s.id, s.title, s."surveyType", s.status,
             (SELECT COUNT(*) FROM questions WHERE "surveyId" = s.id) as question_count,
             (SELECT COUNT(*) FROM sections WHERE "surveyId" = s.id) as section_count
      FROM surveys s
      ORDER BY s."createdAt" DESC
    `);

    console.log('\n📊 PostgreSQL Survey Inventory:\n');
    for (const survey of finalSurveys.rows) {
      console.log(`   • ${survey.title}`);
      console.log(`     - Type: ${survey.surveytype}`);
      console.log(`     - Questions: ${survey.question_count}`);
      console.log(`     - Sections: ${survey.section_count}`);
      console.log(`     - Status: ${survey.status}`);
      console.log();
    }

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Review surveys in /admin/surveys');
    console.log('  2. Update survey campaigns to use new survey IDs');
    console.log('  3. Test survey rendering\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateSurveys();
