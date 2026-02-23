'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileBarChart, Users, Calendar, Trash2 } from 'lucide-react';
import type {
  SurveyCampaign,
  Organization,
  AnonymousResponse,
} from '@prisma/client';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';

type CampaignWithRelations = SurveyCampaign & {
  organization: Organization;
  anonymousResponses: AnonymousResponse[];
  _count: {
    anonymousResponses: number;
  };
};

interface ReportsGridProps {
  campaigns: CampaignWithRelations[];
}

export function ReportsGrid({ campaigns }: ReportsGridProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    campaign: CampaignWithRelations | null;
  }>({ isOpen: false, campaign: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (
    e: React.MouseEvent,
    campaign: CampaignWithRelations
  ) => {
    e.preventDefault();
    setDeleteDialog({ isOpen: true, campaign });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.campaign) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/campaigns/${deleteDialog.campaign.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete report');
      }

      setDeleteDialog({ isOpen: false, campaign: null });
      router.refresh();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, campaign: null });
  };

  const getDeleteConsequences = (campaign: CampaignWithRelations) => {
    const completedCount = campaign.anonymousResponses.length;
    const totalRespondents = campaign._count.anonymousResponses;
    const consequences = [];

    if (totalRespondents > 0) {
      consequences.push(
        `Remove access for ${totalRespondents} respondent${totalRespondents === 1 ? '' : 's'}`
      );
    }

    if (completedCount > 0) {
      consequences.push(
        `Archive ${completedCount} completed response${completedCount === 1 ? '' : 's'}`
      );
    }

    consequences.push('Hide this report permanently');

    return consequences;
  };

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <FileBarChart className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No reports available
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Complete a campaign to view its report.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/campaigns"
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            View Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const completedCount = campaign.anonymousResponses.length;
          const totalInvitations = campaign._count.anonymousResponses;

          const responseRate =
            totalInvitations > 0
              ? Math.round((completedCount / totalInvitations) * 100)
              : 0;

          return (
            <div
              key={campaign.id}
              className="group relative block rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                href={`/admin/reports/${campaign.id}`}
                className="block p-6"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <h3 className="font-semibold text-gray-900">
                      {campaign.surveyTitle}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {campaign.organization.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      campaign.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="mr-2 h-4 w-4" />
                    <span>
                      {completedCount} / {totalInvitations} responses
                    </span>
                    <span className="ml-2 font-medium text-primary-600">
                      ({responseRate}%)
                    </span>
                  </div>

                  {campaign.endDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>
                        Ended{' '}
                        {new Date(campaign.endDate).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">View Report</span>
                    <span className="text-primary-600">→</span>
                  </div>
                </div>
              </Link>

              {/* Delete button overlay */}
              <button
                onClick={(e) => handleDeleteClick(e, campaign)}
                className="absolute right-4 top-4 rounded-md p-2 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                aria-label={`Delete ${campaign.surveyTitle} report`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {deleteDialog.campaign && (
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Report?"
          itemName={deleteDialog.campaign.surveyTitle}
          consequences={getDeleteConsequences(deleteDialog.campaign)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
