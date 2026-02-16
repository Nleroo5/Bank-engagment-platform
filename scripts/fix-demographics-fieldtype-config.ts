/**
 * Fix Demographics Survey - Populate FieldType in Config
 *
 * This script updates all demographics questions to include the correct
 * fieldType in their config JSON field, which is required for the
 * DemographicsField component to render correctly.
 *
 * Usage:
 *   npx tsx scripts/fix-demographics-fieldtype-config.ts
 */

import { prisma } from '../src/lib/prisma/index.js';

// Map of question text patterns to their correct fieldType
const FIELD_TYPE_MAPPINGS: Record<string, string> = {
  'Name of Bank': 'bankName',
  'Country': 'country',
  'State': 'state',
  'Metro': 'metroArea', // For "Metro City Area"
  'City': 'city',
  'Size of Bank': 'bankSize',
  'Device': 'device',
  'Employment Status': 'employmentStatus',
  'Gender': 'gender',
  'Time at': 'timeAtBank', // For "Time at Current Bank" or "Time at Bank"
  'Bank Experience': 'bankExperience',
  'Division': 'division',
  'Job Role': 'jobRole',
};

async function main() {
  console.log('🔧 Fixing Demographics Survey FieldType Configuration...\n');

  // Find the demographics survey
  const survey = await prisma.survey.findFirst({
    where: { surveyType: 'demographics' },
    include: {
      questions: {
        orderBy: { questionNumber: 'asc' },
      },
    },
  });

  if (!survey) {
    console.error('❌ No demographics survey found!');
    process.exit(1);
  }

  console.log(`📋 Survey: ${survey.title}`);
  console.log(`   Questions: ${survey.questions.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const updates: Array<{ questionNumber: number; text: string; fieldType: string }> = [];

  for (const question of survey.questions) {
    const config = (question.config || {}) as Record<string, any>;

    // Check if fieldType already exists
    if (config.fieldType) {
      console.log(`⏭️  Q${question.questionNumber}: ${question.text.substring(0, 40)}... → Already has fieldType: ${config.fieldType}`);
      skippedCount++;
      continue;
    }

    // Determine fieldType based on question text
    let fieldType: string | null = null;
    for (const [pattern, type] of Object.entries(FIELD_TYPE_MAPPINGS)) {
      if (question.text.includes(pattern)) {
        fieldType = type;
        break;
      }
    }

    if (!fieldType) {
      console.error(`❌ Q${question.questionNumber}: ${question.text} → Could not determine fieldType!`);
      continue;
    }

    // Update the config with fieldType
    const updatedConfig = {
      ...config,
      fieldType,
    };

    await prisma.question.update({
      where: { id: question.id },
      data: { config: updatedConfig },
    });

    updates.push({
      questionNumber: question.questionNumber,
      text: question.text,
      fieldType,
    });

    console.log(`✅ Q${question.questionNumber}: ${question.text.substring(0, 40)}... → Set fieldType: ${fieldType}`);
    updatedCount++;
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 UPDATE SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Questions updated: ${updatedCount}`);
  console.log(`⏭️  Questions skipped (already had fieldType): ${skippedCount}`);
  console.log(`📦 Total questions: ${survey.questions.length}`);
  console.log('═'.repeat(70));

  if (updates.length > 0) {
    console.log('\n📝 Updated Questions:');
    console.log('─'.repeat(70));
    updates.forEach((u) => {
      console.log(`   Q${u.questionNumber.toString().padStart(2, '0')}: ${u.text.substring(0, 50)} → ${u.fieldType}`);
    });
    console.log('─'.repeat(70));
  }

  console.log('\n✨ Demographics survey fieldType configuration fixed!');
  console.log('🔄 Please refresh any running surveys to see the changes.\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ ERROR:', error);
  if (error instanceof Error) {
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  }
  process.exit(1);
});
