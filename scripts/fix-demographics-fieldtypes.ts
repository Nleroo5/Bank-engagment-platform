/**
 * Script to set fieldType for demographics survey questions
 *
 * Usage: npx tsx scripts/fix-demographics-fieldtypes.ts
 */

import { createClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '4z8cbios';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

if (!token) {
  console.error('❌ SANITY_API_TOKEN is not set!');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
});

// Mapping of question numbers to field types for demographics survey
const FIELD_TYPE_MAP: Record<number, string> = {
  1: 'bankName', // Name of Bank
  2: 'country', // Country
  3: 'state', // State
  4: 'metro', // Metro City Area
  5: 'city', // City
  6: 'bankSize', // Size of Bank
  7: 'device', // Device Used
  8: 'employmentStatus', // Employment Status
  9: 'gender', // Gender
  10: 'timeAtBank', // Time at Bank
  11: 'bankExperience', // Bank Experience
  12: 'division', // Division
  13: 'jobRole', // Job Role
};

async function fixDemographicsFieldTypes() {
  try {
    console.log('\n🔧 Fixing Demographics Survey Field Types\n');

    // Find the demographics survey
    const demographicsSurvey = await client.fetch(
      `*[_type == "survey" && surveyType == "demographics"][0] {
        _id,
        title,
        "sections": sections[]->{
          _id,
          title,
          "questions": questions[]->{
            _id,
            questionNumber,
            questionText,
            fieldType
          }
        }
      }`
    );

    if (!demographicsSurvey) {
      console.error('❌ Demographics survey not found!');
      console.log(
        '   Make sure you have a survey with surveyType="demographics" in Sanity.'
      );
      return;
    }

    console.log(`✅ Found demographics survey: ${demographicsSurvey.title}`);
    console.log('');

    // Get all questions
    const allQuestions = demographicsSurvey.sections
      .flatMap((section: any) => section.questions)
      .sort((a: any, b: any) => a.questionNumber - b.questionNumber);

    console.log(`📊 Found ${allQuestions.length} questions\n`);

    // Update each question with the correct fieldType
    let updatedCount = 0;
    for (const question of allQuestions) {
      const expectedFieldType = FIELD_TYPE_MAP[question.questionNumber];

      if (!expectedFieldType) {
        console.log(
          `⚠️  Q${question.questionNumber}: No field type mapping defined`
        );
        continue;
      }

      if (question.fieldType === expectedFieldType) {
        console.log(
          `✓  Q${question.questionNumber}: Already set to '${expectedFieldType}'`
        );
        continue;
      }

      console.log(
        `🔄 Q${question.questionNumber}: Setting fieldType to '${expectedFieldType}'`
      );
      console.log(`   Text: ${question.questionText.substring(0, 60)}...`);

      await client
        .patch(question._id)
        .set({ fieldType: expectedFieldType })
        .commit();

      updatedCount++;
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log(`✅ Updated ${updatedCount} questions`);
    console.log(
      `✓  ${allQuestions.length - updatedCount} questions were already correct`
    );
    console.log('═'.repeat(60));
    console.log('');
    console.log(
      '🎉 Done! Demographics survey questions are now properly configured.'
    );
    console.log('   Refresh your survey page to see the questions.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDemographicsFieldTypes();
