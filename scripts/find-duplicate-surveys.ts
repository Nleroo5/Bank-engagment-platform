/**
 * Find Duplicate Surveys
 *
 * This script finds any duplicate surveys in Sanity
 *
 * Usage:
 *   npx tsx scripts/find-duplicate-surveys.ts
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
  console.log('🔍 Finding Duplicate Surveys...\n');

  try {
    // Fetch all surveys
    const surveys = await client.fetch(
      `*[_type == "survey"] | order(title asc) {
        _id,
        _createdAt,
        title,
        slug,
        surveyNumber,
        surveyType,
        isActive
      }`
    );

    console.log(`📊 Total surveys found: ${surveys.length}\n`);

    // Group by title (case-insensitive)
    const groupedByTitle: Record<string, any[]> = {};

    for (const survey of surveys) {
      const normalizedTitle = survey.title.toLowerCase().trim();
      if (!groupedByTitle[normalizedTitle]) {
        groupedByTitle[normalizedTitle] = [];
      }
      groupedByTitle[normalizedTitle].push(survey);
    }

    // Find duplicates
    let duplicatesFound = false;

    console.log('═'.repeat(70));
    console.log('CHECKING FOR DUPLICATES');
    console.log('═'.repeat(70) + '\n');

    for (const [title, surveysWithTitle] of Object.entries(groupedByTitle)) {
      if (surveysWithTitle.length > 1) {
        duplicatesFound = true;
        console.log(
          `⚠️  DUPLICATE: "${title}" (${surveysWithTitle.length} entries)`
        );
        console.log('─'.repeat(70));

        surveysWithTitle.forEach((survey, index) => {
          const createdDate = new Date(survey._createdAt).toLocaleString();
          console.log(`   ${index + 1}. ID: ${survey._id}`);
          console.log(`      Title: ${survey.title}`);
          console.log(`      Slug: ${survey.slug?.current || 'No slug'}`);
          console.log(`      Type: ${survey.surveyType || 'Not set'}`);
          console.log(`      Active: ${survey.isActive ? 'Yes' : 'No'}`);
          console.log(`      Created: ${createdDate}`);
          console.log('');
        });
      }
    }

    if (!duplicatesFound) {
      console.log('✅ No duplicates found!\n');
      process.exit(0);
    }

    // Show all surveys for reference
    console.log('\n' + '═'.repeat(70));
    console.log('ALL SURVEYS');
    console.log('═'.repeat(70) + '\n');

    for (const survey of surveys) {
      console.log(`📋 ${survey.title}`);
      console.log(`   ID: ${survey._id}`);
      console.log(`   Slug: ${survey.slug?.current || 'No slug'}`);
      console.log(`   Type: ${survey.surveyType || 'Not set'}`);
      console.log(`   Active: ${survey.isActive ? 'Yes' : 'No'}`);
      console.log('');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('TO DELETE A DUPLICATE:');
    console.log('═'.repeat(70));
    console.log('Run: npx tsx scripts/delete-survey.ts <SURVEY_ID>');
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
