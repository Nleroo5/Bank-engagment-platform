/**
 * Backfill Script: Populate adjustedValue for Existing Responses
 *
 * This script processes all existing responses in the database and calculates
 * the adjustedValue based on whether the question is reverse-scored.
 *
 * Usage:
 *   npx tsx scripts/backfill-adjusted-values.ts
 *
 * Safety: This script is idempotent - it can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting adjustedValue backfill script...\n');

  try {
    // Initialize Sanity client
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

    if (!projectId) {
      throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID not found in environment');
    }

    const sanityClient = createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: false,
    });

    console.log('📊 Step 1: Fetching all questions from Sanity...');

    // Fetch all questions with their isReversed flags and scale info
    const questions = await sanityClient.fetch<
      Array<{
        _id: string;
        number: number;
        isReversed: boolean;
        scale: {
          min: number;
          max: number;
        };
      }>
    >(`
      *[_type == "question"] {
        _id,
        number,
        isReversed,
        "scale": *[_type == "survey" && references(^._id)][0].scale-> {
          min,
          max
        }
      }
    `);

    console.log(`   ✅ Found ${questions.length} questions\n`);

    // Build lookup map
    const questionMap = new Map(
      questions.map(
        (q: {
          _id: string;
          isReversed: boolean;
          scale?: { min: number; max: number } | null;
        }) => [
          q._id,
          {
            isReversed: q.isReversed,
            scaleMax: q.scale?.max || 3, // Default to 3 if not found
          },
        ]
      )
    );

    console.log('📋 Step 2: Fetching responses from database...');

    // Fetch all responses that need adjustment (where adjustedValue is null)
    const responses = await prisma.response.findMany({
      where: {
        value: { not: null },
        adjustedValue: null,
      },
      select: {
        id: true,
        questionId: true,
        value: true,
      },
    });

    console.log(`   ✅ Found ${responses.length} responses to process\n`);

    if (responses.length === 0) {
      console.log('✨ No responses need backfilling. All done!');
      return;
    }

    console.log('🔢 Step 3: Calculating adjusted values...\n');

    let processedCount = 0;
    let skippedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < responses.length; i += batchSize) {
      const batch = responses.slice(i, i + batchSize);

      const updates = batch.map(
        (response: {
          id: string;
          questionId: string;
          value: number | null;
        }) => {
          const questionInfo = questionMap.get(response.questionId);

          if (!questionInfo) {
            console.warn(
              `   ⚠️  Question not found: ${response.questionId} - skipping`
            );
            skippedCount++;
            return null;
          }

          const adjustedValue = questionInfo.isReversed
            ? questionInfo.scaleMax + 1 - response.value!
            : response.value!;

          return prisma.response.update({
            where: { id: response.id },
            data: { adjustedValue },
          });
        }
      );

      // Filter out nulls and execute batch
      const validUpdates = updates.filter((u) => u !== null);
      await Promise.all(validUpdates);

      processedCount += validUpdates.length;

      // Progress indicator
      const progress = Math.min(i + batchSize, responses.length);
      console.log(
        `   📈 Progress: ${progress}/${responses.length} responses processed`
      );
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📊 BACKFILL SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Responses processed: ${processedCount}`);
    console.log(`⏭️  Responses skipped: ${skippedCount}`);
    console.log(`📦 Total responses: ${responses.length}`);
    console.log('═'.repeat(70));

    if (skippedCount > 0) {
      console.log(
        '\n⚠️  Warning: Some responses were skipped due to missing question data.'
      );
      console.log('   This may indicate questions were deleted from Sanity.');
    }

    console.log('\n✨ Backfill completed successfully!');
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
