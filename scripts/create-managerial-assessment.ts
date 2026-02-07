/**
 * Managerial Assessment Survey Creation Script
 *
 * Creates the complete Managerial Assessment (Survey 6) with:
 * - 3-point Likert scale
 * - Survey document
 * - Section(s)
 * - All 35 questions with correct category mappings
 *
 * Usage:
 *   npx tsx scripts/create-managerial-assessment.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Question-to-category mappings from scoring matrix
const QUESTION_CATEGORIES = {
  1: 'Leadership',
  2: 'Accountability',
  3: 'Execution',
  4: 'Associate',
  5: 'Team Dynamics',
  6: 'Communication',
  7: 'Leadership',
  8: 'Culture',
  9: 'Accountability',
  10: 'Execution',
  11: 'Associate',
  12: 'Team Dynamics',
  13: 'Communication',
  14: 'Leadership',
  15: 'Culture',
  16: 'Accountability',
  17: 'Execution',
  18: 'Associate',
  19: 'Team Dynamics',
  20: 'Communication',
  21: 'Leadership',
  22: 'Accountability',
  23: 'Execution',
  24: 'Associate',
  25: 'Team Dynamics',
  26: 'Communication',
  27: 'Leadership',
  28: 'Culture',
  29: 'Accountability',
  30: 'Execution',
  31: 'Associate',
  32: 'Team Dynamics',
  33: 'Leadership',
  34: 'Accountability',
  35: 'Leadership',
} as const;

interface SanityCategory {
  _id: string;
  name: string;
}

async function main() {
  console.log('🚀 Starting Managerial Assessment survey creation...\n');

  // Validate environment
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    console.error('❌ ERROR: Missing required environment variables');
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
    // Step 1: Check/Create 3-Point Likert Scale
    // ========================================
    console.log('📊 Step 1: Setting up 3-point Likert scale...');

    let scale = await client.fetch(
      `*[_type == "scale" && scaleType == "likert3"][0]`
    );

    if (!scale) {
      scale = await client.create({
        _type: 'scale',
        name: '3-Point Frequency Scale',
        scaleType: 'likert3',
        min: 1,
        max: 3,
        labels: [
          { value: 1, label: 'Rarely' },
          { value: 2, label: 'Sometimes' },
          { value: 3, label: 'Frequently' },
        ],
      });
      console.log('   ✅ Created 3-point Likert scale');
    } else {
      console.log('   ✓ 3-point Likert scale already exists');
    }

    // ========================================
    // Step 2: Fetch all categories
    // ========================================
    console.log('\n📋 Step 2: Fetching categories...');

    const categories = await client.fetch<SanityCategory[]>(
      `*[_type == "category"] { _id, name }`
    );

    if (categories.length !== 7) {
      console.error(`   ❌ Expected 7 categories, found ${categories.length}`);
      process.exit(1);
    }

    const categoryMap = new Map(categories.map((c) => [c.name, c._id]));
    console.log(`   ✅ Found all 7 categories`);

    // ========================================
    // Step 3: Check/Create Survey
    // ========================================
    console.log('\n📝 Step 3: Setting up survey...');

    let survey = await client.fetch(
      `*[_type == "survey" && slug.current == "managerial-assessment"][0]`
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        title: 'Managerial Assessment',
        slug: { _type: 'slug', current: 'managerial-assessment' },
        surveyNumber: 6,
        surveyType: 'likert3',
        scale: { _type: 'reference', _ref: scale._id },
        respondentNameField: 'Executive or Manager Name',
        welcomeMessage:
          'Please rate the following statements about managerial effectiveness.',
        completionMessage:
          'Thank you for completing the Managerial Assessment.',
        estimatedMinutes: 10,
        isActive: true,
      });
      console.log('   ✅ Created Managerial Assessment survey');
    } else {
      console.log('   ✓ Managerial Assessment survey already exists');
    }

    // ========================================
    // Step 4: Check/Create Section
    // ========================================
    console.log('\n📑 Step 4: Setting up section...');

    let section = await client.fetch(
      `*[_type == "section" && survey._ref == $surveyId][0]`,
      { surveyId: survey._id }
    );

    if (!section) {
      section = await client.create({
        _type: 'section',
        title: 'Managerial Effectiveness',
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
                text: 'Please rate how frequently each statement applies to the manager being assessed.',
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
    // Step 5: Create all 35 questions
    // ========================================
    console.log('\n❓ Step 5: Creating questions (this may take a minute)...\n');

    const existingQuestions = await client.fetch<{ number: number }[]>(
      `*[_type == "question" && section._ref == $sectionId] { number }`,
      { sectionId: section._id }
    );

    const existingNumbers = new Set(existingQuestions.map((q) => q.number));
    let createdCount = 0;
    let skippedCount = 0;
    const questionRefs: any[] = [];

    for (let i = 1; i <= 35; i++) {
      if (existingNumbers.has(i)) {
        console.log(`   ⏭️  Question ${i.toString().padStart(2, '0')} | Already exists`);
        skippedCount++;

        // Fetch existing question ref
        const existing = await client.fetch(
          `*[_type == "question" && number == $num && section._ref == $sectionId][0]._id`,
          { num: i, sectionId: section._id }
        );
        questionRefs.push({ _type: 'reference', _ref: existing, _key: `q${i}` });
        continue;
      }

      const categoryName = QUESTION_CATEGORIES[i as keyof typeof QUESTION_CATEGORIES];
      const categoryId = categoryMap.get(categoryName);

      if (!categoryId) {
        console.error(`   ❌ Category not found for question ${i}: ${categoryName}`);
        continue;
      }

      const question = await client.create({
        _type: 'question',
        number: i,
        text: `[Q${i}] Managerial assessment statement ${i} - Replace with actual question text`,
        category: { _type: 'reference', _ref: categoryId },
        section: { _type: 'reference', _ref: section._id },
        isReversed: false, // TODO: Update specific questions that are reverse-scored
      });

      questionRefs.push({ _type: 'reference', _ref: question._id, _key: `q${i}` });
      console.log(`   ✅ Question ${i.toString().padStart(2, '0')} | ${categoryName}`);
      createdCount++;
    }

    // ========================================
    // Step 6: Update section with question references
    // ========================================
    console.log('\n🔗 Step 6: Linking questions to section...');

    await client
      .patch(section._id)
      .set({ questions: questionRefs })
      .commit();
    console.log('   ✅ Questions linked to section');

    // ========================================
    // Step 7: Update survey with section reference
    // ========================================
    console.log('\n🔗 Step 7: Linking section to survey...');

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
    console.log(`✅ Survey: Managerial Assessment (Survey 6)`);
    console.log(`✅ Scale: 3-point Likert (Rarely/Sometimes/Frequently)`);
    console.log(`✅ Sections: 1`);
    console.log(`✅ Questions created: ${createdCount}`);
    console.log(`⏭️  Questions skipped: ${skippedCount}`);
    console.log(`📦 Total questions: ${createdCount + skippedCount}`);
    console.log('═'.repeat(70));

    console.log('\n⚠️  IMPORTANT: Next Steps Required');
    console.log('─'.repeat(70));
    console.log('1. Update question text in Sanity Studio');
    console.log('   - Replace placeholder text with actual survey questions');
    console.log('');
    console.log('2. Mark reverse-scored questions');
    console.log('   - Set isReversed: true for applicable questions');
    console.log('   - Refer to client paper survey for which questions are reversed');
    console.log('');
    console.log('3. Run verification script');
    console.log('   - Command: npm run sanity:verify-mappings');
    console.log('   - Confirms all category mappings are correct');
    console.log('─'.repeat(70));

    console.log('\n✨ Survey structure created successfully!');
    console.log('🔗 Sanity Studio: http://localhost:3333 (run: npm run sanity:dev)\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
main();
