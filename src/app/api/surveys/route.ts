import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        scale: true,
        _count: {
          select: {
            questions: true,
            campaigns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error('Failed to fetch surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      surveyType,
      surveyNumber,
      status = 'DRAFT',
      scaleId,
    } = body;

    // Validate required fields
    if (!title || !surveyType) {
      return NextResponse.json(
        { error: 'Title and survey type are required' },
        { status: 400 }
      );
    }

    // Create survey
    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        surveyType,
        surveyNumber,
        status,
        scaleId,
        surveyjsSchema: {}, // Empty for now - we'll build this later
      },
      include: {
        scale: true,
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error('Failed to create survey:', error);
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    );
  }
}
