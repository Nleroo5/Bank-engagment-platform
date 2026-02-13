import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating surveys
const updateSurveySchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  surveyType: z.enum(['likert3', 'likert5']).optional(),
  surveyNumber: z.string().optional(),
  surveyjsSchema: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  scaleId: z.string().optional(),
});

// GET /api/surveys/[id] - Get a single survey
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        scale: true,
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}

// PUT /api/surveys/[id] - Update a survey
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateSurveySchema.parse(body);

    // Check if survey exists
    const existingSurvey = await prisma.survey.findUnique({
      where: { id },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!existingSurvey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // If survey is used in campaigns, increment version
    const shouldIncrementVersion =
      existingSurvey._count.campaigns > 0 && validatedData.surveyjsSchema;

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        surveyType: validatedData.surveyType,
        surveyNumber: validatedData.surveyNumber,
        surveyjsSchema: validatedData.surveyjsSchema
          ? (validatedData.surveyjsSchema as object)
          : undefined,
        status: validatedData.status,
        ...(validatedData.scaleId !== undefined && {
          scale: { connect: { id: validatedData.scaleId } },
        }),
        version: shouldIncrementVersion
          ? existingSurvey.version + 1
          : existingSurvey.version,
      },
      include: {
        scale: true,
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating survey:', error);
    return NextResponse.json(
      { error: 'Failed to update survey' },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id] - Delete a survey
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if survey exists and count campaigns
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Prevent deletion if survey is used in campaigns
    if (survey._count.campaigns > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete survey',
          message: `This survey is used in ${survey._count.campaigns} campaign(s). Archive it instead.`,
        },
        { status: 400 }
      );
    }

    // Delete the survey (cascades to sections, questions, question_categories)
    await prisma.survey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey' },
      { status: 500 }
    );
  }
}
