import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const patchSchema = z.object({
  token: z.string().uuid(),
  questionId: z.string(),
  value: z.union([z.number().int().min(1).max(5), z.string()]),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, questionId, value } = patchSchema.parse(body);

    // Look up invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        campaign: true,
        user: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (
      invitation.campaign.endDate &&
      new Date(invitation.campaign.endDate) < new Date()
    ) {
      return NextResponse.json(
        { error: 'This survey has expired' },
        { status: 410 }
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

    // Get question number (we'll need this for the response)
    // For now, we'll extract it from the questionId or set it to 0
    // In a real scenario, you'd fetch this from Sanity
    const questionNumber = 0; // Placeholder

    // Determine if value is numeric (Likert) or text (demographics)
    const isNumeric = typeof value === 'number';

    // Upsert the response
    const response = await prisma.response.upsert({
      where: {
        invitationId_questionId: {
          invitationId: invitation.id,
          questionId: questionId,
        },
      },
      update: {
        value: isNumeric ? value : null,
        textValue: !isNumeric ? value : null,
        submittedAt: new Date(),
      },
      create: {
        invitationId: invitation.id,
        questionId: questionId,
        questionNumber,
        value: isNumeric ? value : null,
        textValue: !isNumeric ? value : null,
      },
    });

    // For demographics questions, also update the user profile
    if (!isNumeric && invitation.user && typeof value === 'string') {
      // Map of questionId patterns to user profile fields
      const questionLower = questionId.toLowerCase();
      let updateData: Record<string, string> = {};

      if (questionLower.includes('division')) {
        updateData = { division: value };
      } else if (questionLower.includes('jobrole')) {
        updateData = { jobRole: value };
      } else if (questionLower.includes('employmentstatus')) {
        updateData = { employmentStatus: value };
      } else if (questionLower.includes('gender')) {
        updateData = { gender: value };
      } else if (questionLower.includes('timeatbank')) {
        updateData = { timeAtBank: value };
      } else if (questionLower.includes('bankexperience')) {
        updateData = { bankExperience: value };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: invitation.userId },
          data: updateData,
        });
      }
    }

    // Update invitation status to IN_PROGRESS if it's still PENDING or SENT
    if (
      invitation.status === 'PENDING' ||
      invitation.status === 'SENT' ||
      invitation.status === 'OPENED'
    ) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Update or create response session
    await prisma.responseSession.upsert({
      where: { invitationId: invitation.id },
      update: {
        lastActiveAt: new Date(),
      },
      create: {
        invitationId: invitation.id,
        startedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
