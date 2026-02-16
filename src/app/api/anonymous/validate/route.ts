import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  hashIpAddress,
  getClientIp as getClientIpFingerprint,
} from '@/lib/fingerprint';
import { rateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * Validate Anonymous Survey Access Code
 *
 * POST /api/anonymous/validate
 *
 * Validates access code and CAPTCHA, creates AnonymousResponse session
 * Returns session token for client-side cookie storage
 */

const ValidateRequestSchema = z.object({
  accessCode: z.string().min(1, 'Access code is required'),
  captchaToken: z.string().optional(), // Optional if hCaptcha not configured
  browserFingerprint: z.string().optional(),
  device: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // 0. Rate limiting - 30 requests per minute
    // ============================================
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 30, // 30 requests per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();
    const validation = ValidateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { accessCode, captchaToken, browserFingerprint, device, userAgent } =
      validation.data;

    // ============================================
    // 1. Verify CAPTCHA (optional - skip if not configured)
    // ============================================
    const hCaptchaEnabled = Boolean(process.env.HCAPTCHA_SECRET_KEY);

    if (hCaptchaEnabled && captchaToken) {
      const captchaResponse = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.HCAPTCHA_SECRET_KEY!,
          response: captchaToken,
        }),
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResult.success) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }
    // If hCaptcha not configured, skip verification (for development/testing)

    // ============================================
    // 2. Lookup campaign by access code
    // ============================================
    const campaign = await prisma.surveyCampaign.findUnique({
      where: {
        accessCode: accessCode.toUpperCase(),
        deletedAt: null,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Invalid access code. Please check and try again.' },
        { status: 404 }
      );
    }

    // ============================================
    // 3. Validate campaign is anonymous
    // ============================================
    if (!campaign.isAnonymous) {
      return NextResponse.json(
        { error: 'This survey uses personalized invitations.' },
        { status: 400 }
      );
    }

    // ============================================
    // 4. Validate campaign is active
    // ============================================
    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This survey is not currently active.' },
        { status: 400 }
      );
    }

    // ============================================
    // 5. Validate campaign dates
    // ============================================
    const now = new Date();
    if (campaign.startDate && now < campaign.startDate) {
      return NextResponse.json(
        { error: 'This survey has not started yet.' },
        { status: 400 }
      );
    }

    if (campaign.endDate && now > campaign.endDate) {
      return NextResponse.json(
        { error: 'This survey has ended.' },
        { status: 400 }
      );
    }

    // ============================================
    // 6. Check max responses limit
    // ============================================
    if (campaign.maxResponses) {
      const completedCount = await prisma.anonymousResponse.count({
        where: {
          campaignId: campaign.id,
          completedAt: { not: null },
        },
      });

      if (completedCount >= campaign.maxResponses) {
        return NextResponse.json(
          { error: 'This survey has reached its maximum number of responses.' },
          { status: 400 }
        );
      }
    }

    // ============================================
    // 7. Hash IP address for duplicate detection
    // ============================================
    const clientIpForHash = getClientIpFingerprint(request);
    const ipHash = clientIpForHash
      ? await hashIpAddress(clientIpForHash, campaign.id)
      : null;

    // ============================================
    // 8. Create AnonymousResponse session
    // ============================================
    const anonymousResponse = await prisma.anonymousResponse.create({
      data: {
        campaignId: campaign.id,
        ipHash,
        browserFingerprint,
        device,
        userAgent: userAgent || request.headers.get('user-agent') || undefined,
        startedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // ============================================
    // 9. Return session token and campaign details
    // ============================================
    return NextResponse.json(
      {
        sessionToken: anonymousResponse.sessionToken,
        campaign: {
          id: campaign.id,
          surveyTitle: campaign.surveyTitle,
          surveyId: campaign.surveyId,
          endDate: campaign.endDate,
        },
        anonymousResponseId: anonymousResponse.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating anonymous survey access:', error);
    return NextResponse.json(
      { error: 'An error occurred while validating access code.' },
      { status: 500 }
    );
  }
}
