/**
 * Question-Category Mapping Verification Script
 *
 * This script verifies that all questions in the Managerial Assessment survey
 * are mapped to the correct categories as defined in the scoring matrix.
 *
 * Usage:
 *   npx tsx scripts/verify-question-mappings.ts
 *
 * This is a READ-ONLY script - it will not modify any data.
 */

import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Expected mappings from scoring matrix reference document
const EXPECTED_MAPPINGS: { [category: string]: number[] } = {
  Communication: [6, 13, 20, 26],
  Leadership: [1, 7, 14, 21, 27, 33, 35],
  Culture: [8, 15, 28],
  Accountability: [2, 9, 16, 22, 29, 34],
  Execution: [3, 10, 17, 23, 30],
  Associate: [4, 11, 18, 24, 31],
  'Team Dynamics': [5, 12, 19, 25, 32],
};

const TOTAL_EXPECTED_QUESTIONS = 35;
const SURVEY_SLUG = 'managerial-assessment'; // Adjust if different

interface Question {
  _id: string;
  number: number;
  text: string;
  categoryName: string;
  isReversed: boolean;
}

interface CategorySummary {
  name: string;
  expectedQuestions: number[];
  actualQuestions: number[];
  weight?: number;
}

async function main() {
  console.log('🔍 Starting question-category mapping verification...\n');

  // Validate environment
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

  if (!projectId) {
    console.error('❌ ERROR: NEXT_PUBLIC_SANITY_PROJECT_ID not found');
    process.exit(1);
  }

  console.log(`📡 Connecting to Sanity project: ${projectId}`);
  console.log(`📦 Dataset: ${dataset}\n`);

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: false,
  });

  try {
    // Fetch the Managerial Assessment survey with all questions
    console.log(`🔎 Fetching survey: "${SURVEY_SLUG}"...`);

    const survey = await client.fetch(
      `*[_type == "survey" && slug.current == $slug][0]{
        _id,
        title,
        surveyNumber,
        "questions": sections[]->questions[]->{
          _id,
          number,
          text,
          "categoryName": category->name,
          "categoryWeight": category->weight,
          isReversed
        }
      }`,
      { slug: SURVEY_SLUG }
    );

    if (!survey) {
      console.error(`❌ ERROR: Survey "${SURVEY_SLUG}" not found in Sanity.`);
      console.error(
        '   Please ensure the survey exists or update the SURVEY_SLUG constant.'
      );
      process.exit(1);
    }

    console.log(
      `✅ Found survey: ${survey.title} (Survey ${survey.surveyNumber || 'N/A'})`
    );
    console.log(`📝 Total questions found: ${survey.questions.length}\n`);

    if (survey.questions.length !== TOTAL_EXPECTED_QUESTIONS) {
      console.warn(
        `⚠️  WARNING: Expected ${TOTAL_EXPECTED_QUESTIONS} questions, found ${survey.questions.length}\n`
      );
    }

    // Build actual mappings from Sanity data
    const actualMappings: { [category: string]: number[] } = {};
    const questionsByNumber: { [num: number]: Question } = {};

    survey.questions.forEach((q: Question) => {
      if (!actualMappings[q.categoryName]) {
        actualMappings[q.categoryName] = [];
      }
      actualMappings[q.categoryName]!.push(q.number);
      questionsByNumber[q.number] = q;
    });

    // Sort question numbers in each category
    Object.keys(actualMappings).forEach((cat) => {
      actualMappings[cat]!.sort((a, b) => a - b);
    });

    // Compare expected vs actual
    console.log('═'.repeat(80));
    console.log('📊 CATEGORY MAPPING VERIFICATION');
    console.log('═'.repeat(80));

    let hasErrors = false;
    const categorySummaries: CategorySummary[] = [];

    for (const [categoryName, expectedQuestions] of Object.entries(
      EXPECTED_MAPPINGS
    )) {
      const actualQuestions = actualMappings[categoryName] || [];
      const isMatch =
        expectedQuestions.length === actualQuestions.length &&
        expectedQuestions.every((q) => actualQuestions.includes(q));

      categorySummaries.push({
        name: categoryName,
        expectedQuestions: [...expectedQuestions],
        actualQuestions,
      });

      console.log(`\n${categoryName}`);
      console.log('─'.repeat(80));
      console.log(
        `Expected (${expectedQuestions.length}): [${expectedQuestions.join(', ')}]`
      );
      console.log(
        `Actual   (${actualQuestions.length}): [${actualQuestions.join(', ')}]`
      );

      if (isMatch) {
        console.log('Status: ✅ MATCH');
      } else {
        console.log('Status: ❌ MISMATCH');
        hasErrors = true;

        // Show differences
        const missing = expectedQuestions.filter(
          (q) => !actualQuestions.includes(q)
        );
        const extra = actualQuestions.filter(
          (q) => !expectedQuestions.includes(q)
        );

        if (missing.length > 0) {
          console.log(`  Missing: [${missing.join(', ')}]`);
        }
        if (extra.length > 0) {
          console.log(`  Extra: [${extra.join(', ')}]`);
        }
      }
    }

    // Check for orphaned questions (not in any expected category)
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 ORPHANED QUESTIONS CHECK');
    console.log('═'.repeat(80));

    const allExpectedQuestions = Object.values(EXPECTED_MAPPINGS).flat();
    const orphanedQuestions = survey.questions
      .filter((q: Question) => !allExpectedQuestions.includes(q.number))
      .map((q: Question) => ({ number: q.number, category: q.categoryName }));

    if (orphanedQuestions.length > 0) {
      console.log('⚠️  Found questions not in expected mappings:');
      orphanedQuestions.forEach((q: { number: number; category: string }) => {
        console.log(`  - Q${q.number} (currently in "${q.category}")`);
      });
      hasErrors = true;
    } else {
      console.log('✅ No orphaned questions found');
    }

    // Check for missing questions
    const actualQuestionNumbers = survey.questions
      .map((q: Question) => q.number)
      .sort((a, b) => a - b);
    const missingQuestionNumbers = allExpectedQuestions.filter(
      (num) => !actualQuestionNumbers.includes(num)
    );

    if (missingQuestionNumbers.length > 0) {
      console.log('\n⚠️  Missing question numbers from survey:');
      console.log(`  [${missingQuestionNumbers.join(', ')}]`);
      hasErrors = true;
    }

    // Check for duplicate question numbers
    const duplicates = actualQuestionNumbers.filter(
      (num, index) => actualQuestionNumbers.indexOf(num) !== index
    );
    if (duplicates.length > 0) {
      console.log('\n⚠️  Duplicate question numbers found:');
      console.log(`  [${[...new Set(duplicates)].join(', ')}]`);
      hasErrors = true;
    }

    // Reverse-scored questions summary
    console.log('\n' + '═'.repeat(80));
    console.log('🔄 REVERSE-SCORED QUESTIONS');
    console.log('═'.repeat(80));

    const reversedQuestions = survey.questions
      .filter((q: Question) => q.isReversed)
      .map((q: Question) => ({ number: q.number, category: q.categoryName }))
      .sort((a, b) => a.number - b.number);

    if (reversedQuestions.length > 0) {
      console.log(
        `Found ${reversedQuestions.length} reverse-scored questions:`
      );
      reversedQuestions.forEach((q: { number: number; category: string }) => {
        console.log(`  - Q${q.number} (${q.category})`);
      });
    } else {
      console.log(
        'ℹ️  No reverse-scored questions found (verify this is correct for Survey 6)'
      );
    }

    // Final summary
    console.log('\n' + '═'.repeat(80));
    console.log('📋 FINAL SUMMARY');
    console.log('═'.repeat(80));

    if (hasErrors) {
      console.log('❌ VERIFICATION FAILED - Issues found (see details above)');
      console.log('\n📝 Action Required:');
      console.log('   1. Review the mismatches above');
      console.log('   2. Update question-category references in Sanity Studio');
      console.log('   3. Re-run this script to verify fixes');
      process.exit(1);
    } else {
      console.log('✅ ALL VERIFICATIONS PASSED');
      console.log('   - All questions mapped to correct categories');
      console.log('   - No orphaned or missing questions');
      console.log('   - No duplicate question numbers');
      console.log('\n🎉 Survey is ready for weighted scoring implementation!');
      process.exit(0);
    }
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
