import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      include: {
        scale: true,
        sections: {
          include: {
            questions: {
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
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        questions: {
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
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Failed to fetch survey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if survey has campaigns
    const campaignCount = await prisma.surveyCampaign.count({
      where: {
        surveyId: params.id,
      },
    });

    if (campaignCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete survey with active campaigns' },
        { status: 400 }
      );
    }

    // Delete survey (cascade will handle questions and sections)
    await prisma.survey.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete survey:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, description, surveyType, surveyNumber, status, scaleId } =
      body;

    // Validate required fields
    if (!title || !surveyType) {
      return NextResponse.json(
        { error: 'Title and survey type are required' },
        { status: 400 }
      );
    }

    // Update survey
    const survey = await prisma.survey.update({
      where: { id: params.id },
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
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Failed to update survey:', error);
    return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    );
  }
}
