import { prisma } from '@/lib/prisma';
import { SurveyForm } from '@/components/admin/SurveyForm';
import { notFound } from 'next/navigation';

export default async function EditSurveyPage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch survey with all related data
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: {
      scale: true,
      questions: {
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  });

  if (!survey) {
    notFound();
  }

  // Fetch scales and categories for the form
  const scalesRaw = await prisma.scale.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const categoriesRaw = await prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });

  // Transform scales to match expected type
  const scales = scalesRaw.map((scale) => ({
    ...scale,
    labels: (scale.labels as Record<string, string>) || {},
  }));

  // Transform categories to match expected type (convert Decimal to number)
  const categories = categoriesRaw.map((category) => ({
    ...category,
    weight: category.weight.toNumber(),
  }));

  // Transform survey to match expected type (convert null to undefined)
  const surveyData = survey
    ? {
        ...survey,
        description: survey.description ?? undefined,
      }
    : undefined;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Survey</h1>
        <p className="mt-2 text-sm text-gray-600">
          Modify survey details and manage questions
        </p>
      </div>

      <SurveyForm scales={scales} categories={categories} survey={surveyData} />
    </div>
  );
}
