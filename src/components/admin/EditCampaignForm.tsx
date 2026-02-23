'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, ImageIcon, X } from 'lucide-react';
import type { SurveyCampaign, Organization } from '@prisma/client';
import { parseSplashConfig } from '@/types/splash';
import type { SplashConfig, MessageAlignment } from '@/types/splash';
import { WelcomeScreen } from '@/components/survey/WelcomeScreen';

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
  });

  // Splash config state — pre-populate from existing campaign data
  const existingSplash = parseSplashConfig(campaign.splashConfig);
  const [splashOpen, setSplashOpen] = useState(false);
  const [splashData, setSplashData] = useState<Omit<SplashConfig, 'logoUrl' | 'platformLogoUrl'>>({
    bankName: existingSplash?.bankName ?? '',
    logoHeight: existingSplash?.logoHeight ?? 64,
    platformLogoHeight: existingSplash?.platformLogoHeight ?? 64,
    logoArrangement: existingSplash?.logoArrangement ?? 'side-by-side',
    welcomeTitle: existingSplash?.welcomeTitle ?? '',
    titleFontSize: existingSplash?.titleFontSize ?? 30,
    titleAlignment: existingSplash?.titleAlignment ?? 'left',
    welcomeMessage: existingSplash?.welcomeMessage ?? '',
    welcomeMessageFontSize: existingSplash?.welcomeMessageFontSize ?? 16,
    welcomeMessageAlignment: existingSplash?.welcomeMessageAlignment ?? 'left',
    buttonText: existingSplash?.buttonText ?? '',
    buttonColor: existingSplash?.buttonColor ?? '#2563eb',
    cardBackground: existingSplash?.cardBackground ?? '#ffffff',
    anonymityNotice: existingSplash?.anonymityNotice ?? 'Anonymous — individual answers are never visible to anyone',
    footerNotes: existingSplash?.footerNotes ?? '• Your responses are confidential and will be aggregated with others\n• All questions must be answered to complete the survey',
    footerNotesAlignment: existingSplash?.footerNotesAlignment ?? 'left',
  });

  // Client (bank) logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
    existingSplash?.logoUrl ?? null
  );
  // Platform (your) logo
  const [platformLogoFile, setPlatformLogoFile] = useState<File | null>(null);
  const [platformLogoPreview, setPlatformLogoPreview] = useState<string | null>(null);
  const [currentPlatformLogoUrl, setCurrentPlatformLogoUrl] = useState<string | null>(
    existingSplash?.platformLogoUrl ?? null
  );

  // Preview state
  const [previewVisible, setPreviewVisible] = useState(false);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const [previewInnerHeight, setPreviewInnerHeight] = useState(700);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingPlatformLogo, setIsDraggingPlatformLogo] = useState(false);

  // Client logo handlers
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setCurrentLogoUrl(null);
  };

  // Platform logo handlers
  const handlePlatformLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPlatformLogoFile(file);
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handlePlatformLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPlatformLogo(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    setPlatformLogoFile(file);
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoPreview(URL.createObjectURL(file));
  };

  const handleRemovePlatformLogo = () => {
    setPlatformLogoFile(null);
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoPreview(null);
    setCurrentPlatformLogoUrl(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Upload logos in parallel if files are selected
      const uploadFile = async (file: File): Promise<string> => {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload/logo', { method: 'POST', body: form });
        if (res.ok) {
          const data = await res.json() as { url?: unknown };
          if (typeof data.url === 'string') return data.url;
        }
        const err = await res.json().catch(() => ({})) as { error?: unknown };
        throw new Error(typeof err.error === 'string' ? err.error : 'Logo upload failed.');
      };

      let resolvedLogoUrl: string | null = currentLogoUrl;
      let resolvedPlatformLogoUrl: string | null = currentPlatformLogoUrl;

      try {
        const uploads = await Promise.all([
          logoFile ? uploadFile(logoFile) : Promise.resolve(null),
          platformLogoFile ? uploadFile(platformLogoFile) : Promise.resolve(null),
        ]);
        if (uploads[0] !== null) resolvedLogoUrl = uploads[0];
        if (uploads[1] !== null) resolvedPlatformLogoUrl = uploads[1];
      } catch (uploadErr) {
        setError((uploadErr instanceof Error ? uploadErr.message : 'Upload failed.') + ' Please try again, or remove the logo to save without one.');
        setIsSubmitting(false);
        return;
      }

      // Build splashConfig — only include fields that have values
      const splashConfigPayload: SplashConfig = {};
      if (splashData.bankName) splashConfigPayload.bankName = splashData.bankName;
      if (resolvedPlatformLogoUrl) {
        splashConfigPayload.platformLogoUrl = resolvedPlatformLogoUrl;
        splashConfigPayload.platformLogoHeight = splashData.platformLogoHeight ?? 64;
      }
      if (resolvedLogoUrl) {
        splashConfigPayload.logoUrl = resolvedLogoUrl;
        splashConfigPayload.logoHeight = splashData.logoHeight ?? 64;
      }
      if (resolvedPlatformLogoUrl && resolvedLogoUrl)
        splashConfigPayload.logoArrangement = splashData.logoArrangement ?? 'side-by-side';
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
      splashConfigPayload.anonymityNotice = splashData.anonymityNotice ?? '';
      splashConfigPayload.footerNotes = splashData.footerNotes ?? '';
      if ((splashData.footerNotesAlignment ?? 'left') !== 'left')
        splashConfigPayload.footerNotesAlignment = splashData.footerNotesAlignment;
      const hasSplashConfig = Object.keys(splashConfigPayload).length > 0;

      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
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

  // Determine what to show for logos in the WelcomeScreen preview
  const previewLogoSrc = logoPreview ?? currentLogoUrl;
  const previewPlatformLogoSrc = platformLogoPreview ?? currentPlatformLogoUrl;

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
                    maxLength={100}
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

                {/* Platform (Your) Logo */}
                <div>
                  <label
                    htmlFor="splashPlatformLogo"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your Logo
                  </label>
                  <p className="mb-1 text-xs text-gray-500">
                    Your branding — replaces the default platform logo
                  </p>
                  {previewPlatformLogoSrc ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingPlatformLogo(true); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingPlatformLogo(false); }}
                      onDrop={handlePlatformLogoDrop}
                      className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${isDraggingPlatformLogo ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-gray-200 bg-white p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewPlatformLogoSrc} alt="Your logo preview" className="h-full w-full object-contain" />
                        <button type="button" onClick={handleRemovePlatformLogo} className="absolute right-0.5 top-0.5 rounded-full bg-gray-800/70 p-0.5 text-white hover:bg-gray-800" aria-label="Remove platform logo">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <label htmlFor="splashPlatformLogo" className="cursor-pointer text-sm font-medium text-primary-600 underline hover:text-primary-700 focus-within:ring-2 focus-within:ring-primary-500">
                          Change logo
                          <input type="file" id="splashPlatformLogo" accept="image/jpeg,image/png,image/webp" onChange={handlePlatformLogoChange} className="sr-only" />
                        </label>
                        <p className="mt-0.5 text-xs text-gray-400">or drop a new file here</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingPlatformLogo(true); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingPlatformLogo(false); }}
                      onDrop={handlePlatformLogoDrop}
                      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 transition-colors ${isDraggingPlatformLogo ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    >
                      <ImageIcon className="mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
                      <p className="text-sm text-gray-500">
                        Drop your logo here, or{' '}
                        <label htmlFor="splashPlatformLogo" className="cursor-pointer text-primary-600 underline hover:text-primary-700 focus-within:ring-2 focus-within:ring-primary-500">
                          browse
                          <input type="file" id="splashPlatformLogo" accept="image/jpeg,image/png,image/webp" onChange={handlePlatformLogoChange} className="sr-only" />
                        </label>
                      </p>
                      <p className="mt-1 text-xs text-gray-400">JPG, PNG or WebP · max 4 MB</p>
                    </div>
                  )}
                  {/* Platform logo height slider */}
                  {previewPlatformLogoSrc && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">Logo height</p>
                        <span className="text-xs font-semibold text-gray-700">{splashData.platformLogoHeight ?? 64}px</span>
                      </div>
                      <input type="range" min={24} max={200} step={1} value={splashData.platformLogoHeight ?? 64}
                        onChange={(e) => setSplashData({ ...splashData, platformLogoHeight: parseInt(e.target.value, 10) })}
                        className="w-full accent-primary-600" aria-label="Your logo height"
                      />
                      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400"><span>24px</span><span>200px</span></div>
                    </div>
                  )}
                  {/* Arrangement picker — only shown when both logos are set */}
                  {previewPlatformLogoSrc && previewLogoSrc && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-gray-600">Logo arrangement</p>
                      <div className="flex overflow-hidden rounded-md border border-gray-300">
                        {([
                          { value: 'side-by-side', label: 'Side by side' },
                          { value: 'stacked', label: 'Stacked' },
                        ] as const).map(({ value, label }, i) => (
                          <button key={value} type="button"
                            onClick={() => setSplashData({ ...splashData, logoArrangement: value })}
                            aria-pressed={splashData.logoArrangement === value}
                            className={[
                              'flex flex-1 items-center justify-center py-1.5 text-xs transition-colors',
                              i > 0 ? 'border-l border-gray-300' : '',
                              splashData.logoArrangement === value ? 'bg-primary-50 font-medium text-primary-700' : 'bg-white text-gray-500 hover:bg-gray-50',
                            ].join(' ')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Client (Bank) Logo */}
                <div>
                  <label
                    htmlFor="splashLogo"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Client Logo
                  </label>
                  <p className="mb-1 text-xs text-gray-500">
                    The bank or organization&#39;s logo
                  </p>
                  {previewLogoSrc ? (
                    // With logo: compact row with drag-to-replace
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingLogo(false); }}
                      onDrop={handleLogoDrop}
                      className={`mt-1 flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${isDraggingLogo ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-gray-200 bg-white p-1">
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
                      <div className="min-w-0">
                        <label
                          htmlFor="splashLogo"
                          className="cursor-pointer text-sm font-medium text-primary-600 underline hover:text-primary-700 focus-within:ring-2 focus-within:ring-primary-500"
                        >
                          Change logo
                          <input
                            type="file"
                            id="splashLogo"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleLogoChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="mt-0.5 text-xs text-gray-400">
                          or drop a new file here
                        </p>
                      </div>
                    </div>
                  ) : (
                    // No logo: full-width drop zone
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingLogo(false); }}
                      onDrop={handleLogoDrop}
                      className={`mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 transition-colors ${isDraggingLogo ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                    >
                      <ImageIcon className="mb-2 h-8 w-8 text-gray-300" aria-hidden="true" />
                      <p className="text-sm text-gray-500">
                        Drop your logo here, or{' '}
                        <label
                          htmlFor="splashLogo"
                          className="cursor-pointer text-primary-600 underline hover:text-primary-700 focus-within:ring-2 focus-within:ring-primary-500"
                        >
                          browse
                          <input
                            type="file"
                            id="splashLogo"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleLogoChange}
                            className="sr-only"
                          />
                        </label>
                      </p>
                      <p className="mt-1 text-xs text-gray-400">JPG, PNG or WebP · max 4 MB</p>
                    </div>
                  )}
                  {/* Logo height slider */}
                  {previewLogoSrc && (
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
                    placeholder={campaign.surveyTitle}
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
                    placeholder="Briefly explain the purpose of this survey…"
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
                  const SCALE = 0.6;
                  const liveSplash: SplashConfig = {
                    ...splashData,
                    logoUrl: previewLogoSrc ?? undefined,
                    platformLogoUrl: previewPlatformLogoSrc ?? undefined,
                  };
                  return (
                    <div
                      className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
                      style={{
                        position: 'relative',
                        width: `${Math.round(FULL_WIDTH * SCALE)}px`,
                        height: `${Math.round(previewInnerHeight * SCALE)}px`,
                      }}
                    >
                      <div
                        ref={previewInnerRef}
                        className="pointer-events-none"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: `${FULL_WIDTH}px`,
                          transformOrigin: 'top left',
                          transform: `scale(${SCALE})`,
                        }}
                      >
                        <WelcomeScreen
                          survey={null}
                          fallbackTitle={splashData.welcomeTitle || campaign.surveyTitle}
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
