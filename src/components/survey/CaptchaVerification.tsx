'use client';

import { useRef, useCallback } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface CaptchaVerificationProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
}

/**
 * CAPTCHA Verification Component
 *
 * Wraps hCaptcha widget with professional styling
 * Calls onVerify callback with token when user completes challenge
 */
export default function CaptchaVerification({
  onVerify,
  onError,
  onExpire,
}: CaptchaVerificationProps) {
  const captchaRef = useRef<HCaptcha>(null);

  const handleVerify = useCallback(
    (token: string) => {
      onVerify(token);
    },
    [onVerify]
  );

  const handleError = useCallback(
    (error: string) => {
      console.error('CAPTCHA error:', error);
      if (onError) {
        onError('CAPTCHA verification failed. Please try again.');
      }
    },
    [onError]
  );

  const handleExpire = useCallback(() => {
    console.warn('CAPTCHA token expired');
    if (onExpire) {
      onExpire();
    }
  }, [onExpire]);

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.error('NEXT_PUBLIC_HCAPTCHA_SITE_KEY is not configured');
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
        CAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        onVerify={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        theme="light"
        size="normal"
      />
    </div>
  );
}
