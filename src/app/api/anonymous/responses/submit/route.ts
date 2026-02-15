import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  detectFraudulentResponse,
  flagResponseForReview,
} from '@/lib/fraud-detection';
import { rateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * Submit Anonymous Survey
 *
 * POST /api/anonymous/responses/submit
 *
 * Finalizes survey submission:
 * - Validates all questions answered
 * - Stores demographics JSON
 * - Applies reverse-scoring
 * - Runs fraud detection
 * - Marks as completed
 */

const SubmitRequestSchema = z.object({
  sessionToken: z.string().uuid(),
  demographics: z.record(z.any()).optional(), // Flexible JSON schema for demographics
});

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // 0. Rate limiting - 10 requests per minute
    // ============================================
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 10, // 10 requests per minute
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
    const validation = SubmitRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionToken, demographics } = validation.data;

    // ============================================
    // 1. Lookup anonymous response
    // ============================================
    const anonymousResponse = await prisma.anonymousResponse.findUnique({
      where: { sessionToken },
      include: {
        responses: true,
        campaign: true,
      },
    });

    if (!anonymousResponse) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
    }

    // ============================================
    // 2. Validate not already completed
    // ============================================
    if (anonymousResponse.completedAt) {
      return NextResponse.json(
        { error: 'Survey already completed' },
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
        { error: 'Survey is no longer active' },
        { status: 400 }
      );
    }

    if (campaign.endDate && now > campaign.endDate) {
      return NextResponse.json({ error: 'Survey has ended' }, { status: 400 });
    }

    // ============================================
    // 4. Validate all required questions answered
    // ============================================
    const survey = await prisma.survey.findUnique({
      where: { id: campaign.surveyId },
      include: {
        questions: {
          where: { isRequired: true },
        },
        scale: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const requiredQuestionIds = survey.questions.map((q) => q.id);
    const answeredQuestionIds = anonymousResponse.responses.map(
      (r) => r.questionId
    );

    const missingQuestions = requiredQuestionIds.filter(
      (qId) => !answeredQuestionIds.includes(qId)
    );

    if (missingQuestions.length > 0) {
      return NextResponse.json(
        {
          error: 'Please answer all required questions',
          missingQuestionIds: missingQuestions,
        },
        { status: 400 }
      );
    }

    // ============================================
    // 5. Apply reverse-scoring to adjustedValue fields
    // ============================================
    const scaleMax = survey.scale?.max ?? 3;

    // Update responses with adjusted values for reversed questions
    for (const response of anonymousResponse.responses) {
      const question = survey.questions.find((q) => q.id === response.questionId);

      if (question?.isReversed && typeof response.value === 'number') {
        const adjustedValue = scaleMax + 1 - response.value;

        await prisma.anonymousResponseItem.update({
          where: { id: response.id },
          data: { adjustedValue },
        });
      } else if (typeof response.value === 'number') {
        // For non-reversed questions, adjusted = raw
        await prisma.anonymousResponseItem.update({
          where: { id: response.id },
          data: { adjustedValue: response.value },
        });
      }
    }

    // ============================================
    // 6. Store demographics JSON
    // ============================================
    const updatedResponse = await prisma.anonymousResponse.update({
      where: { id: anonymousResponse.id },
      data: {
        demographics: demographics || {},
        completedAt: new Date(),
      },
    });

    // ============================================
    // 7. Run fraud detection
    // ============================================
    try {
      const fraudCheck = await detectFraudulentResponse(anonymousResponse.id);

      if (fraudCheck.isSuspicious) {
        await flagResponseForReview(anonymousResponse.id, fraudCheck);
        console.warn(
          `Anonymous response ${anonymousResponse.id} flagged for review:`,
          fraudCheck.reasons
        );
      }
    } catch (fraudError) {
      // Don't fail submission if fraud detection fails
      console.error('Fraud detection error:', fraudError);
    }

    // ============================================
    // 8. Return success
    // ============================================
    return NextResponse.json(
      {
        success: true,
        completedAt: updatedResponse.completedAt,
        message:
          'Your anonymous responses have been recorded. Thank you for participating.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting anonymous survey:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting the survey.' },
      { status: 500 }
    );
  }
}
