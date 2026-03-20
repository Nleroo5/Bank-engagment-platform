import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * Save Demographics for Anonymous Survey
 *
 * PATCH /api/anonymous/responses/demographics
 *
 * Saves demographics data for an anonymous survey session
 * before the user begins answering survey questions
 */

const DemographicsRequestSchema = z.object({
  sessionToken: z.string().uuid(),
  demographics: z.record(z.string()),
});

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 120 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validation = DemographicsRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionToken, demographics } = validation.data;

    // ============================================
    // 1. Lookup anonymous response by session token
    // ============================================
    const anonymousResponse = await prisma.anonymousResponse.findUnique({
      where: { sessionToken },
      include: { campaign: true },
    });

    if (!anonymousResponse) {
      return NextResponse.json(
        { error: 'Invalid session. Please start the survey again.' },
        { status: 404 }
      );
    }

    // ============================================
    // 2. Validate survey not already completed
    // ============================================
    if (anonymousResponse.completedAt) {
      return NextResponse.json(
        { error: 'This survey has already been completed.' },
        { status: 400 }
      );
    }

    // ============================================
    // 3. Validate campaign is still active
    // ============================================
    const { campaign } = anonymousResponse;
    const now = new Date();

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This survey is no longer active.' },
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
    // 4. Update demographics data
    // ============================================
    await prisma.anonymousResponse.update({
      where: { id: anonymousResponse.id },
      data: {
        demographics,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Demographics saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving demographics:', error);
    return NextResponse.json(
      { error: 'An error occurred while saving demographics.' },
      { status: 500 }
    );
  }
}
