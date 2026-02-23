'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, ImageIcon, X } from 'lucide-react';
import type { Organization } from '@prisma/client';
import type { SurveyListItem, Survey } from '@/types/survey';
import type { SplashConfig, MessageAlignment } from '@/types/splash';
import { WelcomeScreen } from '@/components/survey/WelcomeScreen';

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
    logoHeight: 64,
    welcomeTitle: '',
    titleFontSize: 30,
    titleAlignment: 'left',
    welcomeMessage: '',
    welcomeMessageFontSize: 16,
    welcomeMessageAlignment: 'left',
    buttonText: '',
    buttonColor: '#2563eb',
    cardBackground: '#ffffff',
    anonymityNotice: '',
    footerNotes: '',
    footerNotesAlignment: 'left',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Preview state
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const [previewInnerHeight, setPreviewInnerHeight] = useState(700);

  // Handle logo file selection — show local preview immediately
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  // Auto-grow textareas as content is typed
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const footerNotesTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const ta = messageTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [splashData.welcomeMessage]);
  useEffect(() => {
    const ta = footerNotesTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [splashData.footerNotes]);

  // Measure preview inner height with ResizeObserver
  useEffect(() => {
    const el = previewInnerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setPreviewInnerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [previewVisible]);

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
        splashConfigPayload.logoHeight = splashData.logoHeight ?? 64;
      }
      if (splashData.welcomeTitle) splashConfigPayload.welcomeTitle = splashData.welcomeTitle;
      if ((splashData.titleFontSize ?? 30) !== 30)
        splashConfigPayload.titleFontSize = splashData.titleFontSize;
      if ((splashData.titleAlignment ?? 'left') !== 'left')
        splashConfigPayload.titleAlignment = splashData.titleAlignment;
      if (splashData.welcomeMessage) {
        splashConfigPayload.welcomeMessage = splashData.welcomeMessage;
        splashConfigPayload.welcomeMessageFontSize = splashData.welcomeMessageFontSize ?? 16;
        splashConfigPayload.welcomeMessageAlignment = splashData.welcomeMessageAlignment ?? 'left';
      }
      if (splashData.buttonText) splashConfigPayload.buttonText = splashData.buttonText;
      if ((splashData.buttonColor ?? '#2563eb') !== '#2563eb')
        splashConfigPayload.buttonColor = splashData.buttonColor;
      if ((splashData.cardBackground ?? '#ffffff') !== '#ffffff')
        splashConfigPayload.cardBackground = splashData.cardBackground;
      if (splashData.anonymityNotice)
        splashConfigPayload.anonymityNotice = splashData.anonymityNotice;
      if (splashData.footerNotes)
        splashConfigPayload.footerNotes = splashData.footerNotes;
      if ((splashData.footerNotesAlignment ?? 'left') !== 'left')
        splashConfigPayload.footerNotesAlignment = splashData.footerNotesAlignment;
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
                    maxLength={100}
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
                  {/* Logo height slider */}
                  {logoPreview && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">Logo height</p>
                        <span className="text-xs font-semibold text-gray-700">
                          {splashData.logoHeight ?? 64}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={200}
                        step={1}
                        value={splashData.logoHeight ?? 64}
                        onChange={(e) =>
                          setSplashData({
                            ...splashData,
                            logoHeight: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-primary-600"
                        aria-label="Logo height"
                      />
                      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                        <span>24px</span>
                        <span>200px</span>
                      </div>
                    </div>
                  )}
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
                    maxLength={200}
                    value={splashData.welcomeTitle}
                    onChange={(e) =>
                      setSplashData({ ...splashData, welcomeTitle: e.target.value })
                    }
                    placeholder={selectedSurvey?.title || 'Defaults to survey title'}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.welcomeTitle?.length ?? 0} / 200
                  </p>
                  {/* Title Font Size Slider */}
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">
                        Title font size
                      </p>
                      <span className="text-xs font-semibold text-gray-700">
                        {splashData.titleFontSize ?? 30}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      step={1}
                      value={splashData.titleFontSize ?? 30}
                      onChange={(e) =>
                        setSplashData({
                          ...splashData,
                          titleFontSize: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-primary-600"
                      aria-label="Title font size"
                    />
                    <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                      <span>20px</span>
                      <span>60px</span>
                    </div>
                  </div>
                  {/* Title Alignment */}
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      Title alignment
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
                              titleAlignment: value as MessageAlignment,
                            })
                          }
                          aria-pressed={splashData.titleAlignment === value}
                          aria-label={label}
                          className={[
                            'flex flex-1 items-center justify-center py-1.5 transition-colors',
                            i > 0 ? 'border-l border-gray-300' : '',
                            splashData.titleAlignment === value
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-white text-gray-500 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
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
                    ref={messageTextareaRef}
                    id="splashMessage"
                    maxLength={2000}
                    value={splashData.welcomeMessage}
                    onChange={(e) =>
                      setSplashData({ ...splashData, welcomeMessage: e.target.value })
                    }
                    placeholder="Briefly explain the purpose of this survey and why participation matters…"
                    className="mt-1 block w-full resize-none overflow-hidden rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    style={{ minHeight: '5rem' }}
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.welcomeMessage?.length ?? 0} / 2000
                  </p>
                  {/* Font Size Slider */}
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">
                        Message font size
                      </p>
                      <span className="text-xs font-semibold text-gray-700">
                        {splashData.welcomeMessageFontSize ?? 16}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={32}
                      step={1}
                      value={splashData.welcomeMessageFontSize ?? 16}
                      onChange={(e) =>
                        setSplashData({
                          ...splashData,
                          welcomeMessageFontSize: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-primary-600"
                      aria-label="Message font size"
                    />
                    <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                      <span>6px</span>
                      <span>32px</span>
                    </div>
                  </div>
                </div>

                {/* Message Alignment */}
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">
                    Message alignment
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
                    maxLength={50}
                    value={splashData.buttonText}
                    onChange={(e) =>
                      setSplashData({ ...splashData, buttonText: e.target.value })
                    }
                    placeholder="Begin Survey"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.buttonText?.length ?? 0} / 50
                  </p>
                </div>

                {/* Button Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Button Color
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={splashData.buttonColor ?? '#2563eb'}
                      onChange={(e) =>
                        setSplashData({ ...splashData, buttonColor: e.target.value })
                      }
                      className="h-9 w-9 cursor-pointer rounded border border-gray-300 p-0.5"
                      aria-label="Button background color"
                    />
                    <span className="font-mono text-sm text-gray-700">
                      {splashData.buttonColor ?? '#2563eb'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSplashData({ ...splashData, buttonColor: '#2563eb' })
                      }
                      className="text-xs text-gray-400 underline hover:text-gray-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Card Background */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Card Background
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={splashData.cardBackground ?? '#ffffff'}
                      onChange={(e) =>
                        setSplashData({ ...splashData, cardBackground: e.target.value })
                      }
                      className="h-9 w-9 cursor-pointer rounded border border-gray-300 p-0.5"
                      aria-label="Card background color"
                    />
                    <span className="font-mono text-sm text-gray-700">
                      {splashData.cardBackground ?? '#ffffff'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSplashData({ ...splashData, cardBackground: '#ffffff' })
                      }
                      className="text-xs text-gray-400 underline hover:text-gray-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Anonymity Notice */}
                <div>
                  <label
                    htmlFor="splashAnonymityNotice"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Anonymity Notice
                  </label>
                  <input
                    type="text"
                    id="splashAnonymityNotice"
                    maxLength={300}
                    value={splashData.anonymityNotice}
                    onChange={(e) =>
                      setSplashData({ ...splashData, anonymityNotice: e.target.value })
                    }
                    placeholder="Anonymous — individual answers are never visible to anyone"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Shown beside the shield icon. Leave blank to use the default text.
                  </p>
                </div>

                {/* Footer Notes */}
                <div>
                  <label
                    htmlFor="splashFooterNotes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Footer Notes
                  </label>
                  <textarea
                    ref={footerNotesTextareaRef}
                    id="splashFooterNotes"
                    maxLength={1000}
                    value={splashData.footerNotes}
                    onChange={(e) =>
                      setSplashData({ ...splashData, footerNotes: e.target.value })
                    }
                    placeholder={`• Your responses are confidential and will be aggregated with others\n• All questions must be answered to complete the survey`}
                    className="mt-1 block w-full resize-none overflow-hidden rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    style={{ minHeight: '4rem' }}
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {splashData.footerNotes?.length ?? 0} / 1000
                  </p>
                  <p className="text-xs text-gray-500">
                    One line per bullet. Leave blank to use default notes.
                  </p>
                  {/* Footer Notes Alignment */}
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-gray-600">
                      Footer alignment
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
                              footerNotesAlignment: value as MessageAlignment,
                            })
                          }
                          aria-pressed={splashData.footerNotesAlignment === value}
                          aria-label={label}
                          className={[
                            'flex flex-1 items-center justify-center py-1.5 transition-colors',
                            i > 0 ? 'border-l border-gray-300' : '',
                            splashData.footerNotesAlignment === value
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-white text-gray-500 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile: toggle preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewVisible(v => !v)}
                  className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 lg:hidden"
                >
                  {previewVisible ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              {/* Right: Pixel-perfect Live Preview */}
              <div className={previewVisible ? 'block' : 'hidden lg:block'}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Live Preview
                </p>
                {(() => {
                  const FULL_WIDTH = 672; // max-w-2xl in px
                  const SCALE = 0.45;
                  const liveSplash: SplashConfig = {
                    ...splashData,
                    logoUrl: logoPreview ?? undefined,
                  };
                  // Pass estimatedMinutes from selected survey so preview matches live screen
                  const previewSurvey = selectedSurvey
                    ? ({ estimatedMinutes: selectedSurvey.estimatedMinutes } as unknown as Survey)
                    : null;
                  return (
                    <div
                      className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
                      style={{
                        width: `${Math.round(FULL_WIDTH * SCALE)}px`,
                        height: `${Math.round(previewInnerHeight * SCALE)}px`,
                      }}
                    >
                      <div
                        ref={previewInnerRef}
                        className="pointer-events-none"
                        style={{
                          width: `${FULL_WIDTH}px`,
                          transformOrigin: 'top left',
                          transform: `scale(${SCALE})`,
                        }}
                      >
                        <WelcomeScreen
                          survey={previewSurvey}
                          fallbackTitle={splashData.welcomeTitle || selectedSurvey?.title || ''}
                          splashConfig={liveSplash}
                          isAnonymous={true}
                          campaignEndDate={formData.endDate || null}
                          onBegin={() => {}}
                        />
                      </div>
                    </div>
                  );
                })()}
                <p className="mt-1 text-center text-[10px] text-gray-400">
                  Scaled preview — identical to what respondents see
                </p>
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
