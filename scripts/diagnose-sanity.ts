/**
 * Diagnostic script to test Sanity connection and survey data
 *
 * Usage: npx tsx scripts/diagnose-sanity.ts
 */

import { createClient } from '@sanity/client';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '4z8cbios';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

console.log('🔍 Sanity Diagnostic Tool\n');
console.log('Environment Configuration:');
console.log(`  Project ID: ${projectId}`);
console.log(`  Dataset: ${dataset}`);
console.log(`  API Token: ${token ? '✓ Set' : '✗ Not set'}`);
console.log(`  Node ENV: ${process.env.NODE_ENV || 'development'}`);
console.log('');

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
});

async function diagnose() {
  try {
    console.log('📡 Testing Sanity connection...\n');

    // Test 1: Fetch all surveys
    const query = `
      *[_type == "survey"] | order(surveyNumber asc, title asc) {
        _id,
        title,
        slug,
        surveyNumber,
        surveyType,
        isActive,
        estimatedMinutes
      }
    `;

    const surveys = await client.fetch(query);

    console.log(`✅ Successfully connected to Sanity!`);
    console.log(`📊 Found ${surveys.length} total surveys:\n`);

    if (surveys.length === 0) {
      console.log('⚠️  No surveys found in Sanity!');
      console.log('   Please create surveys in Sanity Studio first.');
      return;
    }

    // Display each survey
    surveys.forEach((survey: any, index: number) => {
      const activeStatus =
        survey.isActive === true
          ? '🟢 Active'
          : survey.isActive === false
            ? '🔴 Inactive'
            : '⚪ Not set';
      console.log(`${index + 1}. ${survey.title || 'Untitled'}`);
      console.log(`   ID: ${survey._id}`);
      console.log(`   Survey Number: ${survey.surveyNumber || 'N/A'}`);
      console.log(`   Survey Type: ${survey.surveyType || 'N/A'}`);
      console.log(`   Status: ${activeStatus}`);
      console.log(`   Is Active value: ${JSON.stringify(survey.isActive)}`);
      console.log(`   Estimated Minutes: ${survey.estimatedMinutes || 'N/A'}`);
      console.log('');
    });

    // Count active surveys
    const activeSurveys = surveys.filter((s: any) => s.isActive === true);
    console.log(
      `✅ ${activeSurveys.length} surveys are ACTIVE (isActive: true)`
    );
    console.log(
      `⚠️  ${surveys.length - activeSurveys.length} surveys are NOT ACTIVE`
    );
    console.log('');

    if (activeSurveys.length === 0) {
      console.log('⚠️  PROBLEM FOUND:');
      console.log('   No surveys have isActive set to true!');
      console.log('   This is why the dropdown is empty.');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log(
        '   Go to Sanity Studio and set isActive: true for your surveys'
      );
      console.log('   Or run: npm run sanity:update-active-surveys');
    } else {
      console.log('✅ Active surveys should appear in the dropdown!');
      console.log(
        "   If they still don't appear, check browser console for errors."
      );
    }
  } catch (error) {
    console.error('❌ Error connecting to Sanity:');
    console.error(error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Check that SANITY_API_TOKEN is set in Vercel');
    console.log('   2. Verify the token has read permissions');
    console.log('   3. Confirm the project ID and dataset are correct');
  }
}

diagnose();
