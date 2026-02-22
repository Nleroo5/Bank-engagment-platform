'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Shield, Lock, Clock, Calendar, CheckCircle } from 'lucide-react';
import { generateBrowserFingerprint } from '@/lib/fingerprint';
import type { SplashConfig } from '@/types/splash';

interface AccessCodeEntryProps {
  accessCode: string;
  surveyTitle: string;
  splashConfig?: SplashConfig | null;
  campaignEndDate?: Date | null;
}

/**
 * Access Code Entry Screen
 *
 * Welcome screen for anonymous surveys:
 * - Shows campaign branding (logo, bank name, custom text) from splashConfig
 * - Shows anonymity guarantee messaging
 * - Begins survey session
 */
export default function AccessCodeEntry({
  accessCode,
  surveyTitle,
  splashConfig,
  campaignEndDate,
}: AccessCodeEntryProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = splashConfig?.welcomeTitle || surveyTitle;
  const message = splashConfig?.welcomeMessage;
  const buttonText = splashConfig?.buttonText || 'Begin Survey';
  const bankName = splashConfig?.bankName;
  const logoUrl = splashConfig?.logoUrl;

  const handleBeginSurvey = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate browser fingerprint
      const browserFingerprint = await generateBrowserFingerprint();

      // Validate access code and create session
      const response = await fetch('/api/anonymous/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          captchaToken: '', // No captcha
          browserFingerprint,
          device: getDeviceType(),
          userAgent: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to begin survey');
      }

      // Set session cookie
      document.cookie = `anonymous_session=${data.sessionToken}; path=/; max-age=${60 * 60 * 24 * 30}; ${
        process.env.NODE_ENV === 'production' ? 'secure; ' : ''
      }samesite=strict`;

      // Reload page to show survey (session cookie will now exist)
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl md:p-12">
        {/* Logo / Branding */}
        <div className="mb-8 flex flex-col items-center gap-2">
          {logoUrl ? (
            <div className="relative h-16 w-[220px]">
              <Image
                src={logoUrl}
                alt={bankName ? `${bankName} logo` : 'Organization logo'}
                fill
                className="object-contain"
                priority
              />
            </div>
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

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>
          {message ? (
            <p className="text-lg text-gray-600">{message}</p>
          ) : (
            <p className="text-lg text-gray-600">Anonymous Survey</p>
          )}
        </div>

        {/* Logistics */}
        {campaignEndDate && (
          <div className="mb-6 flex items-center justify-center gap-2 text-gray-600">
            <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Survey closes:{' '}
              {new Date(campaignEndDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Anonymity Guarantees */}
        <div className="mb-8 space-y-4 rounded-lg bg-green-50 p-6">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-green-900">
            <Lock className="mr-2 h-5 w-5" />
            Your Privacy is Protected
          </h2>

          <div className="space-y-3 text-sm text-green-800">
            <div className="flex items-start">
              <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                <strong>Completely Anonymous:</strong> Your responses cannot be
                traced back to you. No email addresses or personal identifiers
                are collected.
              </p>
            </div>

            <div className="flex items-start">
              <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                <strong>Aggregate Reporting Only:</strong> Results are shown as
                group averages, never individual responses.
              </p>
            </div>

            <div className="flex items-start">
              <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                <strong>Secure &amp; Confidential:</strong> All data is encrypted
                and stored securely. Only authorized personnel can access
                aggregate reports.
              </p>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="mb-8 flex items-center justify-center gap-2 text-gray-600">
          <Clock className="h-5 w-5" aria-hidden="true" />
          <span>Estimated time: 10-15 minutes</span>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Begin Survey Button */}
        {!isLoading && (
          <div className="mb-6">
            <button
              onClick={handleBeginSurvey}
              className="w-full rounded-lg bg-primary-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Shield className="mr-2 inline-block h-5 w-5" aria-hidden="true" />
              {buttonText}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
            <p className="text-gray-600">Starting your survey...</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>Before you begin:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Click &quot;{buttonText}&quot; to start</li>
            <li>You can save your progress and return later</li>
            <li>Your session is valid until the survey closes</li>
            <li>
              Answer honestly - your responses help improve our organization
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
}
