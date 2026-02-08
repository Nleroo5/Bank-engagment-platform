import { NextResponse } from 'next/server';
import { getAllSurveys } from '@/lib/sanity';

/**
 * Debug endpoint to test Sanity connection
 * Visit: https://www.drivemoreleads.co/api/debug/sanity
 */
export async function GET() {
  try {
    console.log('[Debug] Testing Sanity connection...');
    console.log('[Debug] Project ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
    console.log('[Debug] Dataset:', process.env.NEXT_PUBLIC_SANITY_DATASET);
    console.log('[Debug] Token exists:', !!process.env.SANITY_API_TOKEN);

    const surveys = await getAllSurveys();
    console.log(`[Debug] Got ${surveys.length} surveys`);

    const activeSurveys = surveys.filter((s) => s.isActive);
    console.log(`[Debug] ${activeSurveys.length} active surveys`);

    return NextResponse.json({
      success: true,
      environment: {
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'not set',
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'not set',
        hasToken: !!process.env.SANITY_API_TOKEN,
        nodeEnv: process.env.NODE_ENV,
      },
      surveys: {
        total: surveys.length,
        active: activeSurveys.length,
        list: surveys.map((s) => ({
          id: s._id,
          title: s.title,
          surveyNumber: s.surveyNumber,
          isActive: s.isActive,
        })),
      },
    });
  } catch (error) {
    console.error('[Debug] Sanity error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
