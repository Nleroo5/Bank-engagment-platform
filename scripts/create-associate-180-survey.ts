/**
 * Associate 180° Assessment Survey Creation Script
 *
 * Creates Survey 7: Associate 180° Assessment with:
 * - 3-point Likert scale (Rarely, Sometimes, Frequently)
 * - 35 questions with category mappings
 * - Reverse-scored items
 * - Strict anonymity enforcement (minimum 5 respondents)
 *
 * Usage:
 *   npx tsx scripts/create-associate-180-survey.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

/**
 * Creates Associate 180° Assessment (Survey 7) in Sanity
 *
 * Survey Details:
 * - 35 questions total
 * - 3-point Likert scale (Rarely, Sometimes, Frequently)
 * - HAS REVERSE-SCORED ITEMS
 * - Categories: Communication, Leadership, Culture, Accountability, Execution, Associate, Team Dynamics
 * - CRITICAL: Anonymity enforced - minimum 5 respondents for reports
 */

interface Question {
  number: number;
  text: string;
  categoryName: string;
  isReversed: boolean;
}

// Survey 7 questions mapped to categories (based on paper form)
const QUESTIONS: Question[] = [
  // Communication (1, 8, 15, 22, 29) - Category weight: 1.75
  { number: 1, text: 'My manager engages in open and honest communication with the team', categoryName: 'Communication', isReversed: false },
  { number: 8, text: 'My manager provides clear and timely feedback on my performance', categoryName: 'Communication', isReversed: false },
  { number: 15, text: 'My manager listens to and values my input and ideas', categoryName: 'Communication', isReversed: false },
  { number: 22, text: 'My manager avoids communicating important information in a timely manner', categoryName: 'Communication', isReversed: true },
  { number: 29, text: 'My manager encourages open dialogue and constructive feedback', categoryName: 'Communication', isReversed: false },

  // Leadership (2, 9, 16, 23, 30, 34) - Category weight: 1.0
  { number: 2, text: 'My manager demonstrates strong leadership skills and leads by example', categoryName: 'Leadership', isReversed: false },
  { number: 9, text: 'My manager provides a clear vision and direction for the team', categoryName: 'Leadership', isReversed: false },
  { number: 16, text: 'My manager fails to make decisions when needed', categoryName: 'Leadership', isReversed: true },
  { number: 23, text: 'My manager inspires and motivates the team to achieve goals', categoryName: 'Leadership', isReversed: false },
  { number: 30, text: 'My manager demonstrates confidence in their leadership abilities', categoryName: 'Leadership', isReversed: false },
  { number: 34, text: 'My manager effectively delegates tasks and responsibilities', categoryName: 'Leadership', isReversed: false },

  // Culture (3, 10, 17, 24, 30) - Category weight: 2.3
  { number: 3, text: 'My manager fosters a positive and inclusive work environment', categoryName: 'Culture', isReversed: false },
  { number: 10, text: 'My manager promotes a culture of collaboration and teamwork', categoryName: 'Culture', isReversed: false },
  { number: 17, text: 'My manager recognizes and celebrates team achievements', categoryName: 'Culture', isReversed: false },
  { number: 24, text: 'My manager creates an environment where people feel valued', categoryName: 'Culture', isReversed: false },

  // Accountability (4, 11, 18, 25, 31) - Category weight: 1.7
  { number: 4, text: 'My manager holds team members accountable for their responsibilities', categoryName: 'Accountability', isReversed: false },
  { number: 11, text: 'My manager follows through on commitments and promises', categoryName: 'Accountability', isReversed: false },
  { number: 18, text: 'My manager addresses performance issues promptly and fairly', categoryName: 'Accountability', isReversed: false },
  { number: 25, text: 'My manager avoids difficult conversations about performance', categoryName: 'Accountability', isReversed: true },
  { number: 31, text: 'My manager sets clear expectations for quality and results', categoryName: 'Accountability', isReversed: false },

  // Execution (5, 12, 19, 26, 32) - Category weight: 1.4
  { number: 5, text: 'My manager ensures projects are completed on time and within scope', categoryName: 'Execution', isReversed: false },
  { number: 12, text: 'My manager effectively prioritizes tasks and manages resources', categoryName: 'Execution', isReversed: false },
  { number: 19, text: 'My manager removes obstacles that prevent the team from succeeding', categoryName: 'Execution', isReversed: false },
  { number: 26, text: 'My manager fails to follow through on action items', categoryName: 'Execution', isReversed: true },
  { number: 32, text: 'My manager monitors progress and adjusts plans as needed', categoryName: 'Execution', isReversed: false },

  // Associate (6, 13, 20, 27, 33) - Category weight: 1.4
  { number: 6, text: 'My manager supports my professional development and growth', categoryName: 'Associate', isReversed: false },
  { number: 13, text: 'My manager provides opportunities for learning and skill development', categoryName: 'Associate', isReversed: false },
  { number: 20, text: 'My manager shows genuine interest in my career goals', categoryName: 'Associate', isReversed: false },
  { number: 27, text: 'My manager invests time in coaching and mentoring team members', categoryName: 'Associate', isReversed: false },
  { number: 33, text: 'My manager encourages work-life balance and well-being', categoryName: 'Associate', isReversed: false },

  // Team Dynamics (7, 14, 21, 28, 35) - Category weight: 1.4
  { number: 7, text: 'My manager effectively resolves conflicts within the team', categoryName: 'Team Dynamics', isReversed: false },
  { number: 14, text: 'My manager builds trust and strong relationships with team members', categoryName: 'Team Dynamics', isReversed: false },
  { number: 21, text: 'My manager promotes collaboration across different teams', categoryName: 'Team Dynamics', isReversed: false },
  { number: 28, text: 'My manager creates unnecessary tension or conflict in the team', categoryName: 'Team Dynamics', isReversed: true },
  { number: 35, text: 'My manager facilitates effective team meetings and discussions', categoryName: 'Team Dynamics', isReversed: false },
];

async function createAssociate180Survey() {
  console.log('🚀 Starting Associate 180° Assessment survey creation...\n');

  console.log('📡 Connecting to Sanity project:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
  console.log('📦 Dataset:', process.env.NEXT_PUBLIC_SANITY_DATASET || 'production');
  console.log('');

  try {
    // Step 1: Set up 3-point Likert scale
    console.log('📊 Step 1: Setting up 3-point Likert scale...');
    const scaleId = 'likert-3-point';

    let scale = await client.fetch(
      `*[_type == "scale" && _id == $scaleId][0]`,
      { scaleId }
    );

    if (!scale) {
      scale = await client.create({
        _type: 'scale',
        _id: scaleId,
        title: '3-Point Likert (Rarely to Frequently)',
        scaleType: 'likert3',
        min: 1,
        max: 3,
        minLabel: 'Rarely',
        maxLabel: 'Frequently',
        midLabel: 'Sometimes',
      });
      console.log('   ✅ 3-point Likert scale created');
    } else {
      console.log('   ✓ 3-point Likert scale already exists');
    }

    // Step 2: Fetch categories
    console.log('\n📋 Step 2: Fetching categories...');
    const categories = await client.fetch(
      `*[_type == "category" && name != "Demographics"] {
        _id,
        name,
        weight
      }`
    );

    if (categories.length < 7) {
      console.error('   ❌ Error: Not all 7 categories found in Sanity!');
      console.log('   Expected: Communication, Leadership, Culture, Accountability, Execution, Associate, Team Dynamics');
      console.log('   Found:', categories.map((c: any) => c.name).join(', '));
      return;
    }

    console.log('   ✅ Found all 7 categories');

    // Create category map for quick lookup
    const categoryMap = new Map(categories.map((c: any) => [c.name, c._id]));

    // Step 3: Set up survey
    console.log('\n📝 Step 3: Setting up survey...');
    const surveyId = 'associate-180-assessment';

    let survey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0]`,
      { surveyId }
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        _id: surveyId,
        title: 'Associate 180° Assessment',
        surveyType: 'associate_180',
        surveyNumber: 7,
        description: 'Confidential 180-degree feedback assessment for evaluating manager effectiveness. Responses are completely anonymous and aggregated to protect individual privacy.',
        estimatedMinutes: 10,
        requiresManagerName: true,
        anonymityRequired: true,
        minimumRespondents: 5,
        instructions: 'Please rate your manager on the following behaviors and activities using the scale provided. Your responses are completely anonymous and will only be shared as aggregated team averages.',
      });
      console.log('   ✅ Associate 180 survey created');
    } else {
      console.log('   ✓ Associate 180 survey already exists');
    }

    // Step 4: Create section
    console.log('\n📑 Step 4: Creating section...');
    const sectionId = `${surveyId}-section-1`;

    let section = await client.fetch(
      `*[_type == "section" && _id == $sectionId][0]`,
      { sectionId }
    );

    if (!section) {
      section = await client.create({
        _type: 'section',
        _id: sectionId,
        title: 'Manager Assessment',
        description: 'Rate your manager on the following aspects of leadership and management.',
        order: 1,
      });
      console.log('   ✅ Section created');
    } else {
      console.log('   ✓ Section already exists');
    }

    // Step 5: Create questions
    console.log('\n❓ Step 5: Creating questions (this may take a minute)...\n');

    const createdQuestions: any[] = [];

    for (const q of QUESTIONS) {
      const questionId = `${surveyId}-q${q.number}`;

      // Check if question exists
      const existing = await client.fetch(
        `*[_type == "question" && _id == $questionId][0]`,
        { questionId }
      );

      if (existing) {
        console.log(`   ⏭️  Question ${q.number.toString().padStart(2, '0')} | Already exists`);
        createdQuestions.push(existing);
        continue;
      }

      // Get category ID from map
      const categoryId = categoryMap.get(q.categoryName);

      if (!categoryId) {
        console.error(`   ❌ Category not found: ${q.categoryName}`);
        continue;
      }

      // Create question
      const question = await client.create({
        _type: 'question',
        _id: questionId,
        questionText: q.text,
        questionNumber: q.number,
        category: {
          _type: 'reference',
          _ref: categoryId,
        },
        scale: {
          _type: 'reference',
          _ref: scale._id,
        },
        isReversed: q.isReversed,
        isRequired: true,
      });

      createdQuestions.push(question);
      const reversedLabel = q.isReversed ? ' [REVERSED]' : '';
      console.log(`   ✅ Question ${q.number.toString().padStart(2, '0')} | ${q.categoryName}${reversedLabel}`);
    }

    // Step 6: Link questions to section
    console.log('\n🔗 Step 6: Linking questions to section...');
    await client
      .patch(section._id)
      .set({
        questions: createdQuestions.map((q) => ({
          _type: 'reference',
          _ref: q._id,
          _key: q._id,
        })),
      })
      .commit();
    console.log('   ✅ Questions linked to section');

    // Step 7: Link section to survey
    console.log('\n🔗 Step 7: Linking section to survey...');
    await client
      .patch(survey._id)
      .set({
        sections: [
          {
            _type: 'reference',
            _ref: section._id,
            _key: section._id,
          },
        ],
      })
      .commit();
    console.log('   ✅ Section linked to survey');

    // Count reverse-scored questions
    const reversedCount = QUESTIONS.filter(q => q.isReversed).length;

    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('📊 CREATION SUMMARY');
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log(`✅ Survey: Associate 180° Assessment (Survey 7)`);
    console.log(`✅ Scale: 3-point Likert (1=Rarely, 2=Sometimes, 3=Frequently)`);
    console.log(`✅ Sections: 1`);
    console.log(`✅ Questions created: ${createdQuestions.length}`);
    console.log(`📦 Total questions: ${QUESTIONS.length}`);
    console.log(`🔄 Reverse-scored questions: ${reversedCount}`);
    console.log(`🔒 Anonymity: REQUIRED (minimum 5 respondents)`);
    console.log('══════════════════════════════════════════════════════════════════════\n');

    console.log('🔐 ANONYMITY REQUIREMENTS');
    console.log('──────────────────────────────────────────────────────────────────────');
    console.log('⚠️  CRITICAL: This survey requires strict anonymity enforcement:');
    console.log('   - Individual responses are NEVER visible in admin views');
    console.log('   - Reports require minimum 5 respondents before generating');
    console.log('   - All data is aggregated and rounded to protect privacy');
    console.log('   - Demographic filtering disabled when < 5 respondents');
    console.log('──────────────────────────────────────────────────────────────────────\n');

    console.log('⚠️  IMPORTANT: Next Steps');
    console.log('──────────────────────────────────────────────────────────────────────');
    console.log('1. Replace placeholder questions with actual survey questions');
    console.log('   - Edit questions in Sanity Studio');
    console.log('   - Verify reverse-scoring flags are correct');
    console.log('');
    console.log('2. Verify category mappings and weights');
    console.log('   - Command: npx tsx scripts/verify-question-mappings.ts');
    console.log('');
    console.log('3. Test the survey');
    console.log('   - Create a campaign in admin dashboard');
    console.log('   - Complete survey as test respondent');
    console.log('   - Verify anonymity enforcement (need 5 respondents)');
    console.log('──────────────────────────────────────────────────────────────────────\n');

    console.log('✨ Associate 180° Assessment created successfully!');
    console.log('🔗 Sanity Studio: http://localhost:3333 (run: npm run sanity:dev)\n');

  } catch (error) {
    console.error('❌ Error creating Associate 180 survey:', error);
    throw error;
  }
}

// Run the script
createAssociate180Survey()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
