import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

// Mark route as dynamic (not statically generated)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check Access Code Availability
 *
 * GET /api/campaigns/check-access-code?accessCode=BANK2024
 *
 * Validates if an access code is available (not already in use)
 * Used by campaign creation form for real-time validation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('accessCode');

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    // Normalize to uppercase for consistency
    const normalizedCode = accessCode.toUpperCase().trim();

    // Validate format (6-20 alphanumeric characters)
    const codeRegex = /^[A-Z0-9]{6,20}$/;
    if (!codeRegex.test(normalizedCode)) {
      return NextResponse.json(
        {
          available: false,
          error: 'Access code must be 6-20 alphanumeric characters',
        },
        { status: 400 }
      );
    }

    // Check if code exists (including deleted campaigns to prevent reuse)
    const existingCampaign = await prisma.surveyCampaign.findUnique({
      where: { accessCode: normalizedCode },
      select: { id: true, deletedAt: true },
    });

    const available = !existingCampaign;

    return NextResponse.json(
      {
        available,
        accessCode: normalizedCode,
        ...(existingCampaign && {
          message: 'This access code is already in use',
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking access code availability:', error);
    return NextResponse.json(
      { error: 'An error occurred while checking access code availability' },
      { status: 500 }
    );
  }
}
