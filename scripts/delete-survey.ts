/**
 * Delete Survey from Sanity
 *
 * This script safely deletes a survey document
 *
 * Usage:
 *   npx tsx scripts/delete-survey.ts <SURVEY_ID>
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
  const surveyId = process.argv[2];

  if (!surveyId) {
    console.error('❌ ERROR: Survey ID is required');
    console.log('\nUsage: npx tsx scripts/delete-survey.ts <SURVEY_ID>');
    process.exit(1);
  }

  console.log(`🗑️  Deleting Survey: ${surveyId}\n`);

  try {
    // First, fetch the survey to confirm
    const survey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0] {
        _id,
        title,
        slug,
        surveyType,
        isActive,
        _createdAt
      }`,
      { surveyId }
    );

    if (!survey) {
      console.error(`❌ Survey not found: ${surveyId}`);
      process.exit(1);
    }

    console.log('📋 Survey Details:');
    console.log('─'.repeat(70));
    console.log(`   ID: ${survey._id}`);
    console.log(`   Title: ${survey.title}`);
    console.log(`   Slug: ${survey.slug?.current || 'No slug'}`);
    console.log(`   Type: ${survey.surveyType || 'Not set'}`);
    console.log(`   Active: ${survey.isActive ? 'Yes' : 'No'}`);
    console.log(
      `   Created: ${new Date(survey._createdAt).toLocaleString()}`
    );
    console.log('─'.repeat(70));

    // Check if there are any campaigns using this survey
    const campaigns = await client.fetch(
      `*[_type == "surveyCampaign" && sanitysurveyId == $surveyId]`,
      { surveyId }
    );

    if (campaigns && campaigns.length > 0) {
      console.error(
        `\n⚠️  WARNING: This survey is referenced by ${campaigns.length} campaign(s) in the database!`
      );
      console.error(
        '   Deleting it will break those campaigns. Please reassign campaigns first.'
      );
      process.exit(1);
    }

    console.log('\n✅ No campaigns are using this survey.');

    // Delete the survey
    console.log('\n🗑️  Deleting survey...');

    await client.delete(surveyId);

    console.log('   ✅ Survey deleted successfully!');

    console.log('\n' + '═'.repeat(70));
    console.log('✨ DELETION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`✅ Deleted: ${survey.title}`);
    console.log(`✅ ID: ${surveyId}`);
    console.log('═'.repeat(70));
    console.log('');

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
