import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Save Anonymous Survey Responses
 *
 * PATCH /api/anonymous/responses
 *
 * Saves or updates responses for an anonymous survey session
 * Supports partial completion and resuming surveys
 */

const ResponseItemSchema = z.object({
  questionId: z.string(),
  questionNumber: z.number().int().positive(),
  value: z.number().int().nullable().optional(),
  textValue: z.string().nullable().optional(),
});

const SaveRequestSchema = z.object({
  sessionToken: z.string().uuid(),
  responses: z.array(ResponseItemSchema).min(1),
});

/**
 * Resolve the valid numeric answer range for a question.
 *
 * Ranges are PER QUESTION TYPE, not per survey: True/False questions legitimately
 * submit 0 (False) / 1 (True), so a blanket 1..scaleMax bound would wrongly reject a
 * "False" answer. Generic 'likert' questions fall back to the survey's configured scale.
 */
function allowedValueRange(question: {
  questionType: string;
  survey: { scale: { min: number; max: number } | null };
}): { min: number; max: number } {
  switch (question.questionType) {
    case 'truefalse':
      return { min: 0, max: 1 };
    case 'likert5':
      return { min: 1, max: 5 };
    case 'likert3':
      return { min: 1, max: 3 };
    default:
      return {
        min: question.survey.scale?.min ?? 1,
        max: question.survey.scale?.max ?? 3,
      };
  }
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { interval: 60_000, uniqueTokenPerInterval: 120 });
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const validation = SaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { sessionToken, responses } = validation.data;

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
    // 2. Validate session has not expired
    // ============================================
    if (anonymousResponse.sessionExpiresAt && new Date() > anonymousResponse.sessionExpiresAt) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new survey.' },
        { status: 401 }
      );
    }

    // ============================================
    // 3. Validate survey not already completed
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
    // 4. Fetch question metadata for reverse-scoring
    // ============================================
    const questionIds = responses.map((r) => r.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        survey: {
          include: { scale: true },
        },
      },
    });

    // Create a map for quick lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // ============================================
    // 4b. Scope submitted responses to this campaign's survey + validate values
    // ============================================
    // Keep only answers whose question belongs to THIS campaign's survey. Fabricated
    // or cross-survey question IDs (and questions removed mid-campaign) are dropped
    // rather than stored as junk rows.
    const validResponses = responses.filter((r) => {
      const q = questionMap.get(r.questionId);
      return q !== undefined && q.surveyId === campaign.surveyId;
    });

    // Reject out-of-range numeric values. Left unchecked, a value outside the survey
    // scale later crashes report generation (validateScoringData throws). Ranges are
    // per question type (see allowedValueRange); textValue / null answers are exempt.
    for (const response of validResponses) {
      if (typeof response.value === 'number') {
        const question = questionMap.get(response.questionId)!;
        const { min, max } = allowedValueRange(question);
        if (response.value < min || response.value > max) {
          return NextResponse.json(
            { error: 'Invalid response value.' },
            { status: 400 }
          );
        }
      }
    }

    // ============================================
    // 5. Upsert response items with reverse-scoring
    // ============================================
    const upsertPromises = validResponses.map((response) => {
      const question = questionMap.get(response.questionId);

      // Calculate adjusted value if reversed
      let adjustedValue = response.value ?? null;

      if (question && response.value !== null && response.value !== undefined) {
        if (question.isReversed) {
          const scaleMax = question.survey.scale?.max ?? 3;
          adjustedValue = scaleMax + 1 - response.value;
        }
      }

      return prisma.anonymousResponseItem.upsert({
        where: {
          anonymousResponseId_questionId: {
            anonymousResponseId: anonymousResponse.id,
            questionId: response.questionId,
          },
        },
        create: {
          anonymousResponseId: anonymousResponse.id,
          questionId: response.questionId,
          questionNumber: response.questionNumber,
          value: response.value ?? null,
          adjustedValue,
          textValue: response.textValue ?? null,
          submittedAt: new Date(),
        },
        update: {
          value: response.value ?? null,
          adjustedValue,
          textValue: response.textValue ?? null,
          submittedAt: new Date(),
        },
      });
    });

    await Promise.all(upsertPromises);

    // ============================================
    // 5. Update last active timestamp
    // ============================================
    await prisma.anonymousResponse.update({
      where: { id: anonymousResponse.id },
      data: { lastActiveAt: new Date() },
    });

    // ============================================
    // 6. Return success with response count
    // ============================================
    const totalResponses = await prisma.anonymousResponseItem.count({
      where: { anonymousResponseId: anonymousResponse.id },
    });

    return NextResponse.json(
      {
        success: true,
        saved: responses.length,
        totalResponses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving anonymous responses:', error);
    return NextResponse.json(
      { error: 'An error occurred while saving responses.' },
      { status: 500 }
    );
  }
}

/**
 * Get Anonymous Survey Responses
 *
 * GET /api/anonymous/responses?sessionToken=xxx
 *
 * Retrieves saved responses for resuming a partial survey
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // ============================================
    // 1. Lookup anonymous response
    // ============================================
    const anonymousResponse = await prisma.anonymousResponse.findUnique({
      where: { sessionToken },
      include: {
        responses: {
          orderBy: { questionNumber: 'asc' },
        },
        campaign: {
          select: {
            id: true,
            surveyTitle: true,
            surveyId: true,
            status: true,
            endDate: true,
          },
        },
      },
    });

    if (!anonymousResponse) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (anonymousResponse.sessionExpiresAt && new Date() > anonymousResponse.sessionExpiresAt) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new survey.' },
        { status: 401 }
      );
    }

    // ============================================
    // 2. Return session data
    // ============================================
    return NextResponse.json(
      {
        campaign: anonymousResponse.campaign,
        responses: anonymousResponse.responses,
        completedAt: anonymousResponse.completedAt,
        demographics: anonymousResponse.demographics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching anonymous responses:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching responses.' },
      { status: 500 }
    );
  }
}
