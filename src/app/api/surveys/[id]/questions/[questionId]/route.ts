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
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    return authError(error);
  }

  try {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Failed to fetch question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
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
      isRequired,
      isReversed,
      weight,
      categoryIds = [],
      config,
    } = body;

    // Validate required fields
    if (!text || !questionType || questionNumber === undefined) {
      return NextResponse.json(
        { error: 'Text, type, and number are required' },
        { status: 400 }
      );
    }

    // Delete existing category associations
    await prisma.questionCategory.deleteMany({
      where: { questionId: params.questionId },
    });

    // Fetch existing question to preserve sub-question fields
    const existing = await prisma.question.findUnique({
      where: { id: params.questionId },
    });
    const subLetter = existing?.subQuestionLetter || '';
    const surveyjsName = subLetter
      ? `q${questionNumber}${subLetter}`
      : `q${questionNumber}`;

    // Update question with new categories
    const question = await prisma.question.update({
      where: { id: params.questionId },
      data: {
        text,
        questionType,
        questionNumber,
        surveyjsName,
        isRequired,
        isReversed,
        weight: weight ?? undefined,
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

    return NextResponse.json(question);
  } catch (error) {
    console.error('Failed to update question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    await requireAdmin();
  } catch (error) {
    return authError(error);
  }

  try {
    // Count sub-questions that will be cascade-deleted
    const subQuestionCount = await prisma.question.count({
      where: { parentQuestionId: params.questionId },
    });

    // Delete question (cascade will handle categories and sub-questions)
    await prisma.question.delete({
      where: { id: params.questionId },
    });

    return NextResponse.json({ success: true, deletedSubQuestions: subQuestionCount });
  } catch (error) {
    console.error('Failed to delete question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
