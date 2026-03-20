import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';

function authError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    return authError(error);
  }

  try {
    const questions = await prisma.question.findMany({
      where: { surveyId: params.id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [
        { questionNumber: 'asc' },
        { subQuestionLetter: 'asc' },
      ],
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    return authError(error);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  try {
    const {
      text,
      questionType,
      questionNumber,
      isRequired = true,
      isReversed = false,
      weight = 1,
      categoryIds = [],
      config,
      parentQuestionId,
    } = body;

    // Validate required fields
    if (!text || !questionType || (!questionNumber && !parentQuestionId)) {
      return NextResponse.json(
        { error: 'Text, type, and number (or parent question) are required' },
        { status: 400 }
      );
    }

    // If creating a sub-question, resolve parent and auto-assign letter
    let resolvedQuestionNumber = questionNumber;
    let subQuestionLetter = '';
    if (parentQuestionId) {
      const parent = await prisma.question.findUnique({
        where: { id: parentQuestionId },
      });
      if (!parent || parent.surveyId !== params.id) {
        return NextResponse.json(
          { error: 'Parent question not found in this survey' },
          { status: 400 }
        );
      }
      resolvedQuestionNumber = parent.questionNumber;

      // Find the highest existing sub-question letter for this parent
      const existingSubs = await prisma.question.findMany({
        where: { parentQuestionId, subQuestionLetter: { not: '' } },
        orderBy: { subQuestionLetter: 'desc' },
        take: 1,
      });
      if (existingSubs.length > 0) {
        const lastLetter = existingSubs[0].subQuestionLetter;
        subQuestionLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
      } else {
        subQuestionLetter = 'a';
      }
    }

    // Get the highest sortOrder
    const lastQuestion = await prisma.question.findFirst({
      where: { surveyId: params.id },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastQuestion?.sortOrder ?? 0) + 1;

    const surveyjsName = subQuestionLetter
      ? `q${resolvedQuestionNumber}${subQuestionLetter}`
      : `q${resolvedQuestionNumber}`;

    // Create question with categories
    const question = await prisma.question.create({
      data: {
        surveyId: params.id,
        text,
        questionType,
        questionNumber: resolvedQuestionNumber,
        subQuestionLetter,
        parentQuestionId: parentQuestionId || null,
        surveyjsName,
        isRequired,
        isReversed,
        weight,
        sortOrder,
        config: config ?? undefined,
        categories: {
          create: categoryIds.map((categoryId: string) => ({
            categoryId,
          })),
        },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Failed to create question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
