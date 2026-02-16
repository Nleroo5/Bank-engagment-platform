import { prisma } from '../src/lib/prisma/index.js';

async function fix() {
  console.log('🔧 Manually fixing LTE scale assignment...\n');

  const lte = await prisma.survey.findFirst({
    where: { surveyType: 'likert5', title: { contains: 'Leadership' } },
  });

  const scale = await prisma.scale.findFirst({
    where: { scaleType: 'likert5', name: 'Likert 5-Point' },
  });

  if (!lte || !scale) {
    console.error('❌ Survey or scale not found');
    return;
  }

  console.log('Before:');
  console.log('  Survey:', lte.title);
  console.log('  ScaleId:', lte.scaleId || 'null');

  await prisma.survey.update({
    where: { id: lte.id },
    data: { scaleId: scale.id },
  });

  const updated = await prisma.survey.findUnique({
    where: { id: lte.id },
    include: { scale: true },
  });

  console.log('\nAfter:');
  console.log('  Survey:', updated?.title);
  console.log('  ScaleId:', updated?.scaleId);
  console.log('  Scale:', updated?.scale?.name);

  console.log('\n✅ LTE scale assignment fixed!');

  await prisma.$disconnect();
}

fix().catch(console.error);
