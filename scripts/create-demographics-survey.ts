/**
 * Demographics Survey Creation Script
 *
 * Creates the Demographics survey with all required fields:
 * - Bank Name
 * - Location (Country, State, Metro, City)
 * - Size of Bank
 * - Device Used
 * - Employment Status
 * - Gender
 * - Time at Bank
 * - Bank Experience
 * - Bank Division
 * - Job Role
 *
 * Usage:
 *   npx tsx scripts/create-demographics-survey.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Demographics questions with their field types
const DEMOGRAPHICS_QUESTIONS = [
  {
    number: 1,
    text: 'Name of Bank',
    fieldType: 'bankName',
  },
  {
    number: 2,
    text: 'Location - Country',
    fieldType: 'country',
  },
  {
    number: 3,
    text: 'Location - State',
    fieldType: 'state',
  },
  {
    number: 4,
    text: 'Location - Metro City Area',
    fieldType: 'metro',
  },
  {
    number: 5,
    text: 'Location - City',
    fieldType: 'city',
  },
  {
    number: 6,
    text: 'Size of Bank',
    fieldType: 'bankSize',
  },
  {
    number: 7,
    text: 'Device Used for Survey',
    fieldType: 'device',
  },
  {
    number: 8,
    text: 'Employment Status',
    fieldType: 'employmentStatus',
  },
  {
    number: 9,
    text: 'Gender',
    fieldType: 'gender',
  },
  {
    number: 10,
    text: 'Time at Bank',
    fieldType: 'timeAtBank',
  },
  {
    number: 11,
    text: 'Bank Experience',
    fieldType: 'bankExperience',
  },
  {
    number: 12,
    text: 'Bank Division',
    fieldType: 'division',
  },
  {
    number: 13,
    text: 'Job Role',
    fieldType: 'jobRole',
  },
];

async function main() {
  console.log('🚀 Starting Demographics survey creation...\n');

  // Validate environment
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    console.error('❌ ERROR: Missing required environment variables');
    console.error('   Required: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN');
    process.exit(1);
  }

  console.log(`📡 Connecting to Sanity project: ${projectId}`);
  console.log(`📦 Dataset: ${dataset}\n`);

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token,
    useCdn: false,
  });

  try {
    // ========================================
    // Step 1: Create a dummy category for demographics
    // ========================================
    console.log('📋 Step 1: Setting up demographics category...');

    let demoCategory = await client.fetch(
      `*[_type == "category" && name == "Demographics"][0]`
    );

    if (!demoCategory) {
      demoCategory = await client.create({
        _type: 'category',
        name: 'Demographics',
        description: 'Demographic information collected once per survey cycle',
        colorCode: '#6B7280', // Gray
        sortOrder: 0,
        weight: 1.0,
      });
      console.log('   ✅ Created Demographics category');
    } else {
      console.log('   ✓ Demographics category already exists');
    }

    // ========================================
    // Step 2: Check/Create Survey
    // ========================================
    console.log('\n📝 Step 2: Setting up survey...');

    let survey = await client.fetch(
      `*[_type == "survey" && slug.current == "demographics"][0]`
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        title: 'Employee Demographics',
        slug: { _type: 'slug', current: 'demographics' },
        surveyNumber: 1,
        surveyType: 'demographics',
        welcomeMessage:
          'Welcome! Please provide some basic information about yourself and your organization. This information helps us better understand our survey participants.',
        completionMessage:
          'Thank you for providing your demographic information. This data is collected once per survey cycle.',
        estimatedMinutes: 5,
        isActive: true,
      });
      console.log('   ✅ Created Demographics survey');
    } else {
      console.log('   ✓ Demographics survey already exists');
    }

    // ========================================
    // Step 3: Check/Create Section
    // ========================================
    console.log('\n📑 Step 3: Setting up section...');

    let section = await client.fetch(
      `*[_type == "section" && survey._ref == $surveyId][0]`,
      { surveyId: survey._id }
    );

    if (!section) {
      section = await client.create({
        _type: 'section',
        title: 'Demographic Information',
        sortOrder: 1,
        survey: { _type: 'reference', _ref: survey._id },
        directions: [
          {
            _type: 'block',
            _key: 'dir1',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'span1',
                text: 'Please answer all questions to help us understand your background and organization.',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      });
      console.log('   ✅ Created section');
    } else {
      console.log('   ✓ Section already exists');
    }

    // ========================================
    // Step 4: Create all demographics questions
    // ========================================
    console.log('\n❓ Step 4: Creating questions...\n');

    const existingQuestions = await client.fetch<{ number: number }[]>(
      `*[_type == "question" && section._ref == $sectionId] { number }`,
      { sectionId: section._id }
    );

    const existingNumbers = new Set(existingQuestions.map((q) => q.number));
    let createdCount = 0;
    let skippedCount = 0;
    const questionRefs: any[] = [];

    for (const questionData of DEMOGRAPHICS_QUESTIONS) {
      if (existingNumbers.has(questionData.number)) {
        console.log(
          `   ⏭️  Question ${questionData.number.toString().padStart(2, '0')} | ${questionData.text} | Already exists`
        );
        skippedCount++;

        // Fetch existing question ref
        const existing = await client.fetch(
          `*[_type == "question" && number == $num && section._ref == $sectionId][0]._id`,
          { num: questionData.number, sectionId: section._id }
        );
        questionRefs.push({
          _type: 'reference',
          _ref: existing,
          _key: `q${questionData.number}`,
        });
        continue;
      }

      const question = await client.create({
        _type: 'question',
        number: questionData.number,
        text: questionData.text,
        category: { _type: 'reference', _ref: demoCategory._id },
        section: { _type: 'reference', _ref: section._id },
        isReversed: false,
        fieldType: questionData.fieldType,
      });

      questionRefs.push({
        _type: 'reference',
        _ref: question._id,
        _key: `q${questionData.number}`,
      });
      console.log(
        `   ✅ Question ${questionData.number.toString().padStart(2, '0')} | ${questionData.text} | ${questionData.fieldType}`
      );
      createdCount++;
    }

    // ========================================
    // Step 5: Update section with question references
    // ========================================
    console.log('\n🔗 Step 5: Linking questions to section...');

    await client.patch(section._id).set({ questions: questionRefs }).commit();
    console.log('   ✅ Questions linked to section');

    // ========================================
    // Step 6: Update survey with section reference
    // ========================================
    console.log('\n🔗 Step 6: Linking section to survey...');

    await client
      .patch(survey._id)
      .set({ sections: [{ _type: 'reference', _ref: section._id, _key: 's1' }] })
      .commit();
    console.log('   ✅ Section linked to survey');

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 CREATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Survey: Employee Demographics (Survey 1)`);
    console.log(`✅ Survey Type: demographics`);
    console.log(`✅ Sections: 1`);
    console.log(`✅ Questions created: ${createdCount}`);
    console.log(`⏭️  Questions skipped: ${skippedCount}`);
    console.log(`📦 Total questions: ${createdCount + skippedCount}`);
    console.log('═'.repeat(70));

    console.log('\n📝 Field Types Configured:');
    console.log('─'.repeat(70));
    DEMOGRAPHICS_QUESTIONS.forEach((q) => {
      console.log(`   ${q.number.toString().padStart(2, '0')}. ${q.text} (${q.fieldType})`);
    });
    console.log('─'.repeat(70));

    console.log('\n✨ Demographics survey created successfully!');
    console.log('🔗 Sanity Studio: http://localhost:3333 (run: npm run sanity:dev)\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
