/**
 * Fix Existing Surveys Script
 *
 * Updates existing survey documents in Sanity to:
 * - Add isActive: true field
 * - Generate slugs from titles
 * - Ensure all fields match updated schema
 *
 * Usage:
 *   npx tsx scripts/fix-existing-surveys.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

/**
 * Generate a slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

async function fixExistingSurveys() {
  console.log('🔧 Starting survey fix script...\n');

  console.log(
    '📡 Connecting to Sanity project:',
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  );
  console.log(
    '📦 Dataset:',
    process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  );
  console.log('');

  try {
    // Fetch all surveys
    console.log('📋 Fetching all surveys...');
    const surveys = await client.fetch(`*[_type == "survey"] {
      _id,
      title,
      slug,
      isActive,
      surveyType,
      surveyNumber
    }`);

    if (surveys.length === 0) {
      console.log('   ⚠️  No surveys found in Sanity');
      return;
    }

    console.log(`   ✅ Found ${surveys.length} surveys\n`);

    // Process each survey
    for (const survey of surveys) {
      console.log(
        `\n📝 Processing: ${survey.title} (Survey ${survey.surveyNumber})`
      );

      const updates: any = {};
      let needsUpdate = false;

      // Check and add isActive field
      if (survey.isActive === undefined || survey.isActive === null) {
        updates.isActive = true;
        needsUpdate = true;
        console.log('   ✏️  Adding isActive: true');
      } else {
        console.log(`   ✓ isActive already set: ${survey.isActive}`);
      }

      // Check and generate slug
      if (!survey.slug || !survey.slug.current) {
        const slugValue = generateSlug(survey.title);
        updates.slug = {
          _type: 'slug',
          current: slugValue,
        };
        needsUpdate = true;
        console.log(`   ✏️  Generating slug: ${slugValue}`);
      } else {
        console.log(`   ✓ Slug already exists: ${survey.slug.current}`);
      }

      // Apply updates if needed
      if (needsUpdate) {
        await client.patch(survey._id).set(updates).commit();
        console.log('   ✅ Survey updated successfully');
      } else {
        console.log('   ✓ No updates needed');
      }
    }

    console.log('\n');
    console.log(
      '══════════════════════════════════════════════════════════════════════'
    );
    console.log('✅ SURVEY FIX SUMMARY');
    console.log(
      '══════════════════════════════════════════════════════════════════════'
    );
    console.log(`Total surveys processed: ${surveys.length}`);
    console.log('');
    console.log('All surveys should now:');
    console.log('  ✓ Have isActive: true field');
    console.log('  ✓ Have valid slugs');
    console.log('  ✓ Appear in campaign creation dropdown');
    console.log(
      '══════════════════════════════════════════════════════════════════════\n'
    );
  } catch (error) {
    console.error('❌ Error fixing surveys:', error);
    throw error;
  }
}

// Run the script
fixExistingSurveys()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
