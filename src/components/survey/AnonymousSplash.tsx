'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/survey/WelcomeScreen';
import { generateBrowserFingerprint } from '@/lib/fingerprint';
import type { SplashConfig } from '@/types/splash';

interface AnonymousSplashProps {
  accessCode: string;
  surveyTitle: string;
  splashConfig?: SplashConfig | null;
  campaignEndDate?: Date | null;
}

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent)) return 'mobile';
  return 'desktop';
}

export default function AnonymousSplash({
  accessCode,
  surveyTitle,
  splashConfig,
  campaignEndDate,
}: AnonymousSplashProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBegin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const browserFingerprint = await generateBrowserFingerprint();

      const response = await fetch('/api/anonymous/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          captchaToken: '',
          browserFingerprint,
          device: getDeviceType(),
          userAgent: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to begin survey');
      }

      document.cookie = `anonymous_session=${data.sessionToken}; path=/; max-age=${60 * 60 * 24 * 30}; ${
        process.env.NODE_ENV === 'production' ? 'secure; ' : ''
      }samesite=strict`;

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary-600" />
          <p className="text-gray-600">Starting your survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-2xl">
        {error && (
          <div
            className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}
        <WelcomeScreen
          fallbackTitle={surveyTitle}
          splashConfig={splashConfig ?? undefined}
          isAnonymous
          campaignEndDate={campaignEndDate}
          onBegin={handleBegin}
        />
      </div>
    </div>
  );
}
