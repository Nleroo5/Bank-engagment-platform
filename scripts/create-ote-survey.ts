/**
 * Operational Team Effectiveness (OTE) Survey Creation Script
 *
 * Creates Survey 5: Operational Team Effectiveness with:
 * - 5-point Likert scale (Strongly Disagree to Strongly Agree)
 * - 3 sections (Operating Effectiveness, Support Person, Leadership Team)
 * - 36 questions with category mappings
 *
 * Usage:
 *   npx tsx scripts/create-ote-survey.ts
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

interface Question {
  number: number;
  text: string;
  categoryName: string;
  sectionIndex: number; // 0, 1, or 2
}

// Survey 5 questions mapped to categories and sections
const QUESTIONS: Question[] = [
  // Section 1: Operating Effectiveness of the Team (Questions 1-18)
  // Communication
  {
    number: 1,
    text: 'Team members communicate openly and effectively with each other',
    categoryName: 'Communication',
    sectionIndex: 0,
  },
  {
    number: 8,
    text: 'Information flows smoothly within the team',
    categoryName: 'Communication',
    sectionIndex: 0,
  },
  {
    number: 15,
    text: 'Team meetings are productive and well-organized',
    categoryName: 'Communication',
    sectionIndex: 0,
  },

  // Leadership
  {
    number: 2,
    text: 'The team has clear leadership and direction',
    categoryName: 'Leadership',
    sectionIndex: 0,
  },
  {
    number: 9,
    text: 'Team leaders make effective decisions',
    categoryName: 'Leadership',
    sectionIndex: 0,
  },
  {
    number: 16,
    text: 'Leadership roles are well-defined within the team',
    categoryName: 'Leadership',
    sectionIndex: 0,
  },

  // Culture
  {
    number: 3,
    text: 'The team has a positive and collaborative culture',
    categoryName: 'Culture',
    sectionIndex: 0,
  },
  {
    number: 10,
    text: 'Team members feel valued and respected',
    categoryName: 'Culture',
    sectionIndex: 0,
  },
  {
    number: 17,
    text: 'The team celebrates successes together',
    categoryName: 'Culture',
    sectionIndex: 0,
  },

  // Accountability
  {
    number: 4,
    text: 'Team members hold each other accountable for results',
    categoryName: 'Accountability',
    sectionIndex: 0,
  },
  {
    number: 11,
    text: 'The team follows through on commitments',
    categoryName: 'Accountability',
    sectionIndex: 0,
  },
  {
    number: 18,
    text: 'Performance standards are clearly defined and maintained',
    categoryName: 'Accountability',
    sectionIndex: 0,
  },

  // Execution
  {
    number: 5,
    text: 'The team consistently delivers quality work on time',
    categoryName: 'Execution',
    sectionIndex: 0,
  },
  {
    number: 12,
    text: 'The team effectively manages resources and priorities',
    categoryName: 'Execution',
    sectionIndex: 0,
  },

  // Associate
  {
    number: 6,
    text: "Team members support each other's professional development",
    categoryName: 'Associate',
    sectionIndex: 0,
  },
  {
    number: 13,
    text: 'The team provides opportunities for learning and growth',
    categoryName: 'Associate',
    sectionIndex: 0,
  },

  // Team Dynamics
  {
    number: 7,
    text: 'The team works well together and collaborates effectively',
    categoryName: 'Team Dynamics',
    sectionIndex: 0,
  },
  {
    number: 14,
    text: 'Conflicts are resolved constructively within the team',
    categoryName: 'Team Dynamics',
    sectionIndex: 0,
  },

  // Section 2: Support Person Effectiveness (Questions 19-27)
  // Communication
  {
    number: 19,
    text: 'The support person communicates clearly and effectively',
    categoryName: 'Communication',
    sectionIndex: 1,
  },
  {
    number: 23,
    text: 'The support person keeps the team informed',
    categoryName: 'Communication',
    sectionIndex: 1,
  },

  // Leadership
  {
    number: 20,
    text: 'The support person provides effective guidance',
    categoryName: 'Leadership',
    sectionIndex: 1,
  },
  {
    number: 24,
    text: 'The support person leads by example',
    categoryName: 'Leadership',
    sectionIndex: 1,
  },

  // Culture
  {
    number: 21,
    text: 'The support person fosters a positive team environment',
    categoryName: 'Culture',
    sectionIndex: 1,
  },

  // Accountability
  {
    number: 25,
    text: 'The support person holds team members accountable',
    categoryName: 'Accountability',
    sectionIndex: 1,
  },

  // Execution
  {
    number: 22,
    text: 'The support person helps the team achieve its goals',
    categoryName: 'Execution',
    sectionIndex: 1,
  },
  {
    number: 26,
    text: 'The support person removes obstacles for the team',
    categoryName: 'Execution',
    sectionIndex: 1,
  },

  // Associate
  {
    number: 27,
    text: 'The support person invests in team member development',
    categoryName: 'Associate',
    sectionIndex: 1,
  },

  // Section 3: Leadership Team Support (Questions 28-36)
  // Communication
  {
    number: 28,
    text: 'The leadership team communicates expectations clearly',
    categoryName: 'Communication',
    sectionIndex: 2,
  },
  {
    number: 32,
    text: 'The leadership team is accessible and responsive',
    categoryName: 'Communication',
    sectionIndex: 2,
  },

  // Leadership
  {
    number: 29,
    text: 'The leadership team provides clear strategic direction',
    categoryName: 'Leadership',
    sectionIndex: 2,
  },
  {
    number: 33,
    text: 'The leadership team makes decisions in a timely manner',
    categoryName: 'Leadership',
    sectionIndex: 2,
  },

  // Culture
  {
    number: 30,
    text: 'The leadership team promotes a positive organizational culture',
    categoryName: 'Culture',
    sectionIndex: 2,
  },

  // Accountability
  {
    number: 34,
    text: 'The leadership team holds people accountable for results',
    categoryName: 'Accountability',
    sectionIndex: 2,
  },

  // Execution
  {
    number: 31,
    text: 'The leadership team provides the resources needed for success',
    categoryName: 'Execution',
    sectionIndex: 2,
  },
  {
    number: 35,
    text: 'The leadership team removes barriers to team performance',
    categoryName: 'Execution',
    sectionIndex: 2,
  },

  // Associate
  {
    number: 36,
    text: 'The leadership team supports professional development',
    categoryName: 'Associate',
    sectionIndex: 2,
  },
];

const SECTIONS = [
  {
    title: 'Operating Effectiveness of the Team',
    description: 'Evaluate the overall operating effectiveness of your team.',
    order: 1,
  },
  {
    title: 'Support Person Effectiveness',
    description:
      'Evaluate the overall support and encouragement of the person assigned to support the team.',
    order: 2,
  },
  {
    title: 'Leadership Team Support',
    description:
      'Evaluate the overall support and encouragement received from the leadership team.',
    order: 3,
  },
];

async function createOTESurvey() {
  console.log(
    '🚀 Starting Operational Team Effectiveness (OTE) survey creation...\n'
  );

  console.log(
    '📡 Connecting to Sanity project:',
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  );
  console.log(
    '📦 Dataset:',
    process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  );
  console.log('');

  try {
    // Step 1: Set up 5-point Likert scale
    console.log('📊 Step 1: Setting up 5-point Likert scale...');
    const scaleId = 'likert-5-point';

    let scale = await client.fetch(
      `*[_type == "scale" && _id == $scaleId][0]`,
      { scaleId }
    );

    if (!scale) {
      scale = await client.create({
        _type: 'scale',
        _id: scaleId,
        title: '5-Point Likert (Strongly Disagree to Strongly Agree)',
        scaleType: 'likert5',
        min: 1,
        max: 5,
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        midLabel: 'Neutral',
      });
      console.log('   ✅ 5-point Likert scale created');
    } else {
      console.log('   ✓ 5-point Likert scale already exists');
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
      console.log(
        '   Expected: Communication, Leadership, Culture, Accountability, Execution, Associate, Team Dynamics'
      );
      console.log('   Found:', categories.map((c: any) => c.name).join(', '));
      return;
    }

    console.log('   ✅ Found all 7 categories');

    // Create category map for quick lookup
    const categoryMap = new Map(categories.map((c: any) => [c.name, c._id]));

    // Step 3: Set up survey
    console.log('\n📝 Step 3: Setting up survey...');
    const surveyId = 'operational-team-effectiveness';

    let survey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0]`,
      { surveyId }
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        _id: surveyId,
        title: 'Operational Team Effectiveness',
        surveyType: 'ote',
        surveyNumber: 5,
        description:
          'Assessment of team operating effectiveness, support person effectiveness, and leadership team support.',
        estimatedMinutes: 8,
        requiresManagerName: false,
        anonymityRequired: false,
        minimumRespondents: 1,
        instructions:
          "Please rate the following statements about your team's effectiveness using the scale provided.",
      });
      console.log('   ✅ OTE survey created');
    } else {
      console.log('   ✓ OTE survey already exists');
    }

    // Step 4: Create sections
    console.log('\n📑 Step 4: Creating sections...\n');
    const createdSections: any[] = [];

    for (let i = 0; i < SECTIONS.length; i++) {
      const sectionData = SECTIONS[i];
      const sectionId = `${surveyId}-section-${i + 1}`;

      let section = await client.fetch(
        `*[_type == "section" && _id == $sectionId][0]`,
        { sectionId }
      );

      if (!section) {
        section = await client.create({
          _type: 'section',
          _id: sectionId,
          title: sectionData.title,
          description: sectionData.description,
          order: sectionData.order,
        });
        console.log(`   ✅ Section ${i + 1}: ${sectionData.title}`);
      } else {
        console.log(
          `   ✓ Section ${i + 1}: ${sectionData.title} already exists`
        );
      }

      createdSections.push(section);
    }

    // Step 5: Create questions
    console.log(
      '\n❓ Step 5: Creating questions (this may take a minute)...\n'
    );

    const createdQuestionsBySec: any[][] = [[], [], []];

    for (const q of QUESTIONS) {
      const questionId = `${surveyId}-q${q.number}`;

      // Check if question exists
      const existing = await client.fetch(
        `*[_type == "question" && _id == $questionId][0]`,
        { questionId }
      );

      if (existing) {
        console.log(
          `   ⏭️  Question ${q.number.toString().padStart(2, '0')} | Section ${q.sectionIndex + 1} | Already exists`
        );
        createdQuestionsBySec[q.sectionIndex].push(existing);
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
        isReversed: false,
        isRequired: true,
      });

      createdQuestionsBySec[q.sectionIndex].push(question);
      console.log(
        `   ✅ Question ${q.number.toString().padStart(2, '0')} | Section ${q.sectionIndex + 1} | ${q.categoryName}`
      );
    }

    // Step 6: Link questions to sections
    console.log('\n🔗 Step 6: Linking questions to sections...');
    for (let i = 0; i < createdSections.length; i++) {
      const section = createdSections[i];
      const questions = createdQuestionsBySec[i];

      await client
        .patch(section._id)
        .set({
          questions: questions.map((q) => ({
            _type: 'reference',
            _ref: q._id,
            _key: q._id,
          })),
        })
        .commit();

      console.log(
        `   ✅ Section ${i + 1}: ${questions.length} questions linked`
      );
    }

    // Step 7: Link sections to survey
    console.log('\n🔗 Step 7: Linking sections to survey...');
    await client
      .patch(survey._id)
      .set({
        sections: createdSections.map((s) => ({
          _type: 'reference',
          _ref: s._id,
          _key: s._id,
        })),
      })
      .commit();
    console.log('   ✅ Sections linked to survey');

    const totalQuestions = createdQuestionsBySec.reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    console.log(
      '\n══════════════════════════════════════════════════════════════════════'
    );
    console.log('📊 CREATION SUMMARY');
    console.log(
      '══════════════════════════════════════════════════════════════════════'
    );
    console.log(`✅ Survey: Operational Team Effectiveness (Survey 5)`);
    console.log(
      `✅ Scale: 5-point Likert (Strongly Disagree to Strongly Agree)`
    );
    console.log(`✅ Sections: 3`);
    console.log(
      `   - Section 1: Operating Effectiveness (${createdQuestionsBySec[0].length} questions)`
    );
    console.log(
      `   - Section 2: Support Person (${createdQuestionsBySec[1].length} questions)`
    );
    console.log(
      `   - Section 3: Leadership Team (${createdQuestionsBySec[2].length} questions)`
    );
    console.log(`✅ Questions created: ${totalQuestions}`);
    console.log(`📦 Total questions: ${QUESTIONS.length}`);
    console.log(
      '══════════════════════════════════════════════════════════════════════\n'
    );

    console.log('⚠️  IMPORTANT: Next Steps');
    console.log(
      '──────────────────────────────────────────────────────────────────────'
    );
    console.log(
      '1. Replace placeholder questions with actual survey questions'
    );
    console.log('   - Edit questions in Sanity Studio');
    console.log('   - Update question text to match paper survey');
    console.log('');
    console.log('2. Test the survey');
    console.log('   - Create a campaign in admin dashboard');
    console.log('   - Complete survey as test respondent');
    console.log('   - Verify all sections and questions display correctly');
    console.log(
      '──────────────────────────────────────────────────────────────────────\n'
    );

    console.log('✨ OTE survey created successfully!');
    console.log(
      '🔗 Sanity Studio: http://localhost:3333 (run: npm run sanity:dev)\n'
    );
  } catch (error) {
    console.error('❌ Error creating OTE survey:', error);
    throw error;
  }
}

// Run the script
createOTESurvey()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
