import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/responses/demographics-complete
 *
 * Called after a respondent finishes the inline demographics preamble.
 * Stamps `demographicsCompletedAt` on ALL invitations for the same
 * user + organization so subsequent surveys skip the demographics stage.
 */

const schema = z.object({
  token: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = schema.parse(body);

    // Look up invitation — need userId and organizationId for fan-out
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        campaign: { select: { organizationId: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    if (!invitation.userId) {
      return NextResponse.json(
        { error: 'Invitation has no associated user' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Stamp demographicsCompletedAt on ALL invitations for this user+org.
    // Wrapped in try/catch: degrades gracefully if the column hasn't been
    // migrated to the DB yet (the page uses response-based checking instead).
    try {
      await prisma.invitation.updateMany({
        where: {
          userId: invitation.userId,
          demographicsCompletedAt: null,
          campaign: {
            organizationId: invitation.campaign.organizationId,
          },
        },
        data: {
          demographicsCompletedAt: now,
        },
      });
    } catch (stampError) {
      // Non-fatal: the survey page checks completion via saved responses.
      // Run the add_demographics_gate.sql migration in Supabase to enable
      // the fast-path column check.
      console.warn(
        'Could not stamp demographicsCompletedAt (column may not exist yet):',
        stampError
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error completing demographics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
