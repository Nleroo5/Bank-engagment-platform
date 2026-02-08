import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import {
  rateLimit,
  getClientIp,
  getRateLimitHeaders,
  RATE_LIMITS,
} from '@/lib/rate-limit';

const submitSchema = z.object({
  token: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, RATE_LIMITS.SURVEY_SUBMIT);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

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

    // Validate that all required questions have been answered
    const survey = await getSurveyById(invitation.campaign.sanitysurveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey configuration not found' },
        { status: 404 }
      );
    }

    // Get all question IDs from the survey
    const allQuestionIds: string[] = [];
    for (const section of survey.sections || []) {
      for (const question of section.questions || []) {
        allQuestionIds.push(question._id);
      }
    }

    // Get all answered question IDs from responses
    const answeredQuestionIds = invitation.responses.map(r => r.sanityQuestionId);

    // Find missing questions
    const missingQuestionIds = allQuestionIds.filter(
      qId => !answeredQuestionIds.includes(qId)
    );

    if (missingQuestionIds.length > 0) {
      // Get the question numbers for better error message
      const missingQuestions = survey.sections
        ?.flatMap(s => s.questions || [])
        .filter(q => missingQuestionIds.includes(q._id))
        .map(q => q.number)
        .sort((a, b) => a - b);

      return NextResponse.json(
        {
          error: 'Survey incomplete',
          message: `Please answer all questions. Missing: ${missingQuestions?.join(', ')}`,
          missingQuestions,
        },
        { status: 400 }
      );
    }

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
