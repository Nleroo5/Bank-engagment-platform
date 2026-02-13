import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, FileText, Edit } from 'lucide-react';
import { DeleteSurveyButton } from '@/components/admin/DeleteSurveyButton';

export const dynamic = 'force-dynamic';

export default async function SurveysPage() {
  // Fetch all surveys with question count
  const surveys = await prisma.survey.findMany({
    include: {
      _count: {
        select: {
          questions: true,
          campaigns: true,
        },
      },
      scale: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Survey Management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create, edit, and manage survey templates
          </p>
        </div>
        <Link
          href="/admin/surveys/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Survey
        </Link>
      </div>

      {/* Surveys Table */}
      {surveys.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No surveys yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new survey template.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/surveys/new"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Survey
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Survey
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Campaigns
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {surveys.map((survey) => (
                <tr key={survey.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {survey.title}
                      </div>
                      {survey.description && (
                        <div className="text-sm text-gray-500">
                          {survey.description.substring(0, 60)}
                          {survey.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {survey.surveyNumber || survey.surveyType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {survey.scale?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {survey._count.questions}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {survey._count.campaigns}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        survey.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : survey.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {survey.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/surveys/${survey.id}/edit`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                      <DeleteSurveyButton
                        surveyId={survey.id}
                        surveyTitle={survey.title}
                        hasCampaigns={survey._count.campaigns > 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
