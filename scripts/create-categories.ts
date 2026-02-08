/**
 * Sanity Categories Creation Script
 *
 * Creates all 7 categories with proper names, colors, and descriptions
 * if they don't already exist.
 *
 * Usage:
 *   npx tsx scripts/create-categories.ts
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Category definitions with updated colors
const CATEGORIES = [
  {
    name: 'Communication',
    colorCode: '#3B82F6',
    description: 'Clarity, dialogue, and information sharing within the team',
    sortOrder: 1,
  },
  {
    name: 'Leadership',
    colorCode: '#8B5CF6',
    description: 'Authority, vision, and strategic direction',
    sortOrder: 2,
  },
  {
    name: 'Culture',
    colorCode: '#10B981',
    description: 'Organizational environment, values, and growth mindset',
    sortOrder: 3,
  },
  {
    name: 'Accountability',
    colorCode: '#F59E0B',
    description: 'Responsibility, ownership, and follow-through',
    sortOrder: 4,
  },
  {
    name: 'Execution',
    colorCode: '#EF4444',
    description: 'Action, results, and operational effectiveness',
    sortOrder: 5,
  },
  {
    name: 'Associate',
    colorCode: '#14B8A6',
    description: 'Support, connection, and team member development',
    sortOrder: 6,
  },
  {
    name: 'Team Dynamics',
    colorCode: '#EC4899',
    description:
      'Interpersonal relationships, collaboration, and group synergy',
    sortOrder: 7,
  },
] as const;

interface SanityCategory {
  _id: string;
  name: string;
}

async function main() {
  console.log('🚀 Starting category creation script...\n');

  // Validate environment
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId) {
    console.error('❌ ERROR: NEXT_PUBLIC_SANITY_PROJECT_ID not found');
    process.exit(1);
  }

  if (!token) {
    console.error('❌ ERROR: SANITY_API_TOKEN not found');
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
    useCdn: false,
  });

  try {
    // Check existing categories
    console.log('🔍 Checking for existing categories...');
    const existingCategories = await client.fetch<SanityCategory[]>(
      `*[_type == "category"] { _id, name }`
    );

    const existingNames = new Set(existingCategories.map((c) => c.name));
    console.log(`   Found ${existingCategories.length} existing categories\n`);

    // Create missing categories
    console.log('📝 Creating categories...\n');
    let createdCount = 0;
    let skippedCount = 0;

    for (const category of CATEGORIES) {
      if (existingNames.has(category.name)) {
        console.log(
          `⏭️  ${category.name.padEnd(20)} | Already exists - skipping`
        );
        skippedCount++;
        continue;
      }

      // Create the category document
      await client.create({
        _type: 'category',
        name: category.name,
        colorCode: category.colorCode,
        description: category.description,
        sortOrder: category.sortOrder,
        weight: 1.0, // Default weight, will be updated by populate-weights script
      });

      console.log(
        `✅ ${category.name.padEnd(20)} | Created with color ${category.colorCode}`
      );
      createdCount++;
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Categories created: ${createdCount}`);
    console.log(`⏭️  Categories skipped (already exist): ${skippedCount}`);
    console.log(`📦 Total categories: ${createdCount + skippedCount}`);
    console.log('═'.repeat(70));

    if (createdCount > 0) {
      console.log('\n✨ Success! Categories created in Sanity.');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: npm run sanity:populate-weights');
      console.log('   2. Create survey and questions in Sanity Studio');
      console.log('   3. Run: npm run sanity:verify-mappings');
    } else {
      console.log('\n✅ All categories already exist. Ready for next steps!');
    }

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
