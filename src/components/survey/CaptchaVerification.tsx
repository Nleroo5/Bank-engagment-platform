'use client';

import { useRef, useCallback, useEffect } from 'react';
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
 *
 * If NEXT_PUBLIC_HCAPTCHA_SITE_KEY is not configured, auto-verifies
 * (backend will skip CAPTCHA validation when not configured)
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

  // If no site key configured, auto-verify (CAPTCHA is optional)
  useEffect(() => {
    if (!siteKey) {
      console.info('hCaptcha not configured - skipping CAPTCHA verification');
      onVerify(''); // Empty token - backend will skip validation
    }
  }, [siteKey, onVerify]);

  // If not configured, return null (don't render anything)
  if (!siteKey) {
    return null;
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
