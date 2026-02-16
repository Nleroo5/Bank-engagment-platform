/**
 * Comprehensive Survey System Audit
 *
 * Checks all surveys for:
 * - Existence and basic configuration
 * - Question counts and numbering
 * - Category mappings
 * - Scale configurations
 * - Reverse scoring setup
 * - Field types (demographics)
 * - Loadability via getSurveyById
 */

import { prisma } from '../src/lib/prisma/index.js';
import { getSurveyById } from '../src/lib/surveys/queries.js';

interface AuditResult {
  surveyId: string;
  surveyTitle: string;
  surveyType: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  issues: string[];
  details: {
    questionCount: number;
    hasScale: boolean;
    scaleType?: string;
    hasCategories: boolean;
    hasReversedQuestions: boolean;
    reversedCount?: number;
    loadable: boolean;
  };
}

async function auditSurvey(survey: any): Promise<AuditResult> {
  const result: AuditResult = {
    surveyId: survey.id,
    surveyTitle: survey.title,
    surveyType: survey.surveyType,
    status: 'PASS',
    issues: [],
    details: {
      questionCount: 0,
      hasScale: false,
      hasCategories: true,
      hasReversedQuestions: false,
      loadable: false,
    },
  };

  try {
    // Fetch full survey with relations
    const fullSurvey = await prisma.survey.findUnique({
      where: { id: survey.id },
      include: {
        scale: true,
        questions: {
          include: {
            categories: {
              include: { category: true },
            },
          },
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!fullSurvey) {
      result.status = 'FAIL';
      result.issues.push('Survey not found in database');
      return result;
    }

    // Check question count
    result.details.questionCount = fullSurvey.questions.length;
    if (fullSurvey.questions.length === 0) {
      result.status = 'FAIL';
      result.issues.push('Survey has no questions');
      return result;
    }

    // Check scale
    if (fullSurvey.scale) {
      result.details.hasScale = true;
      result.details.scaleType = fullSurvey.scale.scaleType;
    } else {
      // Only fail if not demographics (demographics doesn't need a scale)
      if (survey.surveyType !== 'demographics') {
        result.status = 'FAIL';
        result.issues.push('Survey missing scale configuration');
      }
    }

    // Check categories for each question
    let questionsWithoutCategories = 0;
    let reversedQuestions = 0;
    const questionNumbers = new Set<number>();

    for (const question of fullSurvey.questions) {
      // Check for duplicate question numbers
      if (questionNumbers.has(question.questionNumber)) {
        result.status = 'FAIL';
        result.issues.push(`Duplicate question number: ${question.questionNumber}`);
      }
      questionNumbers.add(question.questionNumber);

      // Check categories
      if (question.categories.length === 0) {
        questionsWithoutCategories++;
      }

      // Check reverse scoring
      if (question.isReversed) {
        reversedQuestions++;
      }

      // For demographics, check fieldType
      if (survey.surveyType === 'demographics') {
        const config = question.config as any;
        if (!config?.fieldType) {
          if (result.status !== 'FAIL') result.status = 'WARNING';
          result.issues.push(`Q${question.questionNumber} missing fieldType`);
        }
      }
    }

    if (questionsWithoutCategories > 0) {
      result.status = 'FAIL';
      result.issues.push(
        `${questionsWithoutCategories} question(s) without category mappings`
      );
      result.details.hasCategories = false;
    }

    if (reversedQuestions > 0) {
      result.details.hasReversedQuestions = true;
      result.details.reversedCount = reversedQuestions;
    }

    // Test if survey loads via getSurveyById
    try {
      const loadedSurvey = await getSurveyById(survey.id);
      if (loadedSurvey) {
        result.details.loadable = true;
      } else {
        result.status = 'FAIL';
        result.issues.push('getSurveyById returned null');
      }
    } catch (error) {
      result.status = 'FAIL';
      result.issues.push(
        `getSurveyById error: ${(error as Error).message}`
      );
    }

    // Specific validations per survey type
    switch (survey.surveyType) {
      case 'demographics':
        if (result.details.questionCount !== 12) {
          if (result.status === 'PASS') result.status = 'WARNING';
          result.issues.push(
            `Expected 12 questions, found ${result.details.questionCount}`
          );
        }
        break;

      case 'likert5':
        if (result.details.scaleType !== 'likert5') {
          result.status = 'FAIL';
          result.issues.push(
            `Scale mismatch: survey type is likert5 but scale is ${result.details.scaleType}`
          );
        }
        break;

      case 'likert3':
      case 'managerial':
      case 'associate_180':
        if (result.details.scaleType !== 'likert3') {
          result.status = 'FAIL';
          result.issues.push(
            `Scale mismatch: survey type is ${survey.surveyType} but scale is ${result.details.scaleType}`
          );
        }
        break;
    }

    // Check for reverse scoring in managerial and associate_180
    if (
      (survey.surveyType === 'managerial' ||
        survey.surveyType === 'associate_180') &&
      !result.details.hasReversedQuestions
    ) {
      if (result.status === 'PASS') result.status = 'WARNING';
      result.issues.push(
        'Expected reverse-scored questions but found none'
      );
    }
  } catch (error) {
    result.status = 'FAIL';
    result.issues.push(`Audit error: ${(error as Error).message}`);
  }

  return result;
}

async function main() {
  console.log('🔍 COMPREHENSIVE SURVEY SYSTEM AUDIT');
  console.log('═'.repeat(80));
  console.log('');

  // Fetch all surveys
  const surveys = await prisma.survey.findMany({
    orderBy: [{ surveyNumber: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      surveyType: true,
      surveyNumber: true,
      status: true,
    },
  });

  console.log(`📋 Found ${surveys.length} surveys in database\n`);

  const results: AuditResult[] = [];
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;

  // Audit each survey
  for (const survey of surveys) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Auditing: ${survey.title} (${survey.surveyType})`);
    console.log(`${'─'.repeat(80)}`);

    const result = await auditSurvey(survey);
    results.push(result);

    // Display result
    const statusIcon =
      result.status === 'PASS'
        ? '✅'
        : result.status === 'WARNING'
          ? '⚠️'
          : '❌';
    console.log(`\n${statusIcon} Status: ${result.status}`);

    console.log(`\n📈 Details:`);
    console.log(`   Questions: ${result.details.questionCount}`);
    console.log(`   Scale: ${result.details.hasScale ? result.details.scaleType : 'None'}`);
    console.log(
      `   Categories: ${result.details.hasCategories ? 'All mapped' : 'Missing mappings'}`
    );
    console.log(
      `   Reverse Scoring: ${result.details.hasReversedQuestions ? `${result.details.reversedCount} questions` : 'None'}`
    );
    console.log(
      `   Loadable: ${result.details.loadable ? 'Yes' : 'No'}`
    );

    if (result.issues.length > 0) {
      console.log(`\n⚠️  Issues Found:`);
      result.issues.forEach((issue) => console.log(`   - ${issue}`));
    } else {
      console.log(`\n✨ No issues found`);
    }

    // Update counts
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'WARNING') warningCount++;
    else failCount++;
  }

  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 AUDIT SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTotal Surveys: ${surveys.length}`);
  console.log(`✅ Pass: ${passCount}`);
  console.log(`⚠️  Warning: ${warningCount}`);
  console.log(`❌ Fail: ${failCount}`);

  // List critical failures
  const criticalFailures = results.filter((r) => r.status === 'FAIL');
  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    console.log('─'.repeat(80));
    criticalFailures.forEach((result) => {
      console.log(`\n❌ ${result.surveyTitle} (${result.surveyType})`);
      result.issues.forEach((issue) => console.log(`   - ${issue}`));
    });
  }

  // List warnings
  const warnings = results.filter((r) => r.status === 'WARNING');
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    console.log('─'.repeat(80));
    warnings.forEach((result) => {
      console.log(`\n⚠️  ${result.surveyTitle} (${result.surveyType})`);
      result.issues.forEach((issue) => console.log(`   - ${issue}`));
    });
  }

  // Overall health
  console.log('\n' + '═'.repeat(80));
  if (failCount === 0 && warningCount === 0) {
    console.log('✅ OVERALL STATUS: ALL SYSTEMS OPERATIONAL');
    console.log('   All surveys are properly configured and ready to use.');
  } else if (failCount === 0) {
    console.log('⚠️  OVERALL STATUS: OPERATIONAL WITH WARNINGS');
    console.log('   Surveys are functional but some issues should be addressed.');
  } else {
    console.log('❌ OVERALL STATUS: CRITICAL ISSUES DETECTED');
    console.log('   Some surveys have critical issues that need immediate attention.');
  }
  console.log('═'.repeat(80));
  console.log('');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ AUDIT SCRIPT ERROR:', error);
  process.exit(1);
});
