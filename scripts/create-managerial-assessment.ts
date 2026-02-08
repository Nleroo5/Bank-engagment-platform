/**
 * Managerial Assessment Survey Creation Script
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
  isReversed: boolean;
}

const QUESTIONS: Question[] = [
  {
    number: 1,
    text: 'Sets clear goals and expectations for the team',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 7,
    text: 'Provides direction and guidance when needed',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 14,
    text: 'Makes decisions in a timely manner',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 21,
    text: 'Demonstrates confidence in leadership abilities',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 27,
    text: 'Leads by example and models desired behaviors',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 33,
    text: 'Fails to provide clear direction to the team',
    categoryName: 'Leadership',
    isReversed: true,
  },
  {
    number: 35,
    text: 'Empowers team members to make decisions',
    categoryName: 'Leadership',
    isReversed: false,
  },
  {
    number: 2,
    text: 'Holds team members accountable for their work',
    categoryName: 'Accountability',
    isReversed: false,
  },
  {
    number: 9,
    text: 'Follows through on commitments and promises',
    categoryName: 'Accountability',
    isReversed: false,
  },
  {
    number: 16,
    text: 'Addresses performance issues promptly',
    categoryName: 'Accountability',
    isReversed: false,
  },
  {
    number: 22,
    text: 'Takes responsibility for team outcomes',
    categoryName: 'Accountability',
    isReversed: false,
  },
  {
    number: 29,
    text: 'Avoids confronting poor performance',
    categoryName: 'Accountability',
    isReversed: true,
  },
  {
    number: 34,
    text: 'Establishes clear expectations for quality',
    categoryName: 'Accountability',
    isReversed: false,
  },
  {
    number: 3,
    text: 'Ensures work is completed on time',
    categoryName: 'Execution',
    isReversed: false,
  },
  {
    number: 10,
    text: 'Effectively manages resources',
    categoryName: 'Execution',
    isReversed: false,
  },
  {
    number: 17,
    text: 'Removes obstacles that prevent progress',
    categoryName: 'Execution',
    isReversed: false,
  },
  {
    number: 23,
    text: 'Monitors progress and adjusts plans',
    categoryName: 'Execution',
    isReversed: false,
  },
  {
    number: 30,
    text: 'Fails to monitor progress effectively',
    categoryName: 'Execution',
    isReversed: true,
  },
  {
    number: 4,
    text: 'Supports professional development',
    categoryName: 'Associate',
    isReversed: false,
  },
  {
    number: 11,
    text: 'Provides coaching and mentoring',
    categoryName: 'Associate',
    isReversed: false,
  },
  {
    number: 18,
    text: 'Shows genuine interest in career goals',
    categoryName: 'Associate',
    isReversed: false,
  },
  {
    number: 24,
    text: 'Creates learning opportunities',
    categoryName: 'Associate',
    isReversed: false,
  },
  {
    number: 31,
    text: 'Invests time in developing team',
    categoryName: 'Associate',
    isReversed: false,
  },
  {
    number: 5,
    text: 'Builds strong relationships',
    categoryName: 'Team Dynamics',
    isReversed: false,
  },
  {
    number: 12,
    text: 'Resolves conflicts effectively',
    categoryName: 'Team Dynamics',
    isReversed: false,
  },
  {
    number: 19,
    text: 'Promotes collaboration',
    categoryName: 'Team Dynamics',
    isReversed: false,
  },
  {
    number: 25,
    text: 'Creates unnecessary tension',
    categoryName: 'Team Dynamics',
    isReversed: true,
  },
  {
    number: 32,
    text: 'Facilitates productive discussions',
    categoryName: 'Team Dynamics',
    isReversed: false,
  },
  {
    number: 6,
    text: 'Communicates openly and honestly',
    categoryName: 'Communication',
    isReversed: false,
  },
  {
    number: 13,
    text: 'Provides clear feedback',
    categoryName: 'Communication',
    isReversed: false,
  },
  {
    number: 20,
    text: 'Listens actively',
    categoryName: 'Communication',
    isReversed: false,
  },
  {
    number: 26,
    text: 'Withholds important information',
    categoryName: 'Communication',
    isReversed: true,
  },
  {
    number: 8,
    text: 'Fosters a positive environment',
    categoryName: 'Culture',
    isReversed: false,
  },
  {
    number: 15,
    text: 'Recognizes achievements',
    categoryName: 'Culture',
    isReversed: false,
  },
  {
    number: 28,
    text: 'Creates an environment where people feel valued',
    categoryName: 'Culture',
    isReversed: false,
  },
];

async function createManagerialAssessment() {
  console.log('🚀 Starting Managerial Assessment survey creation...\n');

  try {
    const scaleId = 'likert-3-point';
    let scale = await client.fetch(
      `*[_type == "scale" && _id == $scaleId][0]`,
      { scaleId }
    );

    if (!scale) {
      scale = await client.create({
        _type: 'scale',
        _id: scaleId,
        title: '3-Point Likert',
        scaleType: 'likert3',
        min: 1,
        max: 3,
        minLabel: 'Rarely',
        maxLabel: 'Frequently',
        midLabel: 'Sometimes',
      });
    }

    const categories = await client.fetch(
      `*[_type == "category" && name != "Demographics"] { _id, name }`
    );
    const categoryMap = new Map(categories.map((c: any) => [c.name, c._id]));

    const surveyId = 'managerial-assessment';
    let survey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0]`,
      { surveyId }
    );

    if (!survey) {
      survey = await client.create({
        _type: 'survey',
        _id: surveyId,
        title: 'Managerial Assessment',
        surveyType: 'managerial',
        surveyNumber: 6,
        description: 'Assessment of managerial effectiveness.',
        estimatedMinutes: 8,
        requiresManagerName: true,
        anonymityRequired: false,
        instructions:
          'Rate how frequently your manager engages in these behaviors.',
      });
    }

    const sectionId = `${surveyId}-section-1`;
    let section = await client.fetch(
      `*[_type == "section" && _id == $sectionId][0]`,
      { sectionId }
    );

    if (!section) {
      section = await client.create({
        _type: 'section',
        _id: sectionId,
        title: 'Manager Effectiveness',
        order: 1,
      });
    }

    const createdQuestions: any[] = [];

    for (const q of QUESTIONS) {
      const questionId = `${surveyId}-q${q.number}`;
      const existing = await client.fetch(
        `*[_type == "question" && _id == $questionId][0]`,
        { questionId }
      );

      if (existing) {
        createdQuestions.push(existing);
        continue;
      }

      const categoryId = categoryMap.get(q.categoryName);
      if (!categoryId) continue;

      const question = await client.create({
        _type: 'question',
        _id: questionId,
        questionText: q.text,
        questionNumber: q.number,
        category: { _type: 'reference', _ref: categoryId },
        scale: { _type: 'reference', _ref: scale._id },
        isReversed: q.isReversed,
        isRequired: true,
      });

      createdQuestions.push(question);
      console.log(
        `✅ Q${q.number} | ${q.categoryName}${q.isReversed ? ' [REV]' : ''}`
      );
    }

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

    await client
      .patch(survey._id)
      .set({
        sections: [
          { _type: 'reference', _ref: section._id, _key: section._id },
        ],
      })
      .commit();

    console.log('\n✅ Managerial Assessment (Survey 6) created!');
    console.log(
      `📦 ${QUESTIONS.length} questions with ${QUESTIONS.filter((q) => q.isReversed).length} reversed`
    );
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createManagerialAssessment()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
