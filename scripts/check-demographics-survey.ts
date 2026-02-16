import { prisma } from '../src/lib/prisma/client';

async function checkSurvey() {
  const survey = await prisma.survey.findFirst({
    where: { surveyType: 'demographics' },
    include: {
      questions: {
        select: {
          id: true,
          questionNumber: true,
          text: true,
          isRequired: true,
          config: true,
        },
      },
      sections: {
        select: {
          id: true,
          title: true,
          sortOrder: true,
        },
      },
    },
  });

  console.log('Demographics Survey ID:', survey?.id);
  console.log('Survey Type:', survey?.surveyType);
  console.log('Total Questions:', survey?.questions.length);
  console.log(
    'Required Questions:',
    survey?.questions.filter((q) => q.isRequired).length
  );

  const questionsWithFieldType =
    survey?.questions.filter((q) => {
      const config = q.config as { fieldType?: string } | null;
      return config?.fieldType;
    }) || [];

  console.log(
    'Questions with fieldType (demographics fields):',
    questionsWithFieldType.length
  );

  if (questionsWithFieldType.length > 0) {
    console.log('\nDemographics Field Questions:');
    questionsWithFieldType.forEach((q) => {
      const config = q.config as { fieldType?: string } | null;
      console.log(
        `  - Q${q.questionNumber}: ${q.text} (fieldType: ${config?.fieldType})`
      );
    });
  }

  const regularQuestions =
    survey?.questions.filter((q) => {
      const config = q.config as { fieldType?: string } | null;
      return !config?.fieldType;
    }) || [];

  console.log(
    '\nRegular Survey Questions (non-demographics):',
    regularQuestions.length
  );

  if (regularQuestions.length > 0) {
    console.log('\nRegular Questions:');
    regularQuestions.slice(0, 5).forEach((q) => {
      console.log(`  - Q${q.questionNumber}: ${q.text.substring(0, 80)}...`);
    });
  }

  await prisma.$disconnect();
}

checkSurvey().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
