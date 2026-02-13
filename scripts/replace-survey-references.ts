/**
 * Replace Survey References
 *
 * Updates all references from old survey to new survey
 *
 * Usage:
 *   npx tsx scripts/replace-survey-references.ts <OLD_SURVEY_ID> <NEW_SURVEY_ID>
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
  const oldSurveyId = process.argv[2];
  const newSurveyId = process.argv[3];

  if (!oldSurveyId || !newSurveyId) {
    console.error('❌ ERROR: Both OLD and NEW survey IDs are required');
    console.log(
      '\nUsage: npx tsx scripts/replace-survey-references.ts <OLD_SURVEY_ID> <NEW_SURVEY_ID>'
    );
    process.exit(1);
  }

  console.log(`🔄 Replacing Survey References\n`);
  console.log(`   FROM: ${oldSurveyId}`);
  console.log(`   TO:   ${newSurveyId}\n`);

  try {
    // Get both surveys
    const [oldSurvey, newSurvey] = await Promise.all([
      client.fetch(
        `*[_type == "survey" && _id == $surveyId][0] { _id, title }`,
        { surveyId: oldSurveyId }
      ),
      client.fetch(
        `*[_type == "survey" && _id == $surveyId][0] { _id, title }`,
        { surveyId: newSurveyId }
      ),
    ]);

    if (!oldSurvey) {
      console.error(`❌ Old survey not found: ${oldSurveyId}`);
      process.exit(1);
    }

    if (!newSurvey) {
      console.error(`❌ New survey not found: ${newSurveyId}`);
      process.exit(1);
    }

    console.log(`📋 Old Survey: ${oldSurvey.title}`);
    console.log(`📋 New Survey: ${newSurvey.title}\n`);

    // Find all documents that reference the old survey
    const references = await client.fetch(
      `*[references($surveyId)] {
        _id,
        _type,
        title,
        survey
      }`,
      { surveyId: oldSurveyId }
    );

    if (references.length === 0) {
      console.log('✅ No references to update.\n');
      process.exit(0);
    }

    console.log(`🔄 Found ${references.length} document(s) to update:\n`);

    let updated = 0;
    let failed = 0;

    for (const ref of references) {
      try {
        console.log(`   Updating ${ref._type}: ${ref.title || ref._id}...`);

        await client
          .patch(ref._id)
          .set({
            survey: {
              _type: 'reference',
              _ref: newSurveyId,
            },
          })
          .commit();

        console.log(`   ✅ Updated successfully`);
        updated++;
      } catch (error) {
        console.error(`   ❌ Failed:`, error);
        failed++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📊 REPLACEMENT SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Documents updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('═'.repeat(70));

    if (failed === 0) {
      console.log('\n✨ All references updated successfully!');
      console.log(`\n💡 Now you can delete the old survey with:`);
      console.log(`   npx tsx scripts/delete-survey.ts ${oldSurveyId}`);
    }

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
