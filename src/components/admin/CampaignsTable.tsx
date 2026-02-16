'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { SurveyCampaign, Organization, Invitation, AnonymousResponse } from '@prisma/client';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { useRouter } from 'next/navigation';

type CampaignWithRelations = SurveyCampaign & {
  organization: Organization;
  invitations: Invitation[];
  anonymousResponses: AnonymousResponse[];
  _count: {
    invitations: number;
    anonymousResponses: number;
  };
};

interface CampaignsTableProps {
  campaigns: CampaignWithRelations[];
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    campaign: CampaignWithRelations | null;
  }>({ isOpen: false, campaign: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const getResponseRate = (campaign: CampaignWithRelations) => {
    // Count completed tracked invitations
    const completedTracked = campaign.invitations.length; // Already filtered to completed in query

    // Count completed anonymous responses
    const completedAnonymous = campaign.anonymousResponses.length; // Already filtered to completed in query

    // Total completed
    const completedCount = completedTracked + completedAnonymous;

    // Total invitations/responses
    const totalTracked = campaign._count.invitations;
    const totalAnonymous = campaign._count.anonymousResponses;
    const totalCount = totalTracked + totalAnonymous;

    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ARCHIVED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteClick = (campaign: CampaignWithRelations) => {
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
    const completedTracked = campaign.invitations.length; // Already filtered to completed
    const completedAnonymous = campaign.anonymousResponses.length; // Already filtered to completed
    const completedCount = completedTracked + completedAnonymous;
    const totalInvitations = campaign._count.invitations;
    const totalResponses = totalInvitations + campaign._count.anonymousResponses;
    const consequences = [];

    if (totalResponses > 0) {
      consequences.push(
        `Remove access for ${totalResponses} respondent${totalResponses === 1 ? '' : 's'}`
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Survey Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Response Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {campaigns.map((campaign) => {
              const responseRate = getResponseRate(campaign);
              return (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {campaign.surveyTitle}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {campaign.organization.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        campaign.status
                      )}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {campaign.startDate
                      ? new Date(campaign.startDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {campaign.endDate
                      ? new Date(campaign.endDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${responseRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {responseRate}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/campaigns/${campaign.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(campaign)}
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
