import { prisma } from '@/lib/prisma';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { notFound } from 'next/navigation';

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { parentId?: string };
}) {
  // Verify survey exists
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      surveyType: true,
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

  // Check for parent question (sub-question creation)
  let parentQuestion: { id: string; questionNumber: number } | undefined;
  if (searchParams.parentId) {
    const parent = await prisma.question.findUnique({
      where: { id: searchParams.parentId },
      select: { id: true, questionNumber: true, surveyId: true },
    });
    if (parent && parent.surveyId === params.id) {
      parentQuestion = { id: parent.id, questionNumber: parent.questionNumber };
    }
  }

  const isSubQuestion = !!parentQuestion;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isSubQuestion ? 'Add Sub-Question' : 'Add Question'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isSubQuestion
            ? `Add a sub-question to Question ${parentQuestion!.questionNumber} in ${survey.title}`
            : `Add a new question to ${survey.title}`}
        </p>
      </div>

      <QuestionForm
        surveyId={params.id}
        surveyType={survey.surveyType}
        categories={categories}
        defaultQuestionNumber={nextQuestionNumber}
        parentQuestion={parentQuestion}
      />
    </div>
  );
}
