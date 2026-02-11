/**
 * Fix OTE Survey Scale References
 *
 * This script ensures all OTE (Operational Team Effectiveness) questions
 * have the correct 5-point Likert scale reference assigned.
 *
 * Usage:
 *   npx tsx scripts/fix-ote-scale.ts
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
  console.log('🔧 Starting OTE Survey Scale Fix...\n');

  try {
    // Step 1: Find the OTE survey
    console.log('📝 Step 1: Finding OTE survey...');
    const survey = await client.fetch(
      `*[_type == "survey" && slug.current == "operational-team-effectiveness"][0] {
        _id,
        title,
        sections[]-> {
          _id,
          title,
          questions[]-> {
            _id,
            number,
            text,
            scale
          }
        }
      }`
    );

    if (!survey) {
      console.error('❌ OTE survey not found!');
      console.log('   Run: npx tsx scripts/create-ote-survey.ts first');
      process.exit(1);
    }

    console.log(`   ✅ Found survey: ${survey.title}`);

    // Step 2: Get the 5-point Likert scale
    console.log('\n📊 Step 2: Finding 5-point Likert scale...');
    const scale = await client.fetch(
      `*[_type == "scale" && _id == "likert-5-point"][0]`
    );

    if (!scale) {
      console.error('❌ 5-point Likert scale not found!');
      console.log('   Run: npx tsx scripts/create-ote-survey.ts first');
      process.exit(1);
    }

    console.log(`   ✅ Found scale: ${scale.title}`);

    // Step 3: Check all questions
    console.log('\n🔍 Step 3: Checking questions for scale references...\n');

    let totalQuestions = 0;
    let questionsWithoutScale = 0;
    let questionsFixed = 0;
    const questionsToFix: Array<{ _id: string; number: number; text: string }> =
      [];

    for (const section of survey.sections) {
      if (!section.questions) continue;

      for (const question of section.questions) {
        totalQuestions++;

        const hasScale =
          question.scale && question.scale._ref === scale._id;

        if (!hasScale) {
          questionsWithoutScale++;
          questionsToFix.push({
            _id: question._id,
            number: question.number,
            text: question.text,
          });
          console.log(
            `   ⚠️  Question ${question.number}: Missing scale reference`
          );
        }
      }
    }

    if (questionsWithoutScale === 0) {
      console.log(`   ✅ All ${totalQuestions} questions have scale references!`);
      console.log('\n✨ No fixes needed - OTE survey is properly configured!');
      process.exit(0);
    }

    // Step 4: Fix questions
    console.log(
      `\n🔧 Step 4: Fixing ${questionsWithoutScale} questions...\n`
    );

    for (const question of questionsToFix) {
      try {
        await client
          .patch(question._id)
          .set({
            scale: {
              _type: 'reference',
              _ref: scale._id,
            },
          })
          .commit();

        questionsFixed++;
        console.log(
          `   ✅ Question ${question.number.toString().padStart(2, '0')}: Scale reference added`
        );
      } catch (error) {
        console.error(
          `   ❌ Question ${question.number}: Failed to update`,
          error
        );
      }
    }

    // Step 5: Verify fix
    console.log('\n✅ Step 5: Verifying fix...');

    const verifyQuestions = await client.fetch(
      `*[_type == "question" && references(*[_type == "survey" && slug.current == "operational-team-effectiveness"][0]._id)] {
        _id,
        number,
        scale
      }`
    );

    const stillMissing = verifyQuestions.filter(
      (q: any) => !q.scale || !q.scale._ref
    );

    if (stillMissing.length === 0) {
      console.log(`   ✅ Verification passed! All questions have scale references`);
    } else {
      console.warn(
        `   ⚠️  Warning: ${stillMissing.length} questions still missing scale`
      );
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FIX SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Total questions checked: ${totalQuestions}`);
    console.log(`⚠️  Questions missing scale: ${questionsWithoutScale}`);
    console.log(`✅ Questions fixed: ${questionsFixed}`);
    console.log(`✅ Questions still missing: ${stillMissing.length}`);
    console.log('═'.repeat(70));

    if (questionsFixed > 0) {
      console.log('\n✨ OTE survey scale references fixed successfully!');
      console.log(
        '📊 The report page should now work correctly for OTE surveys.\n'
      );
    }

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
