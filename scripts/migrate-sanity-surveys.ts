/**
 * Migration Script: Sanity Surveys → PostgreSQL
 *
 * This script migrates all surveys, questions, and category mappings
 * from Sanity CMS to the PostgreSQL database.
 *
 * Usage:
 *   npm run db:migrate-sanity
 */

import { createClient } from '@sanity/client';
import { prisma } from '../src/lib/prisma';

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface SanityCategory {
  _id: string;
  name: string;
  description?: string;
  weight?: number;
  colorCode?: string;
  sortOrder?: number;
}

interface SanityQuestion {
  _id: string;
  questionNumber: number;
  text: string;
  questionType: string;
  isRequired: boolean;
  isReversed: boolean;
  categories?: Array<{ _ref: string }>;
  sortOrder?: number;
}

interface SanitySection {
  _id: string;
  title: string;
  description?: string;
  sortOrder: number;
  questions?: SanityQuestion[];
}

interface SanitySurvey {
  _id: string;
  title: string;
  description?: string;
  surveyType: string;
  surveyNumber?: string;
  status: string;
  scale?: { _ref: string };
  sections?: SanitySection[];
  questions?: SanityQuestion[];
}

async function migrateSurveys() {
  console.log('🔄 Starting Sanity → PostgreSQL migration...\n');

  try {
    // Step 1: Fetch all categories from Sanity
    console.log('📦 Fetching categories from Sanity...');
    const sanityCategories = await sanityClient.fetch<SanityCategory[]>(`
      *[_type == "category"] | order(sortOrder asc) {
        _id,
        name,
        description,
        weight,
        colorCode,
        sortOrder
      }
    `);
    console.log(`   Found ${sanityCategories.length} categories\n`);

    // Step 2: Migrate categories (if not already in DB)
    console.log('💾 Migrating categories to PostgreSQL...');
    const categoryMap = new Map<string, string>(); // Sanity ID → Prisma ID

    for (const sanityCategory of sanityCategories) {
      // Skip categories with missing required fields
      if (!sanityCategory.name) {
        console.log(`   ⚠️  Skipping invalid category (missing name): ${sanityCategory._id}`);
        continue;
      }

      // Check if category already exists by name
      let dbCategory = await prisma.category.findFirst({
        where: { name: sanityCategory.name },
      });

      if (!dbCategory) {
        dbCategory = await prisma.category.create({
          data: {
            name: sanityCategory.name,
            description: sanityCategory.description || null,
            weight: sanityCategory.weight || 1.0,
            colorCode: sanityCategory.colorCode || null,
            sortOrder: sanityCategory.sortOrder || 0,
          },
        });
        console.log(`   ✓ Created category: ${sanityCategory.name}`);
      } else {
        console.log(`   ○ Category already exists: ${sanityCategory.name}`);
      }

      categoryMap.set(sanityCategory._id, dbCategory.id);
    }
    console.log('');

    // Step 3: Fetch all scales from Sanity
    console.log('📦 Fetching scales from Sanity...');
    const sanityScales = await sanityClient.fetch<any[]>(`
      *[_type == "scale"] {
        _id,
        name,
        scaleType,
        min,
        max,
        labels
      }
    `);
    console.log(`   Found ${sanityScales.length} scales\n`);

    // Step 4: Migrate scales
    console.log('💾 Migrating scales to PostgreSQL...');
    const scaleMap = new Map<string, string>(); // Sanity ID → Prisma ID

    for (const sanityScale of sanityScales) {
      // Skip scales with missing required fields
      if (!sanityScale.name || !sanityScale.scaleType) {
        console.log(`   ⚠️  Skipping invalid scale (missing name or type): ${sanityScale._id}`);
        continue;
      }

      let dbScale = await prisma.scale.findFirst({
        where: { name: sanityScale.name },
      });

      if (!dbScale) {
        dbScale = await prisma.scale.create({
          data: {
            name: sanityScale.name,
            scaleType: sanityScale.scaleType,
            min: sanityScale.min ?? 1,
            max: sanityScale.max ?? 5,
            labels: sanityScale.labels || {},
          },
        });
        console.log(`   ✓ Created scale: ${sanityScale.name}`);
      } else {
        console.log(`   ○ Scale already exists: ${sanityScale.name}`);
      }

      scaleMap.set(sanityScale._id, dbScale.id);
    }
    console.log('');

    // Step 5: Fetch all surveys from Sanity
    console.log('📦 Fetching surveys from Sanity...');
    const sanitySurveys = await sanityClient.fetch<SanitySurvey[]>(`
      *[_type == "survey"] | order(_createdAt asc) {
        _id,
        title,
        description,
        surveyType,
        surveyNumber,
        status,
        scale,
        sections[] {
          _key,
          title,
          description,
          sortOrder,
          questions[] {
            _key,
            questionNumber,
            text,
            questionType,
            isRequired,
            isReversed,
            categories[]->{ _id },
            sortOrder
          }
        },
        questions[] {
          _key,
          questionNumber,
          text,
          questionType,
          isRequired,
          isReversed,
          categories[]->{ _id },
          sortOrder
        }
      }
    `);
    console.log(`   Found ${sanitySurveys.length} surveys\n`);

    // Step 6: Migrate surveys
    console.log('💾 Migrating surveys to PostgreSQL...\n');
    let surveyCount = 0;
    let questionCount = 0;

    for (const sanitySurvey of sanitySurveys) {
      // Skip surveys with missing required fields
      if (!sanitySurvey.title) {
        console.log(`   ⚠️  Skipping invalid survey (missing title): ${sanitySurvey._id}`);
        continue;
      }

      // Check if survey already exists by title
      const existingSurvey = await prisma.survey.findFirst({
        where: { title: sanitySurvey.title },
      });

      if (existingSurvey) {
        console.log(`   ⚠️  Survey already exists: "${sanitySurvey.title}" - Skipping`);
        continue;
      }

      console.log(`   📝 Migrating: "${sanitySurvey.title}"`);

      // Get scale ID
      const scaleId = sanitySurvey.scale?._ref
        ? scaleMap.get(sanitySurvey.scale._ref)
        : null;

      // Create survey
      const dbSurvey = await prisma.survey.create({
        data: {
          title: sanitySurvey.title,
          description: sanitySurvey.description || null,
          surveyType: sanitySurvey.surveyType || 'likert5',
          surveyNumber: sanitySurvey.surveyNumber
            ? String(sanitySurvey.surveyNumber)
            : null,
          status: sanitySurvey.status || 'DRAFT',
          scaleId: scaleId || undefined,
          surveyjsSchema: {},
        },
      });

      surveyCount++;

      // Collect all questions (from sections AND root level)
      const allQuestions: SanityQuestion[] = [];

      // Questions from sections
      if (sanitySurvey.sections) {
        for (const section of sanitySurvey.sections) {
          if (section.questions) {
            allQuestions.push(...section.questions);
          }
        }
      }

      // Questions from root level
      if (sanitySurvey.questions) {
        allQuestions.push(...sanitySurvey.questions);
      }

      // Sort questions by questionNumber
      allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

      // Migrate questions
      for (const sanityQuestion of allQuestions) {
        const dbQuestion = await prisma.question.create({
          data: {
            surveyId: dbSurvey.id,
            questionNumber: sanityQuestion.questionNumber,
            text: sanityQuestion.text,
            questionType: sanityQuestion.questionType || 'text',
            surveyjsName: `q${sanityQuestion.questionNumber}`,
            isRequired: sanityQuestion.isRequired ?? true,
            isReversed: sanityQuestion.isReversed ?? false,
            sortOrder: sanityQuestion.sortOrder ?? sanityQuestion.questionNumber,
          },
        });

        // Create category associations
        if (sanityQuestion.categories && sanityQuestion.categories.length > 0) {
          for (const categoryRef of sanityQuestion.categories) {
            const categoryId = categoryMap.get(categoryRef._ref);
            if (categoryId) {
              await prisma.questionCategory.create({
                data: {
                  questionId: dbQuestion.id,
                  categoryId: categoryId,
                },
              });
            }
          }
        }

        questionCount++;
      }

      console.log(`      ✓ Migrated ${allQuestions.length} questions`);
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Categories: ${sanityCategories.length}`);
    console.log(`   - Scales: ${sanityScales.length}`);
    console.log(`   - Surveys: ${surveyCount}`);
    console.log(`   - Questions: ${questionCount}`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSurveys()
  .then(() => {
    console.log('🎉 All done! Your Sanity surveys are now in PostgreSQL.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
