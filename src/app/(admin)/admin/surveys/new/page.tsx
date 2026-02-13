import { prisma } from '@/lib/prisma';
import { SurveyForm } from '@/components/admin/SurveyForm';

export default async function NewSurveyPage() {
  // Fetch available scales for the form
  const scalesRaw = await prisma.scale.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch categories for question assignment
  const categories = await prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });

  // Transform scales to match expected type
  const scales = scalesRaw.map((scale) => ({
    ...scale,
    labels: (scale.labels as Record<string, string>) || {},
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Survey</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new survey template to your library
        </p>
      </div>

      <SurveyForm scales={scales} categories={categories} />
    </div>
  );
}
