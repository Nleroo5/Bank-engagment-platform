'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import type { Survey } from '@/types/survey';
import type { SplashConfig, MessageAlignment } from '@/types/splash';
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

const ALIGN_CLASS: Record<MessageAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** Renders the welcome message with proper paragraph + line-break support. */
function WelcomeMessage({
  text,
  fontSize = 16,
  alignment = 'left',
}: {
  text: string;
  fontSize?: number;
  alignment?: MessageAlignment;
}) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div
      className={['mb-6 space-y-4 leading-relaxed text-gray-700', ALIGN_CLASS[alignment]].join(' ')}
      style={{ fontSize: `${fontSize}px` }}
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

/** Renders footer notes — supports multiline text, one line per bullet. */
function FooterNotes({
  text,
  alignment = 'left',
}: {
  text: string;
  alignment?: MessageAlignment;
}) {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className={['mb-6 space-y-2 text-base text-gray-600', ALIGN_CLASS[alignment]].join(' ')}>
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
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
  const logoHeight = splashConfig?.logoHeight ?? 64;
  const platformLogoUrl = splashConfig?.platformLogoUrl;
  const platformLogoHeight = splashConfig?.platformLogoHeight ?? 64;
  const logoArrangement = splashConfig?.logoArrangement ?? 'side-by-side';
  const titleFontSize = splashConfig?.titleFontSize ?? 30;
  const titleAlignment = splashConfig?.titleAlignment ?? 'left';
  const buttonColor = splashConfig?.buttonColor;
  const cardBackground = splashConfig?.cardBackground;

  // Determine logo display mode
  const hasPlatformLogo = !!platformLogoUrl;
  const hasClientLogo = !!logoUrl;
  const hasBothLogos = hasPlatformLogo && hasClientLogo;
  const anonymityNotice = splashConfig?.anonymityNotice
    ?? 'Anonymous — individual answers are never visible to anyone';
  const footerNotes = splashConfig?.footerNotes;
  const footerNotesAlignment = splashConfig?.footerNotesAlignment ?? 'left';

  // Default footer text shown when no custom footerNotes is configured
  const defaultFooterLines: string[] = [];
  if (!isAnonymous) {
    defaultFooterLines.push('• Your responses are confidential and will be aggregated with others');
  }
  defaultFooterLines.push('• All questions must be answered to complete the survey');

  return (
    <div className="mx-auto max-w-2xl">
      {/* Logo Header */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div
          className={[
            'flex items-center gap-6',
            hasBothLogos && logoArrangement === 'stacked' ? 'flex-col' : 'flex-row justify-center',
          ].join(' ')}
        >
          {/* Platform logo — custom upload or default /header-logo.png */}
          {hasPlatformLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={platformLogoUrl!}
              alt="Platform logo"
              style={{ height: `${platformLogoHeight}px` }}
              className="w-auto max-w-[320px] object-contain"
            />
          ) : !hasClientLogo ? (
            // Only show default when no client logo either
            <Image
              src="/header-logo.png"
              alt="Logo"
              width={260}
              height={87}
              priority
              className="h-auto w-auto"
            />
          ) : null}

          {/* Client / bank logo */}
          {hasClientLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl!}
              alt={bankName ? `${bankName} logo` : 'Organization logo'}
              style={{ height: `${logoHeight}px` }}
              className="w-auto max-w-[320px] object-contain"
            />
          )}
        </div>
        {bankName && (
          <p className="text-sm font-medium text-gray-500">{bankName}</p>
        )}
      </div>

      <div
        className="rounded-lg p-8 shadow-lg"
        style={{ backgroundColor: cardBackground ?? '#ffffff' }}
      >
        <h1
          className={`mb-4 font-bold text-gray-900 ${ALIGN_CLASS[titleAlignment]}`}
          style={{ fontSize: `${titleFontSize}px` }}
        >
          {title}
        </h1>

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
              <span>{anonymityNotice}</span>
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

        {/* Footer notes — custom override or defaults */}
        {footerNotes !== undefined ? (
          footerNotes.trim() && (
            <FooterNotes text={footerNotes} alignment={footerNotesAlignment} />
          )
        ) : (
          <div className="mb-6 space-y-2 text-base text-gray-600">
            {defaultFooterLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <button
          onClick={onBegin}
          style={buttonColor ? { backgroundColor: buttonColor } : undefined}
          className={`w-full rounded-md px-6 py-3 text-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            buttonColor
              ? 'focus:ring-gray-400'
              : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
          }`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
