'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SurveyCampaign } from '@prisma/client';
import { Play, Archive } from 'lucide-react';

interface CampaignActionsProps {
  campaign: SurveyCampaign;
}

export function CampaignActions({ campaign }: CampaignActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = async () => {
    if (
      !confirm(
        'Activate this campaign? This will make it available to respondents.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate campaign');
      }

      setSuccess('Campaign activated successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCampaign = async () => {
    if (
      !confirm(
        'Close this campaign? This will set the status to COMPLETED and stop accepting new responses.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close campaign');
      }

      setSuccess('Campaign closed successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Activate Button - Only for DRAFT campaigns */}
        {campaign.status === 'DRAFT' && (
          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Activate Campaign
          </button>
        )}

        {/* Close Campaign - Only for ACTIVE campaigns */}
        {campaign.status === 'ACTIVE' && (
          <button
            onClick={handleCloseCampaign}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            Close Campaign
          </button>
        )}

        {/* No actions for COMPLETED or ARCHIVED campaigns */}
        {(campaign.status === 'COMPLETED' ||
          campaign.status === 'ARCHIVED') && (
          <p className="text-sm text-gray-500">
            No actions available for {campaign.status.toLowerCase()} campaigns
          </p>
        )}
      </div>
    </div>
  );
}
