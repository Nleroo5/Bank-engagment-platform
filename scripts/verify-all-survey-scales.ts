/**
 * Verify All Survey Scale References
 *
 * Checks and fixes scale references for all Likert surveys
 *
 * Usage:
 *   npx tsx scripts/verify-all-survey-scales.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface SurveyCheck {
  slug: string;
  title: string;
  expectedScale: '5-point' | '3-point' | 'none';
  scaleId: string;
}

const SURVEYS_TO_CHECK: SurveyCheck[] = [
  {
    slug: 'leadership-team-effectiveness',
    title: 'Leadership Team Effectiveness (LTE)',
    expectedScale: '5-point',
    scaleId: 'likert-5-point',
  },
  {
    slug: 'operational-team-effectiveness',
    title: 'Operational Team Effectiveness (OTE)',
    expectedScale: '5-point',
    scaleId: 'likert-5-point',
  },
  {
    slug: 'managerial-assessment',
    title: 'Managerial Assessment',
    expectedScale: '3-point',
    scaleId: 'likert-3-point',
  },
  {
    slug: 'associate-180-assessment',
    title: 'Associate 180° Assessment',
    expectedScale: '3-point',
    scaleId: 'likert-3-point',
  },
];

async function ensureScaleExists(scaleId: string, scaleName: string) {
  const scale = await client.fetch(
    `*[_type == "scale" && _id == $scaleId][0]`,
    { scaleId }
  );

  if (!scale) {
    if (scaleId === 'likert-5-point') {
      return await client.create({
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
    } else if (scaleId === 'likert-3-point') {
      return await client.create({
        _type: 'scale',
        _id: scaleId,
        title: '3-Point Frequency Scale (Rarely to Frequently)',
        scaleType: 'likert3',
        min: 1,
        max: 3,
        minLabel: 'Rarely',
        maxLabel: 'Frequently',
        midLabel: 'Sometimes',
      });
    }
  }

  return scale;
}

async function main() {
  console.log('🔍 Verifying All Survey Scale References...\n');

  let fixed = 0;
  let alreadyCorrect = 0;
  let notFound = 0;

  try {
    for (const surveyCheck of SURVEYS_TO_CHECK) {
      console.log(`\n📝 Checking: ${surveyCheck.title}...`);

      // Ensure the scale exists
      const scale = await ensureScaleExists(
        surveyCheck.scaleId,
        surveyCheck.expectedScale
      );

      if (!scale) {
        console.log(`   ❌ Could not create scale: ${surveyCheck.scaleId}`);
        continue;
      }

      // Find the survey
      const survey = await client.fetch(
        `*[_type == "survey" && slug.current == $slug][0] {
          _id,
          title,
          scale
        }`,
        { slug: surveyCheck.slug }
      );

      if (!survey) {
        console.log(`   ⚠️  Survey not found (may not be created yet)`);
        notFound++;
        continue;
      }

      // Check if scale is set correctly
      if (survey.scale && survey.scale._ref === surveyCheck.scaleId) {
        console.log(`   ✅ Scale reference already correct`);
        alreadyCorrect++;
        continue;
      }

      // Fix the scale reference
      console.log(`   🔧 Setting scale reference...`);
      await client
        .patch(survey._id)
        .set({
          scale: {
            _type: 'reference',
            _ref: surveyCheck.scaleId,
          },
        })
        .commit();

      console.log(`   ✅ Scale reference fixed!`);
      fixed++;
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Surveys checked: ${SURVEYS_TO_CHECK.length}`);
    console.log(`✅ Already correct: ${alreadyCorrect}`);
    console.log(`🔧 Fixed: ${fixed}`);
    console.log(`⚠️  Not found: ${notFound}`);
    console.log('═'.repeat(70));

    if (fixed > 0) {
      console.log('\n✨ Survey scale references have been fixed!');
    } else if (alreadyCorrect === SURVEYS_TO_CHECK.length - notFound) {
      console.log('\n✅ All surveys are properly configured!');
    }

    if (notFound > 0) {
      console.log(
        '\n⚠️  Some surveys were not found. You may need to run their creation scripts first.'
      );
    }

    console.log('\n📊 Reports should now work correctly for all surveys.\n');

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
