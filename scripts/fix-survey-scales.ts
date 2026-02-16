/**
 * Fix Survey Scale Assignments
 *
 * Assigns the correct scales to surveys that are missing them
 */

import { prisma } from '../src/lib/prisma/index.js';

async function main() {
  console.log('🔧 Fixing Survey Scale Assignments...\n');

  // Get scales
  const likert5Scale = await prisma.scale.findFirst({
    where: { scaleType: 'likert5', name: 'Likert 5-Point' },
  });

  const likert3Scale = await prisma.scale.findFirst({
    where: { scaleType: 'likert3', name: '3-Point Frequency Scale' },
  });

  if (!likert5Scale || !likert3Scale) {
    console.error('❌ Required scales not found in database');
    process.exit(1);
  }

  console.log('📋 Found scales:');
  console.log(`   Likert 5-Point: ${likert5Scale.id}`);
  console.log(`   3-Point Frequency: ${likert3Scale.id}\n`);

  const updates = [
    {
      name: 'Leadership Team Effectiveness (LTE)',
      type: 'likert5',
      scaleId: likert5Scale.id,
      scaleName: likert5Scale.name,
    },
    {
      name: 'Managerial Assessment',
      type: 'managerial',
      scaleId: likert3Scale.id,
      scaleName: likert3Scale.name,
    },
    {
      name: 'Associate 180° Assessment',
      type: 'associate_180',
      scaleId: likert3Scale.id,
      scaleName: likert3Scale.name,
    },
  ];

  let updatedCount = 0;

  for (const update of updates) {
    const survey = await prisma.survey.findFirst({
      where: {
        surveyType: update.type,
      },
    });

    if (!survey) {
      console.log(`⏭️  ${update.name}: Survey not found`);
      continue;
    }

    if (survey.scaleId) {
      console.log(`⏭️  ${update.name}: Already has scale assigned`);
      continue;
    }

    await prisma.survey.update({
      where: { id: survey.id },
      data: { scaleId: update.scaleId },
    });

    console.log(`✅ ${update.name}`);
    console.log(`   Assigned: ${update.scaleName}`);
    updatedCount++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 UPDATE SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Surveys updated: ${updatedCount}`);
  console.log(`📦 Total processed: ${updates.length}`);
  console.log('═'.repeat(70));

  if (updatedCount > 0) {
    console.log('\n✨ Survey scales fixed successfully!');
    console.log('🔄 Please re-run the audit to verify all surveys are working.\n');
  } else {
    console.log('\n✓ All surveys already have scales assigned.\n');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ ERROR:', error);
  process.exit(1);
});
