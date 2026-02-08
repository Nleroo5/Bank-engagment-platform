/**
 * Email Parsing and Validation Utilities
 *
 * Handles parsing of email lists from text input (comma/newline separated)
 * and validation of email addresses.
 */

/**
 * Parse a string containing emails separated by commas, newlines, or spaces
 * Returns an array of unique, trimmed, lowercase email addresses
 */
export function parseEmailList(input: string): string[] {
  if (!input || input.trim() === '') {
    return [];
  }

  // Split by common delimiters: comma, newline, semicolon, space
  const emails = input
    .split(/[\n,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  // Remove duplicates
  return Array.from(new Set(emails));
}

/**
 * Validate a single email address
 * Returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  // Basic email regex - matches most common email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a list of emails
 * Returns an object with valid emails and invalid emails
 */
export function validateEmailList(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach((email) => {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
}

/**
 * Parse and validate email list from text input
 * Returns an object with valid emails, invalid emails, and duplicate count
 */
export function parseAndValidateEmails(input: string): {
  valid: string[];
  invalid: string[];
  duplicatesRemoved: number;
} {
  const parsed = parseEmailList(input);
  const originalCount = input.split(/[\n,;\s]+/).filter((s) => s.trim()).length;
  const duplicatesRemoved = originalCount - parsed.length;

  const { valid, invalid } = validateEmailList(parsed);

  return {
    valid,
    invalid,
    duplicatesRemoved,
  };
}
