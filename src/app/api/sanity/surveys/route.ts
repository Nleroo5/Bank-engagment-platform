import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/sanity/surveys
 *
 * Fetch survey data from PostgreSQL by survey ID
 * Query params: surveyId
 *
 * NOTE: Despite the "sanity" in the URL, this fetches from PostgreSQL
 * because campaigns reference the PostgreSQL surveys table, not Sanity.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');

    if (!surveyId) {
      return NextResponse.json(
        { error: 'surveyId query parameter is required' },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
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
              orderBy: { questionNumber: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Transform to match the expected Sanity format
    const transformedSurvey = {
      _id: survey.id,
      _type: 'survey',
      title: survey.title,
      surveyType: survey.surveyType,
      surveyNumber: survey.surveyNumber,
      instructions: survey.description || '',
      scale: survey.scale
        ? {
            _id: survey.scale.id,
            _type: 'scale',
            name: survey.scale.name,
            scaleType: survey.scale.scaleType,
            min: survey.scale.min,
            max: survey.scale.max,
            minLabel: '',
            maxLabel: '',
            midLabel: '',
            labels: survey.scale.labels || [],
          }
        : null,
      sections: survey.sections.map((section) => ({
        _id: section.id,
        _type: 'section',
        title: section.title,
        sortOrder: section.sortOrder,
        directions: section.description || '',
        description: section.description,
        questions: section.questions.map((question) => ({
          _id: question.id,
          _type: 'question',
          number: question.questionNumber,
          text: question.text,
          isReversed: question.isReversed,
          anchorText: question.anchorText,
          fieldType: question.fieldType,
          category: question.categories[0]?.category
            ? {
                _id: question.categories[0].category.id,
                _type: 'category',
                name: question.categories[0].category.name,
                colorCode: question.categories[0].category.colorCode,
                description: question.categories[0].category.description,
                sortOrder: question.categories[0].category.sortOrder,
                weight: question.categories[0].category.weight,
              }
            : null,
        })),
      })),
    };

    return NextResponse.json(transformedSurvey);
  } catch (error) {
    console.error('Error fetching survey from PostgreSQL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}
