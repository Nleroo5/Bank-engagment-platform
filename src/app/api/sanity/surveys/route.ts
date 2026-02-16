import { NextRequest, NextResponse } from 'next/server';
import { getSurveyById } from '@/lib/sanity/queries';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/sanity/surveys
 *
 * Fetch survey data from Sanity by survey ID
 * Query params: surveyId
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

    const survey = await getSurveyById(surveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error('Error fetching survey from Sanity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}
