'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SurveyCampaign, Organization } from '@prisma/client';

interface EditCampaignFormProps {
  campaign: SurveyCampaign & {
    organization: Organization;
  };
}

export function EditCampaignForm({ campaign }: EditCampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    status: campaign.status,
    startDate: campaign.startDate
      ? new Date(campaign.startDate).toISOString().split('T')[0]
      : '',
    endDate: campaign.endDate
      ? new Date(campaign.endDate).toISOString().split('T')[0]
      : '',
    reminderDays: campaign.reminderDays.toString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          reminderDays: parseInt(formData.reminderDays, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update campaign');
      }

      router.push(`/admin/campaigns/${campaign.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Campaign Info (Read-only) */}
      <div className="rounded-md bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">
          Campaign Information
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Survey: </span>
            <span className="text-gray-900">{campaign.surveyTitle}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Organization: </span>
            <span className="text-gray-900">{campaign.organization.name}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Survey and organization cannot be changed after creation
          </p>
        </div>
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
          Status
        </label>
        <select
          id="status"
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Change campaign status to control availability
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700"
          >
            Start Date (Optional)
          </label>
          <input
            type="date"
            id="startDate"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave blank for immediate availability
          </p>
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700"
          >
            End Date (Optional)
          </label>
          <input
            type="date"
            id="endDate"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave blank for no expiration
          </p>
        </div>
      </div>

      {/* Reminder Days */}
      <div>
        <label
          htmlFor="reminderDays"
          className="block text-sm font-medium text-gray-700"
        >
          Reminder Days Before End
        </label>
        <input
          type="number"
          id="reminderDays"
          min="1"
          max="30"
          required
          value={formData.reminderDays}
          onChange={(e) =>
            setFormData({ ...formData, reminderDays: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Send reminder emails this many days before the campaign ends
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
