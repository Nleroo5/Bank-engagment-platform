/**
 * Leadership Team Effectiveness (LTE) Survey Creation Script
 *
 * Creates Survey 4: Leadership Team Effectiveness with:
 * - 5-point Likert scale
 * - 4 sections (Goal Setting, Roles, Interpersonal Relationships, Procedures)
 * - 40 questions with category mappings
 * - Anchor text for context
 *
 * Usage:
 *   npx tsx scripts/create-lte-survey.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Section definitions
const SECTIONS = [
  {
    sortOrder: 1,
    title: 'Goal Setting',
    directions:
      'Rate how well your team sets and works toward goals. Please consider each statement carefully and select the number that best reflects your team\'s current practices.',
    questionRange: [1, 10], // Questions 1-10
  },
  {
    sortOrder: 2,
    title: 'Roles within the Team',
    directions:
      'Consider the roles and responsibilities within your team. Rate each statement based on how well it describes your team\'s current situation.',
    questionRange: [11, 20], // Questions 11-20
  },
  {
    sortOrder: 3,
    title: 'Interpersonal Relationships',
    directions:
      'Think about how team members interact with each other. Rate how accurately each statement reflects your team\'s interpersonal dynamics.',
    questionRange: [21, 30], // Questions 21-30
  },
  {
    sortOrder: 4,
    title: 'Procedures',
    directions:
      'Consider your team\'s procedures and processes. Rate how well each statement describes your team\'s approach to getting work done.',
    questionRange: [31, 40], // Questions 31-40
  },
];

// Category mappings for all 40 questions (based on typical LTE survey structure)
const QUESTION_CATEGORIES: Record<number, string> = {
  // Section 1: Goal Setting (Questions 1-10)
  1: 'Communication',
  2: 'Leadership',
  3: 'Execution',
  4: 'Team Dynamics',
  5: 'Accountability',
  6: 'Culture',
  7: 'Communication',
  8: 'Leadership',
  9: 'Execution',
  10: 'Associate',

  // Section 2: Roles within the Team (Questions 11-20)
  11: 'Team Dynamics',
  12: 'Accountability',
  13: 'Leadership',
  14: 'Communication',
  15: 'Culture',
  16: 'Execution',
  17: 'Associate',
  18: 'Team Dynamics',
  19: 'Accountability',
  20: 'Leadership',

  // Section 3: Interpersonal Relationships (Questions 21-30)
  21: 'Communication',
  22: 'Culture',
  23: 'Team Dynamics',
  24: 'Leadership',
  25: 'Accountability',
  26: 'Execution',
  27: 'Associate',
  28: 'Communication',
  29: 'Culture',
  30: 'Team Dynamics',

  // Section 4: Procedures (Questions 31-40)
  31: 'Accountability',
  32: 'Leadership',
  33: 'Execution',
  34: 'Communication',
  35: 'Culture',
  36: 'Associate',
  37: 'Team Dynamics',
  38: 'Accountability',
  39: 'Leadership',
  40: 'Execution',
};

// Sample questions with anchor text
// NOTE: These are placeholder questions - replace with actual LTE survey questions
const QUESTIONS: Record<number, { text: string; anchorText?: string }> = {
  // Section 1: Goal Setting
  1: {
    text: 'Team goals are clearly defined and communicated to all members',
    anchorText: 'Goals are specific, measurable, and understood by everyone',
  },
  2: {
    text: 'Leaders ensure that team objectives align with organizational priorities',
    anchorText: 'Objectives are always thoroughly discussed with others on the team',
  },
  3: {
    text: 'The team develops action plans to achieve its goals',
    anchorText: 'Action plans include specific steps, timelines, and responsibilities',
  },
  4: {
    text: 'Team members actively participate in goal-setting discussions',
    anchorText: 'All voices are heard and contributions are valued',
  },
  5: {
    text: 'Progress toward goals is regularly monitored and discussed',
    anchorText: 'The team holds itself accountable for results',
  },
  6: {
    text: 'The team celebrates achievements and learns from setbacks',
    anchorText: 'Success is acknowledged and failures are treated as learning opportunities',
  },
  7: {
    text: 'Goals are adjusted when circumstances change',
    anchorText: 'The team is flexible and responsive to new information',
  },
  8: {
    text: 'Team goals challenge members to perform at their best',
    anchorText: 'Goals are ambitious yet achievable',
  },
  9: {
    text: 'Resources needed to achieve goals are identified and secured',
    anchorText: 'The team has what it needs to succeed',
  },
  10: {
    text: 'Individual goals support and align with team goals',
    anchorText: 'Personal objectives contribute to team success',
  },

  // Section 2: Roles within the Team
  11: {
    text: 'Each team member understands their role and responsibilities',
    anchorText: 'Roles are clearly defined and communicated',
  },
  12: {
    text: 'Team members are held accountable for fulfilling their roles',
    anchorText: 'Expectations are clear and performance is monitored',
  },
  13: {
    text: 'Leadership roles are appropriate and effective',
    anchorText: 'Leaders provide guidance and support as needed',
  },
  14: {
    text: 'Team members communicate about role-related issues',
    anchorText: 'Problems and concerns are openly discussed',
  },
  15: {
    text: 'The team has a culture of mutual support',
    anchorText: 'Members help each other succeed in their roles',
  },
  16: {
    text: 'Work is distributed fairly among team members',
    anchorText: 'Everyone contributes their fair share',
  },
  17: {
    text: 'Team members have the skills needed for their roles',
    anchorText: 'Competencies match responsibilities',
  },
  18: {
    text: 'Roles are flexible enough to adapt to changing needs',
    anchorText: 'The team can reorganize when necessary',
  },
  19: {
    text: 'Role conflicts are identified and resolved quickly',
    anchorText: 'Overlaps and gaps are addressed proactively',
  },
  20: {
    text: 'New members are effectively onboarded into their roles',
    anchorText: 'Orientation and training are comprehensive',
  },

  // Section 3: Interpersonal Relationships
  21: {
    text: 'Team members trust and respect each other',
    anchorText: 'There is a strong sense of mutual regard',
  },
  22: {
    text: 'The team has a positive and supportive atmosphere',
    anchorText: 'Members enjoy working together',
  },
  23: {
    text: 'Conflicts are handled constructively',
    anchorText: 'Disagreements lead to better solutions',
  },
  24: {
    text: 'Team members feel comfortable expressing opinions',
    anchorText: 'All viewpoints are welcomed and considered',
  },
  25: {
    text: 'People take responsibility for their mistakes',
    anchorText: 'Errors are acknowledged and corrected',
  },
  26: {
    text: 'Team members collaborate effectively',
    anchorText: 'Cooperation is the norm, not the exception',
  },
  27: {
    text: 'Individual differences are valued and leveraged',
    anchorText: 'Diversity strengthens the team',
  },
  28: {
    text: 'Communication is open and honest',
    anchorText: 'Members share information freely',
  },
  29: {
    text: 'Social interactions contribute to team cohesion',
    anchorText: 'Personal connections enhance teamwork',
  },
  30: {
    text: 'The team works through challenges together',
    anchorText: 'Difficult situations bring the team closer',
  },

  // Section 4: Procedures
  31: {
    text: 'The team has clear procedures for getting work done',
    anchorText: 'Processes are documented and followed',
  },
  32: {
    text: 'Procedures are regularly reviewed and improved',
    anchorText: 'The team continuously refines its approach',
  },
  33: {
    text: 'Decisions are made efficiently and effectively',
    anchorText: 'The team has good decision-making processes',
  },
  34: {
    text: 'Information flows smoothly within the team',
    anchorText: 'Communication channels are effective',
  },
  35: {
    text: 'Meetings are productive and well-organized',
    anchorText: 'Time together is used wisely',
  },
  36: {
    text: 'Team members are trained on important procedures',
    anchorText: 'Everyone knows how to do their work properly',
  },
  37: {
    text: 'The team coordinates its activities effectively',
    anchorText: 'Work is well-synchronized',
  },
  38: {
    text: 'Quality standards are clearly defined and maintained',
    anchorText: 'Excellence is the expectation',
  },
  39: {
    text: 'Problems are identified and solved systematically',
    anchorText: 'The team has a structured approach to problem-solving',
  },
  40: {
    text: 'The team adapts its procedures when needed',
    anchorText: 'Flexibility is balanced with consistency',
  },
};

interface SanityCategory {
  _id: string;
  name: string;
}

async function main() {
  console.log('🚀 Starting Leadership Team Effectiveness (LTE) survey creation...\n');

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
    // Step 1: Check/Create 5-Point Likert Scale
    // ========================================
    console.log('📊 Step 1: Setting up 5-point Likert scale...');

    let scale = await client.fetch(
      `*[_type == "scale" && scaleType == "likert5"][0]`
    );

    if (!scale) {
      scale = await client.create({
        _type: 'scale',
        name: '5-Point Agreement Scale',
        scaleType: 'likert5',
        min: 1,
        max: 5,
        labels: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' },
        ],
      });
      console.log('   ✅ Created 5-point Likert scale');
    } else {
      console.log('   ✓ 5-point Likert scale already exists');
    }

    // ========================================
    // Step 2: Fetch all categories
    // ========================================
    console.log('\n📋 Step 2: Fetching categories...');

    const categories = await client.fetch<SanityCategory[]>(
      `*[_type == "category" && name != "Demographics"] { _id, name }`
    );

    if (categories.length !== 7) {
      console.error(`   ❌ Expected 7 categories, found ${categories.length}`);
      console.error('   Run: npx tsx scripts/create-categories.ts');
      process.exit(1);
    }

    const categoryMap = new Map(categories.map((c) => [c.name, c._id]));
    console.log(`   ✅ Found all 7 categories`);

    // ========================================
    // Step 3: Check/Create Survey
    // ========================================
    console.log('\n📝 Step 3: Setting up survey...');

    let survey = await client.fetch(
      `*[_type == "survey" && slug.current == "leadership-team-effectiveness"][0]`
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        title: 'Leadership Team Effectiveness (LTE)',
        slug: { _type: 'slug', current: 'leadership-team-effectiveness' },
        surveyNumber: 4,
        surveyType: 'likert5',
        scale: { _type: 'reference', _ref: scale._id },
        welcomeMessage:
          'This survey assesses how effectively your leadership team works together. Please rate each statement based on your observations and experiences.',
        completionMessage:
          'Thank you for completing the Leadership Team Effectiveness survey. Your feedback is valuable for improving team performance.',
        estimatedMinutes: 15,
        isActive: true,
      });
      console.log('   ✅ Created LTE survey');
    } else {
      console.log('   ✓ LTE survey already exists');
    }

    // ========================================
    // Step 4: Create sections
    // ========================================
    console.log('\n📑 Step 4: Creating sections...\n');

    const sectionRefs: any[] = [];

    for (const sectionData of SECTIONS) {
      let section = await client.fetch(
        `*[_type == "section" && title == $title && survey._ref == $surveyId][0]`,
        { title: sectionData.title, surveyId: survey._id }
      );

      if (!section) {
        section = await client.create({
          _type: 'section',
          title: sectionData.title,
          sortOrder: sectionData.sortOrder,
          survey: { _type: 'reference', _ref: survey._id },
          directions: [
            {
              _type: 'block',
              _key: `dir${sectionData.sortOrder}`,
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: 'span1',
                  text: sectionData.directions,
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        });
        console.log(`   ✅ Created section: ${sectionData.title}`);
      } else {
        console.log(`   ✓ Section already exists: ${sectionData.title}`);
      }

      sectionRefs.push({
        section,
        questionRange: sectionData.questionRange,
      });
    }

    // ========================================
    // Step 5: Create all 40 questions
    // ========================================
    console.log('\n❓ Step 5: Creating questions (this may take a minute)...\n');

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const { section, questionRange } of sectionRefs) {
      const [start, end] = questionRange;
      const questionRefs: any[] = [];

      // Check existing questions for this section
      const existingQuestions = await client.fetch<{ number: number }[]>(
        `*[_type == "question" && section._ref == $sectionId] { number }`,
        { sectionId: section._id }
      );
      const existingNumbers = new Set(existingQuestions.map((q) => q.number));

      for (let i = start; i <= end; i++) {
        if (existingNumbers.has(i)) {
          console.log(
            `   ⏭️  Question ${i.toString().padStart(2, '0')} | Already exists`
          );
          totalSkipped++;

          // Fetch existing question ref
          const existing = await client.fetch(
            `*[_type == "question" && number == $num && section._ref == $sectionId][0]._id`,
            { num: i, sectionId: section._id }
          );
          questionRefs.push({ _type: 'reference', _ref: existing, _key: `q${i}` });
          continue;
        }

        const categoryName = QUESTION_CATEGORIES[i];
        const categoryId = categoryMap.get(categoryName);

        if (!categoryId) {
          console.error(`   ❌ Category not found for question ${i}: ${categoryName}`);
          continue;
        }

        const questionData = QUESTIONS[i];
        if (!questionData) {
          console.error(`   ❌ Question data not found for question ${i}`);
          continue;
        }

        const question = await client.create({
          _type: 'question',
          number: i,
          text: questionData.text,
          category: { _type: 'reference', _ref: categoryId },
          section: { _type: 'reference', _ref: section._id },
          isReversed: false,
          anchorText: questionData.anchorText,
        });

        questionRefs.push({ _type: 'reference', _ref: question._id, _key: `q${i}` });
        console.log(
          `   ✅ Question ${i.toString().padStart(2, '0')} | ${categoryName} | ${questionData.text.substring(0, 50)}...`
        );
        totalCreated++;
      }

      // Update section with question references
      await client.patch(section._id).set({ questions: questionRefs }).commit();
    }

    // ========================================
    // Step 6: Update survey with section references
    // ========================================
    console.log('\n🔗 Step 6: Linking sections to survey...');

    const surveySecRefs = sectionRefs.map((sr, idx) => ({
      _type: 'reference',
      _ref: sr.section._id,
      _key: `s${idx + 1}`,
    }));

    await client.patch(survey._id).set({ sections: surveySecRefs }).commit();
    console.log('   ✅ Sections linked to survey');

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 CREATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Survey: Leadership Team Effectiveness (Survey 4)`);
    console.log(`✅ Scale: 5-point Likert (Strongly Disagree to Strongly Agree)`);
    console.log(`✅ Sections: ${SECTIONS.length}`);
    SECTIONS.forEach((s) => {
      console.log(`   - ${s.title} (Questions ${s.questionRange[0]}-${s.questionRange[1]})`);
    });
    console.log(`✅ Questions created: ${totalCreated}`);
    console.log(`⏭️  Questions skipped: ${totalSkipped}`);
    console.log(`📦 Total questions: ${totalCreated + totalSkipped}`);
    console.log('═'.repeat(70));

    console.log('\n⚠️  IMPORTANT: Next Steps');
    console.log('─'.repeat(70));
    console.log('1. Review question text in Sanity Studio');
    console.log('   - Update with actual LTE survey questions if needed');
    console.log('   - Verify anchor text is appropriate');
    console.log('');
    console.log('2. Verify category mappings');
    console.log('   - Command: npx tsx scripts/verify-question-mappings.ts');
    console.log('');
    console.log('3. Test the survey');
    console.log('   - Create a campaign in admin dashboard');
    console.log('   - Complete survey as a test respondent');
    console.log('─'.repeat(70));

    console.log('\n✨ LTE survey created successfully!');
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
