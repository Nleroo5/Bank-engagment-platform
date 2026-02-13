import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  try {
    const body = await request.json();
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

    // Get all questions in order
    const allQuestions = await prisma.question.findMany({
      where: { surveyId: params.id },
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

    // Check if we can move in the requested direction
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === allQuestions.length - 1)
    ) {
      return NextResponse.json(
        { error: 'Cannot move question in that direction' },
        { status: 400 }
      );
    }

    // Swap sortOrder with adjacent question
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapQuestion = allQuestions[swapIndex];

    // TypeScript safety check (should never happen due to bounds check above)
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder question:', error);
    return NextResponse.json(
      { error: 'Failed to reorder question' },
      { status: 500 }
    );
  }
}
