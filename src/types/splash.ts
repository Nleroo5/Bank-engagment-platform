export type MessageAlignment = 'left' | 'center' | 'right';

export interface SplashConfig {
  bankName?: string;
  logoUrl?: string;
  /** Height of the logo in pixels (24–200). Default 64. */
  logoHeight?: number;
  welcomeTitle?: string;
  welcomeMessage?: string;
  /** Font size in pixels (6–32). Default 16. */
  welcomeMessageFontSize?: number;
  welcomeMessageAlignment?: MessageAlignment;
  buttonText?: string;
}

const VALID_ALIGNMENTS: ReadonlySet<string> = new Set(['left', 'center', 'right']);

// Backward-compat: campaigns saved before the numeric font-size migration
const LEGACY_FONT_SIZE: Record<string, number> = { sm: 12, md: 14, lg: 16, xl: 20 };
// Backward-compat: campaigns saved before the numeric logo-size migration
const LEGACY_LOGO_SIZE: Record<string, number> = { sm: 40, md: 64, lg: 96 };

/**
 * Safely parse an unknown JSON value (from Prisma's Json field) into a
 * SplashConfig. Returns null if the value is missing or not an object —
 * never throws. Handles both the current numeric format and the legacy
 * string-enum format for font size and logo size.
 */
export function parseSplashConfig(raw: unknown): SplashConfig | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const result: SplashConfig = {};

  if (typeof obj.bankName === 'string') result.bankName = obj.bankName;
  if (typeof obj.logoUrl === 'string') result.logoUrl = obj.logoUrl;

  // logoHeight: accept new numeric format or migrate from old logoSize string
  if (typeof obj.logoHeight === 'number' && obj.logoHeight >= 24 && obj.logoHeight <= 200) {
    result.logoHeight = Math.round(obj.logoHeight);
  } else if (typeof obj.logoSize === 'string' && LEGACY_LOGO_SIZE[obj.logoSize] != null) {
    result.logoHeight = LEGACY_LOGO_SIZE[obj.logoSize];
  }

  if (typeof obj.welcomeTitle === 'string') result.welcomeTitle = obj.welcomeTitle;
  if (typeof obj.welcomeMessage === 'string') result.welcomeMessage = obj.welcomeMessage;

  // welcomeMessageFontSize: accept numeric or migrate from old string enum
  if (typeof obj.welcomeMessageFontSize === 'number' &&
      obj.welcomeMessageFontSize >= 6 && obj.welcomeMessageFontSize <= 32) {
    result.welcomeMessageFontSize = Math.round(obj.welcomeMessageFontSize);
  } else if (typeof obj.welcomeMessageFontSize === 'string' &&
             LEGACY_FONT_SIZE[obj.welcomeMessageFontSize] != null) {
    result.welcomeMessageFontSize = LEGACY_FONT_SIZE[obj.welcomeMessageFontSize];
  }

  if (typeof obj.welcomeMessageAlignment === 'string' &&
      VALID_ALIGNMENTS.has(obj.welcomeMessageAlignment)) {
    result.welcomeMessageAlignment = obj.welcomeMessageAlignment as MessageAlignment;
  }

  if (typeof obj.buttonText === 'string') result.buttonText = obj.buttonText;
  return result;
}
