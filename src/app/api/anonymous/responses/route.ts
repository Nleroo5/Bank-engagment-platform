import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

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

export async function PATCH(request: NextRequest) {
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
    // 4. Upsert response items (allows partial saves)
    // ============================================
    const upsertPromises = responses.map((response) =>
      prisma.anonymousResponseItem.upsert({
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
          textValue: response.textValue ?? null,
          submittedAt: new Date(),
        },
        update: {
          value: response.value ?? null,
          textValue: response.textValue ?? null,
          submittedAt: new Date(),
        },
      })
    );

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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
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
