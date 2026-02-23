export type MessageFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type MessageAlignment = 'left' | 'center' | 'right';
export type LogoSize = 'sm' | 'md' | 'lg';

export interface SplashConfig {
  bankName?: string;
  logoUrl?: string;
  logoSize?: LogoSize;
  welcomeTitle?: string;
  welcomeMessage?: string;
  welcomeMessageFontSize?: MessageFontSize;
  welcomeMessageAlignment?: MessageAlignment;
  buttonText?: string;
}

const VALID_FONT_SIZES: ReadonlySet<string> = new Set(['sm', 'md', 'lg', 'xl']);
const VALID_ALIGNMENTS: ReadonlySet<string> = new Set(['left', 'center', 'right']);
const VALID_LOGO_SIZES: ReadonlySet<string> = new Set(['sm', 'md', 'lg']);

/**
 * Safely parse an unknown JSON value (from Prisma's Json field) into a
 * SplashConfig. Returns null if the value is missing or not an object —
 * never throws.
 */
export function parseSplashConfig(raw: unknown): SplashConfig | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const result: SplashConfig = {};
  if (typeof obj.bankName === 'string') result.bankName = obj.bankName;
  if (typeof obj.logoUrl === 'string') result.logoUrl = obj.logoUrl;
  if (typeof obj.logoSize === 'string' && VALID_LOGO_SIZES.has(obj.logoSize)) {
    result.logoSize = obj.logoSize as LogoSize;
  }
  if (typeof obj.welcomeTitle === 'string') result.welcomeTitle = obj.welcomeTitle;
  if (typeof obj.welcomeMessage === 'string') result.welcomeMessage = obj.welcomeMessage;
  if (typeof obj.welcomeMessageFontSize === 'string' && VALID_FONT_SIZES.has(obj.welcomeMessageFontSize)) {
    result.welcomeMessageFontSize = obj.welcomeMessageFontSize as MessageFontSize;
  }
  if (typeof obj.welcomeMessageAlignment === 'string' && VALID_ALIGNMENTS.has(obj.welcomeMessageAlignment)) {
    result.welcomeMessageAlignment = obj.welcomeMessageAlignment as MessageAlignment;
  }
  if (typeof obj.buttonText === 'string') result.buttonText = obj.buttonText;
  return result;
}
