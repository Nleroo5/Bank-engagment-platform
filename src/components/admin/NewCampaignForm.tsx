'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Organization } from '@prisma/client';
import type { SurveyListItem } from '@/types/survey';

interface NewCampaignFormProps {
  organizations: Organization[];
  surveys: SurveyListItem[];
}

export function NewCampaignForm({
  organizations,
  surveys,
}: NewCampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surveyId: '',
    organizationId: '',
    startDate: '',
    endDate: '',
    reminderDays: '3',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const data = await response.json();
      router.push(`/admin/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const selectedSurvey = surveys.find((s) => s._id === formData.surveyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Survey Selection */}
      <div>
        <label
          htmlFor="surveyId"
          className="block text-sm font-medium text-gray-700"
        >
          Survey
        </label>
        <select
          id="surveyId"
          required
          value={formData.surveyId}
          onChange={(e) =>
            setFormData({ ...formData, surveyId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select a survey</option>
          {surveys.map((survey) => (
            <option key={survey._id} value={survey._id}>
              {survey.title}
              {survey.surveyNumber && ` (Survey ${survey.surveyNumber})`}
            </option>
          ))}
        </select>
        {selectedSurvey && (
          <p className="mt-1 text-sm text-gray-500">
            Type: {selectedSurvey.surveyType} • Estimated time:{' '}
            {selectedSurvey.estimatedMinutes || 'N/A'} minutes
          </p>
        )}
      </div>

      {/* Organization Selection */}
      <div>
        <label
          htmlFor="organizationId"
          className="block text-sm font-medium text-gray-700"
        >
          Organization
        </label>
        <select
          id="organizationId"
          required
          value={formData.organizationId}
          onChange={(e) =>
            setFormData({ ...formData, organizationId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select an organization</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
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
          Send reminder emails this many days before the campaign ends (default: 3)
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.push('/admin/campaigns')}
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
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
