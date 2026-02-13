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
    isAnonymous: false,
    accessCode: '',
    maxResponses: '',
  });

  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [checkingAccessCode, setCheckingAccessCode] = useState(false);

  // Check access code availability
  const checkAccessCode = async (code: string) => {
    if (!code || code.length < 6) {
      setAccessCodeError(null);
      return;
    }

    setCheckingAccessCode(true);
    setAccessCodeError(null);

    try {
      const response = await fetch(
        `/api/campaigns/check-access-code?accessCode=${encodeURIComponent(code)}`
      );
      const data = await response.json();

      if (!data.available) {
        setAccessCodeError('This access code is already in use');
      }
    } catch (err) {
      console.error('Error checking access code:', err);
    } finally {
      setCheckingAccessCode(false);
    }
  };

  const handleAccessCodeChange = (value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setFormData({ ...formData, accessCode: normalized });

    // Debounce access code check
    setTimeout(() => checkAccessCode(normalized), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate anonymous survey fields
    if (formData.isAnonymous) {
      if (!formData.accessCode || formData.accessCode.length < 6) {
        setError('Access code must be at least 6 characters');
        return;
      }
      if (accessCodeError) {
        setError('Please fix the access code error before submitting');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        surveyId: formData.surveyId,
        organizationId: formData.organizationId,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        reminderDays: parseInt(formData.reminderDays),
        isAnonymous: formData.isAnonymous,
        ...(formData.isAnonymous && {
          accessCode: formData.accessCode,
          maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : null,
        }),
      };

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      {/* Anonymous Survey Option */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={formData.isAnonymous}
              onChange={(e) =>
                setFormData({ ...formData, isAnonymous: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="isAnonymous" className="font-medium text-gray-700">
              Anonymous Survey
            </label>
            <p className="text-sm text-gray-500">
              Use public link with access code instead of personalized email invitations.
              Responses cannot be traced to individuals.
            </p>
          </div>
        </div>

        {/* Access Code Field (shown only when anonymous) */}
        {formData.isAnonymous && (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="accessCode"
                className="block text-sm font-medium text-gray-700"
              >
                Access Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accessCode"
                required
                minLength={6}
                maxLength={20}
                value={formData.accessCode}
                onChange={(e) => handleAccessCodeChange(e.target.value)}
                placeholder="e.g., BANK2024"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono uppercase focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {checkingAccessCode && (
                <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
              )}
              {accessCodeError && (
                <p className="mt-1 text-sm text-red-600">{accessCodeError}</p>
              )}
              {!accessCodeError && formData.accessCode.length >= 6 && !checkingAccessCode && (
                <p className="mt-1 text-sm text-green-600">✓ Access code is available</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                6-20 alphanumeric characters (automatically converted to uppercase)
              </p>
            </div>

            <div>
              <label
                htmlFor="maxResponses"
                className="block text-sm font-medium text-gray-700"
              >
                Maximum Responses (Optional)
              </label>
              <input
                type="number"
                id="maxResponses"
                min="1"
                value={formData.maxResponses}
                onChange={(e) =>
                  setFormData({ ...formData, maxResponses: e.target.value })
                }
                placeholder="Leave blank for unlimited"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Survey will close after this many completed responses
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reminder Days (only for non-anonymous) */}
      {!formData.isAnonymous && (
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
      )}

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
          disabled={isSubmitting || (formData.isAnonymous && !!accessCodeError)}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
