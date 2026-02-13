import { prisma } from '@/lib/prisma';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { notFound } from 'next/navigation';

export default async function EditQuestionPage({
  params,
}: {
  params: { id: string; questionId: string };
}) {
  // Fetch question with categories
  const question = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      survey: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!question) {
    notFound();
  }

  // Fetch all categories
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Question</h1>
        <p className="mt-2 text-sm text-gray-600">
          Modify question in {question.survey.title}
        </p>
      </div>

      <QuestionForm
        surveyId={params.id}
        categories={categories}
        question={question}
      />
    </div>
  );
}
