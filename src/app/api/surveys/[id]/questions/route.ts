import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      orderBy: {
        sortOrder: 'asc',
      },
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
    const body = await request.json();
    const {
      text,
      questionType,
      questionNumber,
      isRequired = true,
      isReversed = false,
      categoryIds = [],
    } = body;

    // Validate required fields
    if (!text || !questionType || !questionNumber) {
      return NextResponse.json(
        { error: 'Text, type, and number are required' },
        { status: 400 }
      );
    }

    // Get the highest sortOrder
    const lastQuestion = await prisma.question.findFirst({
      where: { surveyId: params.id },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastQuestion?.sortOrder ?? 0) + 1;

    // Create question with categories
    const question = await prisma.question.create({
      data: {
        surveyId: params.id,
        text,
        questionType,
        questionNumber,
        surveyjsName: `q${questionNumber}`,
        isRequired,
        isReversed,
        sortOrder,
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
