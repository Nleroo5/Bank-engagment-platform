import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const submitSchema = z.object({
  token: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = submitSchema.parse(body);

    // Look up invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        campaign: true,
        responses: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (invitation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This survey has already been completed' },
        { status: 400 }
      );
    }

    // Check if campaign is active
    if (invitation.campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This survey is not currently active' },
        { status: 400 }
      );
    }

    // TODO: Validate that all required questions have been answered
    // This would require fetching the survey from Sanity and comparing
    // For now, we'll trust the client validation

    const completedAt = new Date();

    // Update invitation status to COMPLETED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'COMPLETED',
        completedAt,
      },
    });

    // Update response session
    await prisma.responseSession.update({
      where: { invitationId: invitation.id },
      data: {
        completedAt,
        lastActiveAt: completedAt,
      },
    });

    return NextResponse.json({
      success: true,
      completedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error submitting survey:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
