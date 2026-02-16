/**
 * Verify Demographics Survey Fix
 *
 * Tests that all demographics questions now have fieldType configured
 * and that the survey loads correctly.
 */

import { prisma } from '../src/lib/prisma/index.js';
import { getSurveyById } from '../src/lib/surveys/queries.js';

async function verify() {
  console.log('✅ Testing Demographics Survey Loading...\n');

  const survey = await prisma.survey.findFirst({
    where: { surveyType: 'demographics' },
  });

  if (!survey) {
    console.log('❌ No demographics survey found');
    return;
  }

  console.log('📋 Loading survey with getSurveyById...\n');

  try {
    const loadedSurvey = await getSurveyById(survey.id);

    if (loadedSurvey) {
      console.log('✅ Survey loaded successfully!');
      console.log('   Title:', loadedSurvey.title);
      console.log('   Sections:', loadedSurvey.sections.length);
      console.log('   Questions:', loadedSurvey.sections[0].questions.length);
      console.log('');

      console.log('📝 Questions with fieldType:');
      console.log('─'.repeat(70));

      let withFieldType = 0;
      let missingFieldType = 0;

      for (const question of loadedSurvey.sections[0].questions) {
        const status = question.fieldType ? '✅' : '❌';
        const fieldTypeDisplay = question.fieldType || 'MISSING';

        if (question.fieldType) {
          withFieldType++;
        } else {
          missingFieldType++;
        }

        console.log(
          `   ${status} Q${question.number}: ${question.text.substring(0, 35).padEnd(35)} → ${fieldTypeDisplay}`
        );
      }

      console.log('─'.repeat(70));
      console.log(
        `\n📊 Result: ${withFieldType}/${loadedSurvey.sections[0].questions.length} questions have fieldType`
      );

      if (missingFieldType === 0) {
        console.log(
          '\n🎉 SUCCESS! All demographics questions now have fieldType configured!'
        );
        console.log('   The demographics survey should now work correctly.\n');
      } else {
        console.log(
          `\n⚠️  WARNING: ${missingFieldType} questions still missing fieldType\n`
        );
      }
    } else {
      console.log('❌ getSurveyById returned null');
    }
  } catch (error) {
    console.log('❌ ERROR:', (error as Error).message);
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
