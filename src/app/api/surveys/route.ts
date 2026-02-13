import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating/updating surveys
const surveySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  surveyType: z.enum(['likert3', 'likert5']),
  surveyNumber: z.string().optional(),
  surveyjsSchema: z.record(z.unknown()), // JSON schema from SurveyJS
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  scaleId: z.string().optional(),
});

// GET /api/surveys - List all surveys
export async function GET() {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        scale: true,
        _count: {
          select: {
            questions: true,
            campaigns: true,
            sections: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
}

// POST /api/surveys - Create a new survey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = surveySchema.parse(body);

    // Create the survey
    const survey = await prisma.survey.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        surveyType: validatedData.surveyType,
        surveyNumber: validatedData.surveyNumber,
        surveyjsSchema: validatedData.surveyjsSchema as object,
        status: validatedData.status,
        scaleId: validatedData.scaleId,
        version: 1,
      },
      include: {
        scale: true,
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating survey:', error);
    return NextResponse.json(
      { error: 'Failed to create survey' },
      { status: 500 }
    );
  }
}
