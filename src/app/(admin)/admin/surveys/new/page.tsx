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
  const categoriesRaw = await prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });

  // Transform scales: DB stores labels as [{ value, label }] array; form expects { "1": "...", "2": "..." }
  const scales = scalesRaw.map((scale) => {
    const raw = scale.labels;
    const labels: Record<string, string> = Array.isArray(raw)
      ? Object.fromEntries((raw as { value: number; label: string }[]).map((l) => [String(l.value), l.label]))
      : (raw as Record<string, string>) ?? {};
    return { ...scale, labels };
  });

  // Transform categories to match expected type (convert Decimal to number)
  const categories = categoriesRaw.map((category) => ({
    ...category,
    weight: category.weight.toNumber(),
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
