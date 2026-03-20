import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';

function authError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(
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
    const { direction } = body;

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json(
        { error: 'Direction must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Get the current question
    const currentQuestion = await prisma.question.findUnique({
      where: { id: params.questionId },
    });

    if (!currentQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const isSubQuestion = !!currentQuestion.parentQuestionId;

    if (isSubQuestion) {
      // Sub-questions reorder among siblings by swapping letters
      const siblings = await prisma.question.findMany({
        where: { parentQuestionId: currentQuestion.parentQuestionId! },
        orderBy: { subQuestionLetter: 'asc' },
      });

      const currentIndex = siblings.findIndex((q) => q.id === params.questionId);
      if (currentIndex === -1) {
        return NextResponse.json({ error: 'Sub-question not found' }, { status: 404 });
      }

      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === siblings.length - 1)
      ) {
        return NextResponse.json({ error: 'Cannot move in that direction' }, { status: 400 });
      }

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const swapQuestion = siblings[swapIndex];
      if (!swapQuestion) {
        return NextResponse.json({ error: 'Invalid swap target' }, { status: 500 });
      }

      // Swap subQuestionLetter and sortOrder
      await prisma.$transaction([
        prisma.question.update({
          where: { id: currentQuestion.id },
          data: { subQuestionLetter: swapQuestion.subQuestionLetter, sortOrder: swapQuestion.sortOrder },
        }),
        prisma.question.update({
          where: { id: swapQuestion.id },
          data: { subQuestionLetter: currentQuestion.subQuestionLetter, sortOrder: currentQuestion.sortOrder },
        }),
      ]);
    } else {
      // Parent/standalone questions reorder among other parents
      const allQuestions = await prisma.question.findMany({
        where: { surveyId: params.id, parentQuestionId: null },
        orderBy: { sortOrder: 'asc' },
      });

      const currentIndex = allQuestions.findIndex(
        (q) => q.id === params.questionId
      );

      if (currentIndex === -1) {
        return NextResponse.json(
          { error: 'Question not found in survey' },
          { status: 404 }
        );
      }

      if (
        (direction === 'up' && currentIndex === 0) ||
        (direction === 'down' && currentIndex === allQuestions.length - 1)
      ) {
        return NextResponse.json(
          { error: 'Cannot move question in that direction' },
          { status: 400 }
        );
      }

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const swapQuestion = allQuestions[swapIndex];

      if (!swapQuestion) {
        return NextResponse.json(
          { error: 'Invalid swap target' },
          { status: 500 }
        );
      }

      await prisma.$transaction([
        prisma.question.update({
          where: { id: currentQuestion.id },
          data: { sortOrder: swapQuestion.sortOrder },
        }),
        prisma.question.update({
          where: { id: swapQuestion.id },
          data: { sortOrder: currentQuestion.sortOrder },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder question:', error);
    return NextResponse.json(
      { error: 'Failed to reorder question' },
      { status: 500 }
    );
  }
}
