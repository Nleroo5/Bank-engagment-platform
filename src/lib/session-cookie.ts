import { NextRequest, NextResponse } from 'next/server';

/**
 * Anonymous Session Cookie Management
 *
 * Handles httpOnly cookies for anonymous survey sessions.
 * Session tokens are used for duplicate prevention and resuming partial surveys.
 */

const COOKIE_NAME = 'anonymous_session';
const DEFAULT_DURATION_DAYS = 30;

export interface SessionCookieOptions {
  sessionToken: string;
  campaignEndDate?: Date;
  maxAge?: number; // in seconds
}

/**
 * Set anonymous session cookie
 *
 * Creates httpOnly, secure cookie with session token
 * Expires at campaign end date or default 30 days
 */
export function setAnonymousSessionCookie(
  response: NextResponse,
  options: SessionCookieOptions
): void {
  const { sessionToken, campaignEndDate, maxAge } = options;

  // Calculate expiration
  const expires =
    campaignEndDate ||
    new Date(Date.now() + DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Set cookie with security flags
  response.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true, // Prevent JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // Prevent CSRF
    expires,
    maxAge: maxAge || DEFAULT_DURATION_DAYS * 24 * 60 * 60, // in seconds
    path: '/', // Available across all routes
  });
}

/**
 * Get anonymous session cookie value
 *
 * Retrieves session token from request cookies
 * Returns null if cookie doesn't exist
 */
export function getAnonymousSessionCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Delete anonymous session cookie
 *
 * Removes session cookie (used after survey completion or expiration)
 */
export function deleteAnonymousSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

/**
 * Check if anonymous session cookie exists
 *
 * Returns true if cookie is present (doesn't validate the token)
 */
export function hasAnonymousSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(COOKIE_NAME);
}
