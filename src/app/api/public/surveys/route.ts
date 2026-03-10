import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/surveys
 *
 * Fetch survey data from PostgreSQL by survey ID.
 * Public endpoint — no auth required (used by anonymous survey shells).
 * Query params: surveyId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('surveyId');
    const surveyType = searchParams.get('surveyType');

    if (!surveyId && !surveyType) {
      return NextResponse.json(
        { error: 'surveyId or surveyType query parameter is required' },
        { status: 400 }
      );
    }

    const surveyInclude = {
      scale: true,
      sections: {
        include: {
          questions: {
            include: {
              categories: { include: { category: true } },
            },
            orderBy: { questionNumber: 'asc' as const },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      questions: {
        include: {
          categories: { include: { category: true } },
        },
        orderBy: { questionNumber: 'asc' as const },
      },
    };

    const survey = surveyId
      ? await prisma.survey.findUnique({ where: { id: surveyId }, include: surveyInclude })
      : await prisma.survey.findFirst({ where: { surveyType: surveyType!, status: 'ACTIVE' }, include: surveyInclude });

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // If survey has no sections, create a virtual section with all questions
    let sectionsData = survey.sections;
    if (sectionsData.length === 0 && survey.questions.length > 0) {
      sectionsData = [
        {
          id: 'virtual-section',
          surveyId: survey.id,
          title: survey.title,
          description: survey.description,
          sortOrder: 1,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt,
          questions: survey.questions,
        },
      ];
    }

    // Transform to match the expected survey shell format
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
      sections: sectionsData.map((section) => ({
        _id: section.id,
        _type: 'section',
        title: section.title,
        sortOrder: section.sortOrder,
        directions: section.description || '',
        description: section.description,
        questions: section.questions.map((question) => {
          // Extract config fields from JSON config
          const config = question.config as Record<string, unknown> | null;

          return {
            _id: question.id,
            _type: 'question',
            number: question.questionNumber,
            text: question.text,
            isReversed: question.isReversed,
            anchorText: (config?.anchorText as string) || null,
            fieldType: (config?.fieldType as string) || null,
            config: config || null,
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
          };
        }),
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
