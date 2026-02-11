/**
 * Fix OTE Survey Document Scale Reference
 *
 * This script sets the scale reference on the OTE survey document itself,
 * not just on individual questions. The reporting API requires this.
 *
 * Usage:
 *   npx tsx scripts/fix-ote-survey-scale.ts
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

async function main() {
  console.log('🔧 Fixing OTE Survey Document Scale Reference...\n');

  try {
    // Step 1: Find the 5-point Likert scale
    console.log('📊 Step 1: Finding 5-point Likert scale...');
    const scale = await client.fetch(
      `*[_type == "scale" && _id == "likert-5-point"][0]`
    );

    if (!scale) {
      console.error('❌ 5-point Likert scale not found!');
      console.log('   Creating it now...');

      const newScale = await client.create({
        _type: 'scale',
        _id: 'likert-5-point',
        title: '5-Point Likert (Strongly Disagree to Strongly Agree)',
        scaleType: 'likert5',
        min: 1,
        max: 5,
        minLabel: 'Strongly Disagree',
        maxLabel: 'Strongly Agree',
        midLabel: 'Neutral',
      });

      console.log('   ✅ Created 5-point Likert scale');
    } else {
      console.log(`   ✅ Found scale: ${scale.title}`);
    }

    // Step 2: Find the OTE survey
    console.log('\n📝 Step 2: Finding OTE survey document...');
    const survey = await client.fetch(
      `*[_type == "survey" && slug.current == "operational-team-effectiveness"][0] {
        _id,
        title,
        scale
      }`
    );

    if (!survey) {
      console.error('❌ OTE survey not found!');
      console.log('   Please run: npx tsx scripts/create-ote-survey.ts');
      process.exit(1);
    }

    console.log(`   ✅ Found survey: ${survey.title}`);

    // Step 3: Check if scale is already set
    if (survey.scale && survey.scale._ref === 'likert-5-point') {
      console.log('\n✅ Survey already has the correct scale reference!');
      console.log('   No fix needed.');
      process.exit(0);
    }

    // Step 4: Set the scale reference
    console.log('\n🔧 Step 3: Setting scale reference on survey document...');

    await client
      .patch(survey._id)
      .set({
        scale: {
          _type: 'reference',
          _ref: 'likert-5-point',
        },
      })
      .commit();

    console.log('   ✅ Scale reference set successfully!');

    // Step 5: Verify the fix
    console.log('\n✅ Step 4: Verifying fix...');
    const verifiedSurvey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0] {
        _id,
        title,
        scale->{
          _id,
          title
        }
      }`,
      { surveyId: survey._id }
    );

    if (verifiedSurvey.scale && verifiedSurvey.scale._id === 'likert-5-point') {
      console.log(`   ✅ Verification passed!`);
      console.log(`   Scale: ${verifiedSurvey.scale.title}`);
    } else {
      console.error('   ❌ Verification failed - scale not set correctly');
      process.exit(1);
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FIX SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Survey: ${survey.title}`);
    console.log(`✅ Scale: 5-Point Likert (Strongly Disagree to Strongly Agree)`);
    console.log(`✅ Scale reference set on survey document`);
    console.log('═'.repeat(70));

    console.log('\n✨ OTE survey is now properly configured!');
    console.log('📊 The report page should now work correctly.\n');

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
