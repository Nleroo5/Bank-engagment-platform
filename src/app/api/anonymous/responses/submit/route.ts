import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
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
    // 0. Rate limiting - 60 requests per minute per IP
    // (Bank employees share a corporate IP, so the limit must be
    //  generous enough for an entire office submitting concurrently.
    //  Abuse is already prevented by session-token validation,
    //  double-submit protection, and transaction-based maxResponses.)
    // ============================================
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 60, // 60 requests per minute
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
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Check if this is a demographics-only survey (all required questions have fieldType)
    const isDemographicsOnly = survey.questions.every((q) => {
      const config = q.config as { fieldType?: string } | null;
      return config?.fieldType;
    });

    // Only validate question responses for non-demographics-only surveys
    if (!isDemographicsOnly) {
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
    }

    // ============================================
    // 5 & 6. TRANSACTION: Check maxResponses + mark complete atomically
    // ============================================
    // Both the limit check and the completion write happen inside one
    // transaction so concurrent submissions cannot exceed maxResponses.
    // Reverse-scoring is NOT applied here — it is already handled by
    // the PATCH /api/anonymous/responses endpoint at save time.

    const updatedResponse = await prisma.$transaction(async (tx) => {
      // 5. Verify maxResponses inside transaction to prevent race conditions
      if (campaign.maxResponses) {
        const completedCount = await tx.anonymousResponse.count({
          where: {
            campaignId: campaign.id,
            completedAt: { not: null },
          },
        });

        if (completedCount >= campaign.maxResponses) {
          throw new Error('MAX_RESPONSES_REACHED');
        }
      }

      // 6. Mark response as completed with demographics
      const completed = await tx.anonymousResponse.update({
        where: { id: anonymousResponse.id },
        data: {
          demographics: demographics || {},
          completedAt: new Date(),
        },
      });

      return completed;
    });

    if (!updatedResponse) {
      return NextResponse.json(
        { error: 'Failed to submit survey.' },
        { status: 500 }
      );
    }

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
    // Handle maxResponses exceeded (thrown inside transaction)
    if (error instanceof Error && error.message === 'MAX_RESPONSES_REACHED') {
      return NextResponse.json(
        { error: 'This survey has reached its maximum number of responses.' },
        { status: 400 }
      );
    }

    console.error('Error submitting anonymous survey:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting the survey.' },
      { status: 500 }
    );
  }
}
