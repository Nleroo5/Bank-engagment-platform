'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Clock, CheckCircle } from 'lucide-react';
import CaptchaVerification from './CaptchaVerification';
import { generateBrowserFingerprint } from '@/lib/fingerprint';

interface AccessCodeEntryProps {
  accessCode: string;
  surveyTitle: string;
}

/**
 * Access Code Entry Screen
 *
 * Welcome screen for anonymous surveys:
 * - Shows anonymity guarantee messaging
 * - CAPTCHA verification
 * - Begins survey session
 */
export default function AccessCodeEntry({
  accessCode,
  surveyTitle,
}: AccessCodeEntryProps) {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-submit when CAPTCHA is verified
  useEffect(() => {
    if (captchaToken) {
      handleBeginSurvey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaToken]);

  const handleBeginSurvey = async () => {
    if (!captchaToken) return;

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
          captchaToken,
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
      setCaptchaToken(null); // Reset CAPTCHA
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = (errorMsg: string) => {
    setError(errorMsg);
    setCaptchaToken(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl md:p-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {surveyTitle}
          </h1>
          <p className="text-lg text-gray-600">Anonymous Survey</p>
        </div>

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
                <strong>Secure & Confidential:</strong> All data is encrypted
                and stored securely. Only authorized personnel can access
                aggregate reports.
              </p>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="mb-8 flex items-center justify-center text-gray-600">
          <Clock className="mr-2 h-5 w-5" />
          <span>Estimated time: 10-15 minutes</span>
        </div>

        {/* CAPTCHA */}
        <div className="mb-6">
          <CaptchaVerification
            onVerify={handleCaptchaVerify}
            onError={handleCaptchaError}
          />
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
            <p className="text-gray-600">Starting your survey...</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>Before you begin:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Complete the CAPTCHA verification above to begin</li>
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
