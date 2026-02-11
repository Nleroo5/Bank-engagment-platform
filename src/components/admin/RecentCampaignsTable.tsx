'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import type { SurveyCampaign, Organization, Invitation } from '@prisma/client';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';

type CampaignWithRelations = SurveyCampaign & {
  organization: Organization;
  invitations: Pick<Invitation, 'id'>[];
  _count: {
    invitations: number;
  };
};

interface RecentCampaignsTableProps {
  campaigns: CampaignWithRelations[];
}

export function RecentCampaignsTable({ campaigns }: RecentCampaignsTableProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    campaign: CampaignWithRelations | null;
  }>({ isOpen: false, campaign: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const getResponseRate = (completedCount: number, totalCount: number) => {
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    campaign: CampaignWithRelations
  ) => {
    e.preventDefault();
    e.stopPropagation();
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
        throw new Error(error.error || 'Failed to delete campaign');
      }

      // Close dialog and refresh the page
      setDeleteDialog({ isOpen: false, campaign: null });
      router.refresh();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to delete campaign'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, campaign: null });
  };

  const getDeleteConsequences = (campaign: CampaignWithRelations) => {
    const completedCount = campaign.invitations.length;
    const consequences = [];

    if (campaign._count.invitations > 0) {
      consequences.push(
        `Remove access for ${campaign._count.invitations} respondent${campaign._count.invitations === 1 ? '' : 's'}`
      );
    }

    if (completedCount > 0) {
      consequences.push(
        `Archive ${completedCount} completed response${completedCount === 1 ? '' : 's'}`
      );
    }

    consequences.push('Hide all associated reports');

    return consequences;
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Survey
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Response Rate
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {campaigns.map((campaign) => {
              const totalInvitations = campaign._count.invitations;
              const completedCount = campaign.invitations.length;
              const responseRate = getResponseRate(
                completedCount,
                totalInvitations
              );

              return (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {campaign.surveyTitle}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {campaign.organization.name}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        campaign.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-800'
                            : campaign.status === 'DRAFT'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {responseRate}%
                      </div>
                      <div className="ml-2 w-16">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-primary-600"
                            style={{ width: `${responseRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/campaigns/${campaign.id}`}
                        className="inline-flex items-center text-primary-600 hover:text-primary-900"
                      >
                        View
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                      <button
                        onClick={(e) => handleDeleteClick(e, campaign)}
                        className="text-red-600 hover:text-red-900"
                        aria-label={`Delete ${campaign.surveyTitle}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteDialog.campaign && (
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Campaign?"
          itemName={deleteDialog.campaign.surveyTitle}
          consequences={getDeleteConsequences(deleteDialog.campaign)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
