import { PrismaClient } from '@prisma/client';
import { sanityClient } from '@/lib/sanity/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface SanityQuestion {
  _id: string;
  questionNumber: number;
  questionText: string;
  category: {
    _id: string;
    name: string;
  };
  isReversed: boolean;
  isRequired: boolean;
  anchorText?: string;
}

interface SanitySection {
  _id: string;
  title: string;
  description?: string;
  questions: string[]; // Array of question IDs
}

interface SanitySurvey {
  _id: string;
  title: string;
  description?: string;
  surveyNumber?: number;
  surveyType: string;
  instructions?: string;
  sections?: Array<{
    _id: string;
    title: string;
    description?: string;
  }>;
  scale?: {
    _id: string;
    name: string;
    scaleType: string;
  };
}

interface MigrationMapping {
  surveys: Record<string, string>; // Sanity ID -> PostgreSQL ID
  questions: Record<string, string>; // Sanity ID -> PostgreSQL ID
  categories: Record<string, string>; // Sanity ID -> PostgreSQL ID
  sections: Record<string, string>; // Sanity ID -> PostgreSQL ID
}

async function migrateSurveys() {
  const mapping: MigrationMapping = {
    surveys: {},
    questions: {},
    categories: {},
    sections: {},
  };

  try {
    console.log('🚀 Starting Sanity to PostgreSQL migration...\n');

    // Step 1: Fetch all categories from Sanity
    console.log('📦 Step 1: Fetching categories from Sanity...');
    const sanityCategories = await sanityClient.fetch<
      Array<{ _id: string; name: string; description?: string }>
    >(`*[_type == "category"] {
      _id,
      name,
      description
    }`);

    console.log(`   Found ${sanityCategories.length} categories\n`);

    // Map Sanity categories to PostgreSQL categories
    const pgCategories = await prisma.category.findMany();
    for (const sanityCategory of sanityCategories) {
      const pgCategory = pgCategories.find(
        (c) => c.name === sanityCategory.name
      );
      if (pgCategory) {
        mapping.categories[sanityCategory._id] = pgCategory.id;
        console.log(
          `   ✓ Mapped category "${sanityCategory.name}": ${sanityCategory._id} → ${pgCategory.id}`
        );
      } else {
        console.warn(
          `   ⚠️  No matching category found for "${sanityCategory.name}"`
        );
      }
    }

    // Step 2: Fetch all scales
    console.log('\n📦 Step 2: Fetching scales from Sanity...');
    const pgScales = await prisma.scale.findMany();
    console.log(`   Found ${pgScales.length} scales in PostgreSQL\n`);

    // Step 3: Fetch all surveys with nested data including questions
    console.log('📦 Step 3: Fetching surveys from Sanity...');
    const sanitySurveys = await sanityClient.fetch<
      Array<
        SanitySurvey & {
          questions: SanityQuestion[];
        }
      >
    >(`
      *[_type == "survey"] {
        _id,
        title,
        description,
        surveyNumber,
        surveyType,
        instructions,
        sections[]-> {
          _id,
          title,
          description
        },
        scale-> {
          _id,
          name,
          scaleType
        },
        "questions": *[_type == "question" && references(^._id)] | order(questionNumber asc) {
          _id,
          questionNumber,
          questionText,
          category-> {
            _id,
            name
          },
          isReversed,
          isRequired,
          anchorText
        }
      }
    `);

    console.log(`   Found ${sanitySurveys.length} surveys\n`);

    // Step 4: Migrate each survey
    console.log('🔄 Step 4: Migrating surveys to PostgreSQL...\n');

    for (const sanitySurvey of sanitySurveys) {
      console.log(`   Migrating: ${sanitySurvey.title}`);

      // Find matching scale
      let scaleId: string | undefined;
      if (sanitySurvey.scale) {
        const matchingScale = pgScales.find((s) =>
          s.name.toLowerCase().includes(sanitySurvey.scale!.scaleType)
        );
        scaleId = matchingScale?.id;
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

      // Create SurveyJS schema
      const surveyjsSchema = {
        title: sanitySurvey.title,
        description: sanitySurvey.description || '',
        showProgressBar: 'top',
        showQuestionNumbers: 'on',
        pages: [
          {
            name: 'page1',
            elements: [], // Will be populated with questions
          },
        ],
      };

      // Create the survey
      const pgSurvey = await prisma.survey.create({
        data: {
          title: sanitySurvey.title,
          description: sanitySurvey.description,
          surveyType,
          surveyNumber: sanitySurvey.surveyNumber
            ? `Survey ${sanitySurvey.surveyNumber}`
            : undefined,
          surveyjsSchema: surveyjsSchema as object,
          status: 'PUBLISHED',
          scaleId,
        },
      });

      mapping.surveys[sanitySurvey._id] = pgSurvey.id;
      console.log(`      ✓ Created survey: ${pgSurvey.id}`);

      // Create sections if they exist
      if (sanitySurvey.sections && sanitySurvey.sections.length > 0) {
        for (let i = 0; i < sanitySurvey.sections.length; i++) {
          const sanitySection = sanitySurvey.sections[i];
          const pgSection = await prisma.section.create({
            data: {
              surveyId: pgSurvey.id,
              title: sanitySection.title,
              description: sanitySection.description,
              sortOrder: i + 1,
            },
          });
          mapping.sections[sanitySection._id] = pgSection.id;
          console.log(`      ✓ Created section: ${sanitySection.title}`);
        }
      }

      // Use questions from the survey (already fetched via references)
      const surveyQuestions = sanitySurvey.questions || [];

      // Create questions
      for (let i = 0; i < surveyQuestions.length; i++) {
        const sanityQuestion = surveyQuestions[i];
        const categoryId = mapping.categories[sanityQuestion.category._id];
        if (!categoryId) {
          console.warn(
            `      ⚠️  Skipping question ${sanityQuestion.questionNumber}: No category mapping for ${sanityQuestion.category.name}`
          );
          continue;
        }

        const pgQuestion = await prisma.question.create({
          data: {
            surveyId: pgSurvey.id,
            questionNumber: sanityQuestion.questionNumber,
            text: sanityQuestion.questionText,
            questionType: surveyType,
            surveyjsName: `q${sanityQuestion.questionNumber}`,
            config: sanityQuestion.anchorText
              ? { anchorText: sanityQuestion.anchorText }
              : undefined,
            isRequired: sanityQuestion.isRequired,
            isReversed: sanityQuestion.isReversed,
            sortOrder: sanityQuestion.questionNumber,
          },
        });

        mapping.questions[sanityQuestion._id] = pgQuestion.id;

        // Create question-category relationship
        await prisma.questionCategory.create({
          data: {
            questionId: pgQuestion.id,
            categoryId,
          },
        });

        console.log(
          `      ✓ Created question ${sanityQuestion.questionNumber}: ${sanityQuestion.questionText.substring(0, 50)}...`
        );
      }

      console.log(
        `   ✅ Completed migration of "${sanitySurvey.title}" (${surveyQuestions.length} questions)\n`
      );
    }

    // Step 5: Save mapping to file
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

    const finalSurveys = await prisma.survey.findMany({
      include: {
        _count: {
          select: {
            questions: true,
            sections: true,
          },
        },
      },
    });

    console.log('\n📊 PostgreSQL Survey Inventory:\n');
    for (const survey of finalSurveys) {
      console.log(`   • ${survey.title}`);
      console.log(`     - Type: ${survey.surveyType}`);
      console.log(`     - Questions: ${survey._count.questions}`);
      console.log(`     - Sections: ${survey._count.sections}`);
      console.log(`     - Status: ${survey.status}`);
      console.log();
    }

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Review the migration-mapping.json file');
    console.log('  2. Test the surveys in the admin panel');
    console.log('  3. Update survey campaigns to use new survey IDs');
    console.log('  4. Update response handling to use new question IDs\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSurveys();
