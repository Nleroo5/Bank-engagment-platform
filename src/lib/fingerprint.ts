/**
 * Browser Fingerprinting for Anonymous Surveys
 *
 * Generates unique browser fingerprint for duplicate detection.
 * Does NOT identify individuals - only detects duplicate browsers.
 *
 * Uses: User agent, screen resolution, timezone, hardware specs
 * Does NOT use: Persistent identifiers, tracking cookies, or PII
 */

export interface BrowserComponents {
  userAgent: string;
  language: string;
  colorDepth: number;
  deviceMemory?: number;
  hardwareConcurrency: number;
  screenResolution: string;
  timezone: string;
  platform: string;
}

/**
 * Collect browser components for fingerprinting
 *
 * Client-side only - must be called in browser environment
 */
export function collectBrowserComponents(): BrowserComponents {
  if (typeof window === 'undefined') {
    throw new Error('collectBrowserComponents() must be called in browser environment');
  }

  // Type assertion for non-standard properties
  interface NavigatorWithMemory extends Navigator {
    deviceMemory?: number;
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    colorDepth: screen.colorDepth,
    deviceMemory: (navigator as NavigatorWithMemory).deviceMemory, // Not all browsers support
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
  };
}

/**
 * Generate browser fingerprint hash
 *
 * Creates SHA-256 hash from browser components
 * Returns hex string
 */
export async function generateBrowserFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateBrowserFingerprint() must be called in browser environment');
  }

  const components = collectBrowserComponents();

  // Serialize components to stable string
  const fingerprintString = JSON.stringify(components, Object.keys(components).sort());

  // Hash with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Hash IP address for storage
 *
 * Server-side function to hash IP addresses
 * Uses SHA-256 with campaign ID as salt
 */
export async function hashIpAddress(ipAddress: string, campaignId: string): Promise<string> {
  // Combine IP with campaign ID as salt
  const saltedIp = `${ipAddress}:${campaignId}`;

  // In Node.js environment, use crypto module
  if (typeof window === 'undefined') {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(saltedIp).digest('hex');
  }

  // In browser environment (shouldn't happen, but fallback)
  const encoder = new TextEncoder();
  const data = encoder.encode(saltedIp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get client IP address from Next.js request headers
 *
 * Checks x-forwarded-for, x-real-ip headers (for proxies/CDNs)
 * Falls back to remote address
 */
export function getClientIp(request: Request): string | null {
  const headers = request.headers;

  // Check x-forwarded-for (comma-separated list, first is client)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0];
    return firstIp ? firstIp.trim() : null;
  }

  // Check x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  // Note: In serverless environments, this may not be available
  return null;
}
