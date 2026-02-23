'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, ImageIcon, X } from 'lucide-react';
import type { Organization } from '@prisma/client';
import type { SurveyListItem } from '@/types/survey';
import type { SplashConfig, LogoSize, MessageAlignment } from '@/types/splash';

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
    organizationName: '', // For typing new organization names
    startDate: '',
    endDate: '',
    accessCode: '',
    maxResponses: '',
  });

  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [checkingAccessCode, setCheckingAccessCode] = useState(false);
  const accessCodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filteredOrganizations, setFilteredOrganizations] = useState(
    organizations
  );

  // Splash page editor state
  const [splashOpen, setSplashOpen] = useState(false);
  const [splashData, setSplashData] = useState<Omit<SplashConfig, 'logoUrl'>>({
    bankName: '',
    logoSize: 'md',
    welcomeTitle: '',
    welcomeMessage: '',
    welcomeMessageFontSize: 'lg',
    welcomeMessageAlignment: 'left',
    buttonText: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Handle logo file selection — show local preview immediately
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

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
    if (accessCodeDebounceRef.current) clearTimeout(accessCodeDebounceRef.current);
    accessCodeDebounceRef.current = setTimeout(() => checkAccessCode(normalized), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate access code
    if (!formData.accessCode || formData.accessCode.length < 6) {
      setError('Access code must be at least 6 characters');
      return;
    }
    if (accessCodeError) {
      setError('Please fix the access code error before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload logo if one was selected
      let logoUrl: string | undefined;
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
            logoUrl = uploadData.url;
          } else {
            setError('Logo upload returned an unexpected response. Please try again.');
            setIsSubmitting(false);
            return;
          }
        } else {
          const errData = await uploadRes.json().catch(() => ({})) as { error?: unknown };
          const msg = typeof errData.error === 'string' ? errData.error : 'Logo upload failed.';
          setError(`${msg} Please try again, or remove the logo to save without one.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Build splashConfig — only include fields that have values
      const splashConfigPayload: SplashConfig = {};
      if (splashData.bankName) splashConfigPayload.bankName = splashData.bankName;
      if (logoUrl) {
        splashConfigPayload.logoUrl = logoUrl;
        splashConfigPayload.logoSize = splashData.logoSize ?? 'md';
      }
      if (splashData.welcomeTitle) splashConfigPayload.welcomeTitle = splashData.welcomeTitle;
      if (splashData.welcomeMessage) {
        splashConfigPayload.welcomeMessage = splashData.welcomeMessage;
        splashConfigPayload.welcomeMessageFontSize = splashData.welcomeMessageFontSize ?? 'lg';
        splashConfigPayload.welcomeMessageAlignment = splashData.welcomeMessageAlignment ?? 'left';
      }
      if (splashData.buttonText) splashConfigPayload.buttonText = splashData.buttonText;
      const hasSplashConfig = Object.keys(splashConfigPayload).length > 0;

      const payload = {
        surveyId: formData.surveyId,
        organizationId: formData.organizationId || undefined,
        organizationName: formData.organizationId ? undefined : formData.organizationName,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        accessCode: formData.accessCode,
        maxResponses: formData.maxResponses
          ? parseInt(formData.maxResponses)
          : null,
        splashConfig: hasSplashConfig ? splashConfigPayload : null,
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

      {/* Organization Selection with Type-ahead */}
      <div>
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-gray-700"
        >
          Organization Name
        </label>
        <input
          type="text"
          id="organizationName"
          required
          list="organizations-list"
          value={formData.organizationName}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({ ...formData, organizationName: value });

            // Find matching organization
            const matchingOrg = organizations.find(
              (org) => org.name.toLowerCase() === value.toLowerCase()
            );
            if (matchingOrg) {
              setFormData({
                ...formData,
                organizationName: value,
                organizationId: matchingOrg.id,
              });
            } else {
              setFormData({
                ...formData,
                organizationName: value,
                organizationId: '',
              });
            }

            // Filter organizations for autocomplete
            setFilteredOrganizations(
              organizations.filter((org) =>
                org.name.toLowerCase().includes(value.toLowerCase())
              )
            );
          }}
          placeholder="Type to search or enter new organization"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <datalist id="organizations-list">
          {filteredOrganizations.map((org) => (
            <option key={org.id} value={org.name} />
          ))}
        </datalist>
        <p className="mt-1 text-sm text-gray-500">
          {formData.organizationId
            ? '✓ Existing organization selected'
            : formData.organizationName
            ? '⚠ Will create new organization'
            : 'Start typing to search existing organizations'}
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

      {/* Access Code */}
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
          <p className="mt-1 text-sm text-gray-500">
            Checking availability...
          </p>
        )}
        {accessCodeError && (
          <p className="mt-1 text-sm text-red-600">{accessCodeError}</p>
        )}
        {!accessCodeError &&
          formData.accessCode.length >= 6 &&
          !checkingAccessCode && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Access code is available
            </p>
          )}
        <p className="mt-1 text-sm text-gray-500">
          6-20 alphanumeric characters (automatically converted to uppercase).
          Respondents enter this code to access the survey.
        </p>
      </div>

      {/* Response Limit */}
      <div>
        <label
          htmlFor="maxResponses"
          className="block text-sm font-medium text-gray-700"
        >
          Maximum Total Responses (Optional)
        </label>
        <input
          type="number"
          id="maxResponses"
          min="1"
          value={formData.maxResponses}
          onChange={(e) =>
            setFormData({ ...formData, maxResponses: e.target.value })
          }
          placeholder="Unlimited"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          Campaign closes after this many completed responses
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
              Customize Welcome Screen
            </span>
            <span className="ml-2 text-sm text-gray-500">(Optional)</span>
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
                    placeholder={formData.organizationName || 'e.g. First National Bank'}
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
                    {logoPreview ? (
                      <div className="relative h-14 w-28 overflow-hidden rounded border border-gray-200 bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            if (logoPreview) URL.revokeObjectURL(logoPreview);
                            setLogoPreview(null);
                          }}
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
                        {logoFile ? 'Change logo' : 'Upload logo'}
                        <input
                          type="file"
                          id="splashLogo"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        JPG, PNG or WebP · max 4 MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logo Size */}
                {logoPreview && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      Logo size
                    </p>
                    <div className="flex overflow-hidden rounded-md border border-gray-300">
                      {(
                        [
                          { value: 'sm', label: 'Small' },
                          { value: 'md', label: 'Medium' },
                          { value: 'lg', label: 'Large' },
                        ] as const
                      ).map(({ value, label }, i) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSplashData({ ...splashData, logoSize: value as LogoSize })
                          }
                          aria-pressed={splashData.logoSize === value}
                          className={[
                            'flex flex-1 items-center justify-center py-1.5 text-xs transition-colors',
                            i > 0 ? 'border-l border-gray-300' : '',
                            splashData.logoSize === value
                              ? 'bg-primary-50 font-medium text-primary-700'
                              : 'bg-white text-gray-500 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                    placeholder={selectedSurvey?.title || 'Defaults to survey title'}
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
                    placeholder="Briefly explain the purpose of this survey and why participation matters…"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.welcomeMessage?.length ?? 0} / 500
                  </p>
                  {/* Font Size Picker */}
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      Message font size
                    </p>
                    <div className="flex overflow-hidden rounded-md border border-gray-300">
                      {(
                        [
                          { value: 'sm', label: 'Small', sampleClass: 'text-xs' },
                          { value: 'md', label: 'Medium', sampleClass: 'text-sm' },
                          { value: 'lg', label: 'Large', sampleClass: 'text-base' },
                          { value: 'xl', label: 'X-Large', sampleClass: 'text-lg' },
                        ] as const
                      ).map(({ value, label, sampleClass }, i) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSplashData({
                              ...splashData,
                              welcomeMessageFontSize: value,
                            })
                          }
                          aria-pressed={splashData.welcomeMessageFontSize === value}
                          className={[
                            'flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-colors',
                            i > 0 ? 'border-l border-gray-300' : '',
                            splashData.welcomeMessageFontSize === value
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-white text-gray-500 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <span className={`font-medium leading-none ${sampleClass}`}>
                            Aa
                          </span>
                          <span className="text-[10px] leading-none">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                  {/* Message Alignment */}
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      Text alignment
                    </p>
                    <div className="flex overflow-hidden rounded-md border border-gray-300">
                      {(
                        [
                          { value: 'left', label: 'Left', Icon: AlignLeft },
                          { value: 'center', label: 'Center', Icon: AlignCenter },
                          { value: 'right', label: 'Right', Icon: AlignRight },
                        ] as const
                      ).map(({ value, label, Icon }, i) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSplashData({
                              ...splashData,
                              welcomeMessageAlignment: value as MessageAlignment,
                            })
                          }
                          aria-pressed={splashData.welcomeMessageAlignment === value}
                          aria-label={label}
                          className={[
                            'flex flex-1 items-center justify-center py-1.5 transition-colors',
                            i > 0 ? 'border-l border-gray-300' : '',
                            splashData.welcomeMessageAlignment === value
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-white text-gray-500 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
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
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className={[
                          'w-auto max-w-[160px] object-contain',
                          splashData.logoSize === 'sm' ? 'h-6' :
                          splashData.logoSize === 'lg' ? 'h-14' :
                          'h-10',
                        ].join(' ')}
                      />
                    ) : (
                      <div className="flex h-10 w-32 items-center justify-center rounded bg-gray-100">
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
                    {splashData.welcomeTitle ||
                      selectedSurvey?.title ||
                      'Survey Title'}
                  </h3>

                  {/* Message */}
                  {splashData.welcomeMessage && (
                    <p
                      className={[
                        'mb-3 whitespace-pre-line text-gray-600 line-clamp-4',
                        splashData.welcomeMessageFontSize === 'sm' ? 'text-[10px]' :
                        splashData.welcomeMessageFontSize === 'md' ? 'text-[11px]' :
                        splashData.welcomeMessageFontSize === 'xl' ? 'text-sm' :
                        'text-xs',
                        splashData.welcomeMessageAlignment === 'center' ? 'text-center' :
                        splashData.welcomeMessageAlignment === 'right' ? 'text-right' :
                        'text-left',
                      ].join(' ')}
                    >
                      {splashData.welcomeMessage}
                    </p>
                  )}

                  {/* Estimated time placeholder */}
                  {selectedSurvey?.estimatedMinutes && (
                    <p className="mb-3 text-center text-xs text-gray-400">
                      ≈ {selectedSurvey.estimatedMinutes} min
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
          onClick={() => router.push('/admin/campaigns')}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !!accessCodeError}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
