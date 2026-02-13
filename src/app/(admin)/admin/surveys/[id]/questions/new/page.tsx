import { prisma } from '@/lib/prisma';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { notFound } from 'next/navigation';

export default async function NewQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  // Verify survey exists
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
    },
  });

  if (!survey) {
    notFound();
  }

  // Get next question number
  const lastQuestion = await prisma.question.findFirst({
    where: { surveyId: params.id },
    orderBy: { questionNumber: 'desc' },
  });

  const nextQuestionNumber = (lastQuestion?.questionNumber ?? 0) + 1;

  // Fetch categories
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add Question</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new question to {survey.title}
        </p>
      </div>

      <QuestionForm
        surveyId={params.id}
        categories={categories}
        defaultQuestionNumber={nextQuestionNumber}
      />
    </div>
  );
}
