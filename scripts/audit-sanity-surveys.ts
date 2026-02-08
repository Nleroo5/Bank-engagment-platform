/**
 * Audit Sanity Surveys Script
 *
 * Comprehensive audit to verify:
 * - All surveys have required fields (isActive, slug)
 * - All questions have valid category references
 * - All sections are properly linked to surveys
 * - Schema matches what scripts created
 *
 * Usage:
 *   npx tsx scripts/audit-sanity-surveys.ts
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

async function auditSanitySurveys() {
  console.log('🔍 Starting comprehensive Sanity survey audit...\n');

  console.log(
    '📡 Connecting to Sanity project:',
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  );
  console.log(
    '📦 Dataset:',
    process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  );
  console.log('');

  const issues: string[] = [];
  const warnings: string[] = [];
  let surveyCount = 0;
  let questionCount = 0;
  let sectionCount = 0;

  try {
    // Audit 1: Check all surveys
    console.log('📋 AUDIT 1: Surveys');
    console.log(
      '─────────────────────────────────────────────────────────────\n'
    );

    const surveys =
      await client.fetch(`*[_type == "survey"] | order(surveyNumber asc) {
      _id,
      title,
      slug,
      surveyNumber,
      surveyType,
      isActive,
      estimatedMinutes,
      description,
      requiresManagerName,
      anonymityRequired,
      minimumRespondents,
      "sectionCount": count(sections)
    }`);

    surveyCount = surveys.length;

    for (const survey of surveys) {
      const surveyLabel = `Survey ${survey.surveyNumber}: ${survey.title}`;
      console.log(`📝 ${surveyLabel}`);

      // Check slug
      if (!survey.slug || !survey.slug.current) {
        issues.push(`${surveyLabel} - Missing slug`);
        console.log('   ❌ Missing slug');
      } else {
        console.log(`   ✅ Slug: ${survey.slug.current}`);
      }

      // Check isActive
      if (survey.isActive === undefined || survey.isActive === null) {
        issues.push(`${surveyLabel} - Missing isActive field`);
        console.log('   ❌ Missing isActive field');
      } else {
        console.log(`   ✅ isActive: ${survey.isActive}`);
      }

      // Check surveyType
      const validTypes = [
        'demographics',
        'likert5',
        'likert3',
        'managerial',
        'ote',
        'associate_180',
      ];
      if (!validTypes.includes(survey.surveyType)) {
        issues.push(
          `${surveyLabel} - Invalid surveyType: ${survey.surveyType}`
        );
        console.log(`   ❌ Invalid surveyType: ${survey.surveyType}`);
      } else {
        console.log(`   ✅ surveyType: ${survey.surveyType}`);
      }

      // Check sections
      if (survey.sectionCount === 0) {
        warnings.push(`${surveyLabel} - No sections linked`);
        console.log('   ⚠️  No sections linked');
      } else {
        console.log(`   ✅ Sections: ${survey.sectionCount}`);
      }

      console.log('');
    }

    // Audit 2: Check all sections
    console.log('\n📑 AUDIT 2: Sections');
    console.log(
      '─────────────────────────────────────────────────────────────\n'
    );

    const sections =
      await client.fetch(`*[_type == "section"] | order(_createdAt asc) {
      _id,
      title,
      order,
      sortOrder,
      description,
      directions,
      "questionCount": count(questions)
    }`);

    sectionCount = sections.length;

    for (const section of sections) {
      console.log(`📄 ${section.title}`);

      // Check order/sortOrder
      const orderValue = section.order || section.sortOrder;
      if (orderValue === undefined) {
        warnings.push(`Section "${section.title}" - Missing order/sortOrder`);
        console.log('   ⚠️  Missing order/sortOrder');
      } else {
        console.log(`   ✅ Order: ${orderValue}`);
      }

      // Check questions
      if (section.questionCount === 0) {
        warnings.push(`Section "${section.title}" - No questions linked`);
        console.log('   ⚠️  No questions linked');
      } else {
        console.log(`   ✅ Questions: ${section.questionCount}`);
      }

      console.log('');
    }

    // Audit 3: Check all questions
    console.log('\n❓ AUDIT 3: Questions');
    console.log(
      '─────────────────────────────────────────────────────────────\n'
    );

    const questions =
      await client.fetch(`*[_type == "question"] | order(questionNumber asc, number asc) {
      _id,
      questionNumber,
      number,
      questionText,
      text,
      "categoryName": category->name,
      "categoryId": category->_id,
      isReversed,
      isRequired
    }`);

    questionCount = questions.length;

    let reversedCount = 0;
    let missingCategoryCount = 0;

    for (const question of questions) {
      const qNum = question.questionNumber || question.number;
      const qText = question.questionText || question.text;
      const truncatedText = qText
        ? qText.substring(0, 50) + (qText.length > 50 ? '...' : '')
        : 'NO TEXT';

      // Check category
      if (!question.categoryId) {
        missingCategoryCount++;
        issues.push(`Question ${qNum} - Missing category reference`);
        console.log(`Q${qNum}: ❌ Missing category - ${truncatedText}`);
      } else if (question.isReversed) {
        reversedCount++;
        console.log(`Q${qNum}: ${question.categoryName} [REVERSED]`);
      }
    }

    console.log(`\n   Total questions: ${questionCount}`);
    console.log(`   Reversed questions: ${reversedCount}`);
    if (missingCategoryCount > 0) {
      console.log(
        `   ❌ Questions missing categories: ${missingCategoryCount}`
      );
    }

    // Audit 4: Check categories
    console.log('\n\n📂 AUDIT 4: Categories');
    console.log(
      '─────────────────────────────────────────────────────────────\n'
    );

    const categories =
      await client.fetch(`*[_type == "category"] | order(sortOrder asc, name asc) {
      _id,
      name,
      weight,
      colorCode,
      sortOrder
    }`);

    for (const category of categories) {
      console.log(`📁 ${category.name}`);
      console.log(`   Weight: ${category.weight || '1.0'}`);
      console.log(`   Color: ${category.colorCode || 'None'}`);
      console.log(
        `   Sort Order: ${category.sortOrder !== undefined ? category.sortOrder : 'Not set'}`
      );
    }

    // Final Summary
    console.log(
      '\n\n══════════════════════════════════════════════════════════════════════'
    );
    console.log('📊 AUDIT SUMMARY');
    console.log(
      '══════════════════════════════════════════════════════════════════════'
    );
    console.log(`Total Surveys: ${surveyCount}`);
    console.log(`Total Sections: ${sectionCount}`);
    console.log(`Total Questions: ${questionCount}`);
    console.log(`Total Categories: ${categories.length}`);
    console.log('');

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ No issues found! Everything looks good.');
    } else {
      if (issues.length > 0) {
        console.log(`❌ CRITICAL ISSUES (${issues.length}):`);
        issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
        console.log('');
      }

      if (warnings.length > 0) {
        console.log(`⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
        console.log('');
      }
    }

    console.log(
      '══════════════════════════════════════════════════════════════════════'
    );

    // Test campaign creation query
    console.log('\n\n🧪 TEST: Campaign Creation Query');
    console.log(
      '─────────────────────────────────────────────────────────────\n'
    );

    const activeSurveys =
      await client.fetch(`*[_type == "survey" && isActive == true] | order(surveyNumber asc) {
      _id,
      title,
      slug,
      surveyNumber,
      isActive
    }`);

    console.log(`Active surveys found: ${activeSurveys.length}`);
    for (const survey of activeSurveys) {
      console.log(`   ✅ Survey ${survey.surveyNumber}: ${survey.title}`);
    }

    if (activeSurveys.length === 0) {
      console.log(
        '   ❌ No active surveys found! This will prevent campaign creation.'
      );
    }
  } catch (error) {
    console.error('\n❌ Audit failed with error:', error);
    throw error;
  }
}

// Run the script
auditSanitySurveys()
  .then(() => {
    console.log('\n✅ Audit completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
