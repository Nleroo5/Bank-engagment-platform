import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus } from 'lucide-react';
import { SurveysTable } from '@/components/admin/SurveysTable';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function SurveysPage() {
  // Fetch all surveys with related data
  const surveys = await prisma.survey.findMany({
    include: {
      scale: true,
      _count: {
        select: {
          questions: true,
          campaigns: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage survey templates and questions
          </p>
        </div>
        <Link
          href="/admin/surveys/new"
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Survey
        </Link>
      </div>

      {/* Surveys Table */}
      {surveys.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No surveys yet</p>
          <Link
            href="/admin/surveys/new"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create your first survey
          </Link>
        </div>
      ) : (
        <SurveysTable surveys={surveys} />
      )}
    </div>
  );
}
