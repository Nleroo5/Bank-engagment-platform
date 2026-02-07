/**
 * Sanity Category Weights Population Script
 *
 * This script ensures all 7 categories in Sanity have the correct weight values
 * as defined in the Managerial Assessment scoring matrix.
 *
 * Usage:
 *   npx ts-node scripts/populate-category-weights.ts
 *
 * Or with tsx:
 *   npx tsx scripts/populate-category-weights.ts
 *
 * Prerequisites:
 *   - SANITY_API_TOKEN must be set in .env with write permissions
 *   - Categories must already exist in Sanity (this script updates, doesn't create)
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Category weights from scoring matrix reference document
const CATEGORY_WEIGHTS = {
  'Communication': 1.75,
  'Leadership': 1.0,
  'Culture': 2.3,
  'Accountability': 1.7,
  'Execution': 1.4,
  'Associate': 1.4,
  'Team Dynamics': 1.4,
} as const;

// Expected sort order for reports
const CATEGORY_SORT_ORDER = {
  'Communication': 1,
  'Leadership': 2,
  'Culture': 3,
  'Accountability': 4,
  'Execution': 5,
  'Associate': 6,
  'Team Dynamics': 7,
} as const;

interface SanityCategory {
  _id: string;
  _type: 'category';
  name: string;
  weight?: number;
  sortOrder?: number;
  colorCode?: string;
  description?: string;
}

async function main() {
  console.log('🚀 Starting category weights population script...\n');

  // Validate environment
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId) {
    console.error('❌ ERROR: NEXT_PUBLIC_SANITY_PROJECT_ID not found in environment variables');
    process.exit(1);
  }

  if (!token) {
    console.error('❌ ERROR: SANITY_API_TOKEN not found in environment variables');
    console.error('   This script requires a token with WRITE permissions.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Sanity project: ${projectId}`);
  console.log(`📦 Dataset: ${dataset}\n`);

  // Create client with write permissions
  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token,
    useCdn: false, // Don't use CDN for writes
  });

  try {
    // Fetch all existing categories
    console.log('🔍 Fetching existing categories from Sanity...');
    const categories = await client.fetch<SanityCategory[]>(
      `*[_type == "category"] | order(name asc) {
        _id,
        _type,
        name,
        weight,
        sortOrder,
        colorCode,
        description
      }`
    );

    if (categories.length === 0) {
      console.error('❌ ERROR: No categories found in Sanity.');
      console.error('   Please create the 7 categories first, then run this script to set weights.');
      process.exit(1);
    }

    console.log(`✅ Found ${categories.length} existing categories\n`);

    // Display current state
    console.log('📋 Current category state:');
    console.log('─'.repeat(70));
    categories.forEach((cat: SanityCategory) => {
      const currentWeight = cat.weight ? `×${cat.weight}` : 'NOT SET';
      const sortOrder = cat.sortOrder !== undefined ? cat.sortOrder : 'NOT SET';
      console.log(`  ${cat.name.padEnd(20)} | Weight: ${currentWeight.padEnd(10)} | Sort: ${sortOrder}`);
    });
    console.log('─'.repeat(70));
    console.log();

    // Update each category with correct weight and sort order
    console.log('🔄 Updating categories with correct weights...\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let missingCategories: string[] = [];

    for (const [categoryName, expectedWeight] of Object.entries(CATEGORY_WEIGHTS)) {
      const category = categories.find((c) => c.name === categoryName);

      if (!category) {
        console.warn(`⚠️  Category "${categoryName}" not found in Sanity - skipping`);
        missingCategories.push(categoryName);
        continue;
      }

      const expectedSortOrder = CATEGORY_SORT_ORDER[categoryName as keyof typeof CATEGORY_SORT_ORDER];
      const needsUpdate =
        category.weight !== expectedWeight ||
        category.sortOrder !== expectedSortOrder;

      if (!needsUpdate) {
        console.log(`✓ ${categoryName.padEnd(20)} | Already correct (×${expectedWeight}, sort: ${expectedSortOrder})`);
        skippedCount++;
        continue;
      }

      // Update the category
      await client
        .patch(category._id)
        .set({
          weight: expectedWeight,
          sortOrder: expectedSortOrder,
        })
        .commit();

      console.log(
        `✓ ${categoryName.padEnd(20)} | Updated to ×${expectedWeight} (sort: ${expectedSortOrder})`
      );
      updatedCount++;
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Categories updated: ${updatedCount}`);
    console.log(`⏭️  Categories skipped (already correct): ${skippedCount}`);

    if (missingCategories.length > 0) {
      console.log(`⚠️  Missing categories: ${missingCategories.length}`);
      console.log('\n   The following categories need to be created in Sanity:');
      missingCategories.forEach((name: string) => {
        const weight = CATEGORY_WEIGHTS[name as keyof typeof CATEGORY_WEIGHTS];
        const sortOrder = CATEGORY_SORT_ORDER[name as keyof typeof CATEGORY_SORT_ORDER];
        console.log(`   - ${name} (weight: ${weight}, sortOrder: ${sortOrder})`);
      });
    }

    console.log('═'.repeat(70));

    if (missingCategories.length > 0) {
      console.log('\n⚠️  ATTENTION: Some categories are missing. Please create them in Sanity Studio.');
      process.exit(1);
    } else {
      console.log('\n🎉 SUCCESS! All category weights are now correctly configured.');
      process.exit(0);
    }

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
