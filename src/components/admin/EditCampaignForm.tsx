'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, ImageIcon, X } from 'lucide-react';
import type { SurveyCampaign, Organization } from '@prisma/client';
import { parseSplashConfig } from '@/types/splash';
import type { SplashConfig } from '@/types/splash';

interface EditCampaignFormProps {
  campaign: SurveyCampaign & {
    organization: Organization;
  };
}

export function EditCampaignForm({ campaign }: EditCampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploadWarning, setLogoUploadWarning] = useState<string | null>(null);

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

  // Splash config state — pre-populate from existing campaign data
  const existingSplash = parseSplashConfig(campaign.splashConfig);
  const [splashOpen, setSplashOpen] = useState(false);
  const [splashData, setSplashData] = useState<Omit<SplashConfig, 'logoUrl'>>({
    bankName: existingSplash?.bankName ?? '',
    welcomeTitle: existingSplash?.welcomeTitle ?? '',
    welcomeMessage: existingSplash?.welcomeMessage ?? '',
    buttonText: existingSplash?.buttonText ?? '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Track the current saved URL (from existing campaign or new upload)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    existingSplash?.logoUrl ?? null
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setCurrentLogoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLogoUploadWarning(null);
    setIsSubmitting(true);

    try {
      // Upload new logo if one was selected
      let resolvedLogoUrl: string | null = currentLogoUrl;

      if (logoFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', logoFile);
        const uploadRes = await fetch('/api/upload/logo', {
          method: 'POST',
          body: uploadForm,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json() as { url?: unknown };
          if (typeof uploadData.url === 'string') {
            resolvedLogoUrl = uploadData.url;
          } else {
            setLogoUploadWarning('Logo upload returned an unexpected response. Other changes will be saved without the new logo.');
          }
        } else {
          const errData = await uploadRes.json().catch(() => ({})) as { error?: unknown };
          const msg = typeof errData.error === 'string' ? errData.error : 'Logo upload failed.';
          setLogoUploadWarning(`${msg} Other changes will be saved without the new logo.`);
        }
      }

      // Build splashConfig — only include fields that have values
      const splashConfigPayload: SplashConfig = {};
      if (splashData.bankName) splashConfigPayload.bankName = splashData.bankName;
      if (resolvedLogoUrl) splashConfigPayload.logoUrl = resolvedLogoUrl;
      if (splashData.welcomeTitle) splashConfigPayload.welcomeTitle = splashData.welcomeTitle;
      if (splashData.welcomeMessage) splashConfigPayload.welcomeMessage = splashData.welcomeMessage;
      if (splashData.buttonText) splashConfigPayload.buttonText = splashData.buttonText;
      const hasSplashConfig = Object.keys(splashConfigPayload).length > 0;

      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          reminderDays: parseInt(formData.reminderDays, 10),
          splashConfig: hasSplashConfig ? splashConfigPayload : null,
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

  // Determine what to show for the logo preview in the right-side card
  const previewLogoSrc = logoPreview ?? currentLogoUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {logoUploadWarning && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{logoUploadWarning}</p>
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

      {/* Splash Page Editor */}
      <div className="rounded-lg border border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setSplashOpen(!splashOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-expanded={splashOpen}
        >
          <div>
            <span className="font-medium text-gray-900">
              Welcome Screen Branding
            </span>
            {existingSplash?.logoUrl && (
              <span className="ml-2 text-sm text-green-600">✓ Logo saved</span>
            )}
            {!existingSplash?.logoUrl && (
              <span className="ml-2 text-sm text-gray-500">(Optional)</span>
            )}
          </div>
          {splashOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
          )}
        </button>

        {splashOpen && (
          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left: Fields */}
              <div className="space-y-4">
                {/* Bank Name */}
                <div>
                  <label
                    htmlFor="splashBankName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Bank / Organization Name
                  </label>
                  <input
                    type="text"
                    id="splashBankName"
                    value={splashData.bankName}
                    onChange={(e) =>
                      setSplashData({ ...splashData, bankName: e.target.value })
                    }
                    placeholder={campaign.organization.name}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Shown below the logo on the welcome screen
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label
                    htmlFor="splashLogo"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Bank Logo
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    {previewLogoSrc ? (
                      <div className="relative h-14 w-28 overflow-hidden rounded border border-gray-200 bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewLogoSrc}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute right-0.5 top-0.5 rounded-full bg-gray-800/70 p-0.5 text-white hover:bg-gray-800"
                          aria-label="Remove logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-14 w-28 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-white">
                        <ImageIcon className="h-6 w-6 text-gray-300" aria-hidden="true" />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="splashLogo"
                        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500"
                      >
                        {previewLogoSrc ? 'Change logo' : 'Upload logo'}
                        <input
                          type="file"
                          id="splashLogo"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        JPG, PNG or WebP · max 2 MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Welcome Title */}
                <div>
                  <label
                    htmlFor="splashTitle"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Page Title
                  </label>
                  <input
                    type="text"
                    id="splashTitle"
                    value={splashData.welcomeTitle}
                    onChange={(e) =>
                      setSplashData({ ...splashData, welcomeTitle: e.target.value })
                    }
                    placeholder={campaign.surveyTitle}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Welcome Message */}
                <div>
                  <label
                    htmlFor="splashMessage"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Welcome Message
                  </label>
                  <textarea
                    id="splashMessage"
                    rows={3}
                    maxLength={500}
                    value={splashData.welcomeMessage}
                    onChange={(e) =>
                      setSplashData({ ...splashData, welcomeMessage: e.target.value })
                    }
                    placeholder="Briefly explain the purpose of this survey…"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.welcomeMessage?.length ?? 0} / 500
                  </p>
                </div>

                {/* Button Text */}
                <div>
                  <label
                    htmlFor="splashButton"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Start Button Text
                  </label>
                  <input
                    type="text"
                    id="splashButton"
                    value={splashData.buttonText}
                    onChange={(e) =>
                      setSplashData({ ...splashData, buttonText: e.target.value })
                    }
                    placeholder="Begin Survey"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="hidden lg:block">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Preview
                </p>
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  {/* Logo */}
                  <div className="mb-4 flex justify-center">
                    {previewLogoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewLogoSrc}
                        alt="Logo"
                        className="h-12 w-auto max-w-[160px] object-contain"
                      />
                    ) : (
                      <div className="flex h-12 w-32 items-center justify-center rounded bg-gray-100">
                        <span className="text-xs text-gray-400">Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Bank name */}
                  {splashData.bankName && (
                    <p className="mb-2 text-center text-xs text-gray-500">
                      {splashData.bankName}
                    </p>
                  )}

                  {/* Title */}
                  <h3 className="mb-2 text-center text-base font-bold text-gray-900 line-clamp-2">
                    {splashData.welcomeTitle || campaign.surveyTitle}
                  </h3>

                  {/* Message */}
                  {splashData.welcomeMessage && (
                    <p className="mb-3 text-center text-xs text-gray-600 line-clamp-3">
                      {splashData.welcomeMessage}
                    </p>
                  )}

                  {/* Button */}
                  <div className="mt-3">
                    <div className="w-full rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white">
                      {splashData.buttonText || 'Begin Survey'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
