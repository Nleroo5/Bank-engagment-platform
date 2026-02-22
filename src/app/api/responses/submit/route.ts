import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/surveys/queries';
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
    const survey = await getSurveyById(invitation.campaign.surveyId);

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
    const answeredQuestionIds = invitation.responses.map((r) => r.questionId);

    // Find missing questions
    const missingQuestionIds = allQuestionIds.filter(
      (qId) => !answeredQuestionIds.includes(qId)
    );

    if (missingQuestionIds.length > 0) {
      const missingQuestions = survey.sections
        ?.flatMap((s) => s.questions || [])
        .filter((q) => missingQuestionIds.includes(q._id))
        .map((q) => q.number)
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

    // ============================================
    // TRANSACTION: Reverse-scoring + completion
    // ============================================
    await prisma.$transaction(async (tx) => {
      // 1. Fetch PostgreSQL survey data to get scale and reversed questions
      const pgSurvey = await tx.survey.findUnique({
        where: { id: invitation.campaign.surveyId },
        include: {
          questions: true,
          scale: true,
        },
      });

      if (pgSurvey) {
        const scaleMax = pgSurvey.scale?.max ?? 3;

        // 2. Apply reverse-scoring to all responses
        for (const response of invitation.responses) {
          const question = pgSurvey.questions.find(
            (q) => q.id === response.questionId
          );

          let adjustedValue: number | null = null;

          if (question?.isReversed && typeof response.value === 'number') {
            // Reverse-scoring formula: adjustedValue = (max + 1) - raw
            adjustedValue = scaleMax + 1 - response.value;
          } else if (typeof response.value === 'number') {
            adjustedValue = response.value;
          }

          if (adjustedValue !== null) {
            await tx.response.update({
              where: { id: response.id },
              data: { adjustedValue },
            });
          }
        }
      }

      // 3. Mark invitation as COMPLETED
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'COMPLETED',
          completedAt,
        },
      });

      // 4. Update response session
      await tx.responseSession.update({
        where: { invitationId: invitation.id },
        data: {
          completedAt,
          lastActiveAt: completedAt,
        },
      });
    });

    return NextResponse.json({ success: true, completedAt });
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
