'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Edit } from 'lucide-react';
import type { Survey, Scale } from '@prisma/client';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { useRouter } from 'next/navigation';

type SurveyWithRelations = Survey & {
  scale: Scale | null;
  _count: {
    questions: number;
    campaigns: number;
  };
};

interface SurveysTableProps {
  surveys: SurveyWithRelations[];
}

export function SurveysTable({ surveys }: SurveysTableProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    survey: SurveyWithRelations | null;
  }>({ isOpen: false, survey: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'ARCHIVED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteClick = (survey: SurveyWithRelations) => {
    setDeleteDialog({ isOpen: true, survey });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.survey) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/surveys/${deleteDialog.survey.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete survey');
      }

      // Close dialog and refresh the page
      setDeleteDialog({ isOpen: false, survey: null });
      router.refresh();
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete survey');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, survey: null });
  };

  const getDeleteConsequences = (survey: SurveyWithRelations) => {
    const consequences = [];

    if (survey._count.questions > 0) {
      consequences.push(
        `Delete ${survey._count.questions} question${survey._count.questions === 1 ? '' : 's'}`
      );
    }

    if (survey._count.campaigns > 0) {
      consequences.push(
        `Affect ${survey._count.campaigns} campaign${survey._count.campaigns === 1 ? '' : 's'} using this survey`
      );
    }

    consequences.push('This action cannot be undone');

    return consequences;
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Survey Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {surveys.map((survey) => (
              <tr key={survey.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <Link
                      href={`/admin/surveys/${survey.id}/edit`}
                      className="block truncate font-medium text-gray-900 hover:text-primary-600"
                      title={survey.title}
                    >
                      {survey.title}
                    </Link>
                    {survey.surveyNumber && (
                      <p className="text-xs text-gray-500">
                        {survey.surveyNumber}
                      </p>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {survey.scale?.name || survey.surveyType}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {survey._count.questions}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {survey._count.campaigns}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      survey.status
                    )}`}
                  >
                    {survey.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  v{survey.version}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/surveys/${survey.id}/edit`}
                      className="text-primary-600 hover:text-primary-900"
                      aria-label={`Edit ${survey.title}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(survey)}
                      className="text-red-600 hover:text-red-900"
                      aria-label={`Delete ${survey.title}`}
                      disabled={survey._count.campaigns > 0}
                      title={
                        survey._count.campaigns > 0
                          ? 'Cannot delete survey used in campaigns'
                          : 'Delete survey'
                      }
                    >
                      <Trash2
                        className={`h-4 w-4 ${
                          survey._count.campaigns > 0
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {deleteDialog.survey && (
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Survey?"
          itemName={deleteDialog.survey.title}
          consequences={getDeleteConsequences(deleteDialog.survey)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
