'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SurveyCampaign } from '@prisma/client';
import { Edit2, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface CampaignHeaderActionsProps {
  campaign: SurveyCampaign;
}

export function CampaignHeaderActions({
  campaign,
}: CampaignHeaderActionsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }

      // Redirect to campaigns list after successful deletion
      router.push('/admin/campaigns');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
      // Keep dialog open to show error
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Edit Button - Primary action */}
        <Link
          href={`/admin/campaigns/${campaign.id}/edit`}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </Link>

        {/* Delete Button - Destructive action */}
        <button
          onClick={() => setIsDeleteDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setError(null);
        }}
        onConfirm={handleDelete}
        title="Delete Campaign?"
        message={`Are you sure you want to delete "${campaign.surveyTitle}"? This action cannot be undone. ${
          campaign.status === 'ACTIVE'
            ? 'Active campaigns with invitations cannot be deleted. Consider archiving instead.'
            : ''
        }`}
        confirmLabel="Delete Campaign"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
