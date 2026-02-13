/**
 * Find Survey References
 *
 * Find what documents reference a specific survey
 *
 * Usage:
 *   npx tsx scripts/find-survey-references.ts <SURVEY_ID>
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
    console.log(
      '\nUsage: npx tsx scripts/find-survey-references.ts <SURVEY_ID>'
    );
    process.exit(1);
  }

  console.log(`🔍 Finding References to Survey: ${surveyId}\n`);

  try {
    // Get the survey info
    const survey = await client.fetch(
      `*[_type == "survey" && _id == $surveyId][0] {
        _id,
        title
      }`,
      { surveyId }
    );

    if (!survey) {
      console.error(`❌ Survey not found: ${surveyId}`);
      process.exit(1);
    }

    console.log(`📋 Survey: ${survey.title}`);
    console.log(`   ID: ${surveyId}\n`);

    // Find all documents that reference this survey
    const references = await client.fetch(
      `*[references($surveyId)] {
        _id,
        _type,
        title,
        name,
        slug
      }`,
      { surveyId }
    );

    if (references.length === 0) {
      console.log('✅ No references found! Safe to delete.\n');
      process.exit(0);
    }

    console.log(
      `⚠️  Found ${references.length} document(s) referencing this survey:\n`
    );
    console.log('═'.repeat(70));

    for (const ref of references) {
      console.log(`📄 ${ref._type}`);
      console.log(`   ID: ${ref._id}`);
      if (ref.title) console.log(`   Title: ${ref.title}`);
      if (ref.name) console.log(`   Name: ${ref.name}`);
      if (ref.slug) console.log(`   Slug: ${ref.slug.current}`);
      console.log('');
    }

    console.log('═'.repeat(70));
    console.log('\n💡 To replace references, use:');
    console.log(
      '   npx tsx scripts/replace-survey-references.ts <OLD_ID> <NEW_ID>'
    );
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
