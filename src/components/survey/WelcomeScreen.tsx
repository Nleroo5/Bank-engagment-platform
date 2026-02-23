'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import type { Survey } from '@/types/survey';
import type { SplashConfig, MessageFontSize, MessageAlignment, LogoSize } from '@/types/splash';
import { Clock, Calendar, Shield } from 'lucide-react';

interface WelcomeScreenProps {
  survey?: Survey | null;
  /** Fallback title when no survey object or splashConfig.welcomeTitle is available */
  fallbackTitle?: string;
  onBegin: () => void;
  splashConfig?: SplashConfig;
  isAnonymous?: boolean;
  campaignEndDate?: Date | string | null;
}

function formatEndDate(date: Date | string): string {
  // timeZone: 'UTC' ensures server (Vercel/UTC) and browser (any TZ) render the
  // same date string, preventing React hydration mismatch error #425.
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const FONT_SIZE_CLASS: Record<MessageFontSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const ALIGN_CLASS: Record<MessageAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

// Logo height on the splash page
const LOGO_HEIGHT_CLASS: Record<LogoSize, string> = {
  sm: 'h-10',   // 40 px — small badge
  md: 'h-16',   // 64 px — default
  lg: 'h-24',   // 96 px — prominent
};

/** Renders the welcome message with proper line breaks and paragraph spacing. */
function WelcomeMessage({
  text,
  fontSize = 'lg',
  alignment = 'left',
}: {
  text: string;
  fontSize?: MessageFontSize;
  alignment?: MessageAlignment;
}) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div
      className={[
        'mb-6 space-y-4 leading-relaxed text-gray-700',
        FONT_SIZE_CLASS[fontSize],
        ALIGN_CLASS[alignment],
      ].join(' ')}
    >
      {paragraphs.map((para, i) => {
        const lines = para.split('\n');
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <Fragment key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function WelcomeScreen({
  survey,
  fallbackTitle,
  onBegin,
  splashConfig,
  isAnonymous,
  campaignEndDate,
}: WelcomeScreenProps) {
  const title = splashConfig?.welcomeTitle || survey?.title || fallbackTitle || '';
  const message = splashConfig?.welcomeMessage || survey?.welcomeMessage;
  const buttonText = splashConfig?.buttonText || 'Begin Survey';
  const bankName = splashConfig?.bankName;
  const logoUrl = splashConfig?.logoUrl;
  const logoSize = splashConfig?.logoSize ?? 'md';
  const logoHeightClass = LOGO_HEIGHT_CLASS[logoSize];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Logo Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        {logoUrl ? (
          // Use <img> directly so the Vercel Blob URL loads without being
          // proxied through /_next/image (which requires remotePatterns and
          // can silently fail, showing a broken image).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={bankName ? `${bankName} logo` : 'Organization logo'}
            className={`${logoHeightClass} w-auto max-w-[280px] object-contain`}
          />
        ) : (
          <Image
            src="/header-logo.png"
            alt="Logo"
            width={260}
            height={87}
            priority
            className="h-auto w-auto"
          />
        )}
        {bankName && (
          <p className="text-sm font-medium text-gray-500">{bankName}</p>
        )}
      </div>

      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{title}</h1>

        {message && (
          <WelcomeMessage
            text={message}
            fontSize={splashConfig?.welcomeMessageFontSize}
            alignment={splashConfig?.welcomeMessageAlignment}
          />
        )}

        {/* Logistics */}
        <div className="mb-6 space-y-2">
          {survey?.estimatedMinutes && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Estimated time: {survey.estimatedMinutes} minutes</span>
            </div>
          )}
          {campaignEndDate && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Survey closes: {formatEndDate(campaignEndDate)}</span>
            </div>
          )}
          {isAnonymous && (
            <div className="flex items-center gap-2 text-green-700">
              <Shield className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Anonymous — individual answers are never visible to anyone</span>
            </div>
          )}
        </div>

        {survey?.instructions && (
          <div className="mb-6 rounded-md bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">Instructions</h2>
            <div className="prose prose-sm text-blue-800">
              {typeof survey.instructions === 'string' ? (
                <p>{survey.instructions}</p>
              ) : (
                <p>
                  Please read each statement carefully and select the option
                  that best represents your view.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-2 text-base text-gray-600">
          {!isAnonymous && (
            <p>• Your responses are confidential and will be aggregated with others</p>
          )}
          <p>• All questions must be answered to complete the survey</p>
        </div>

        <button
          onClick={onBegin}
          className="w-full rounded-md bg-primary-600 px-6 py-3 text-lg font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
