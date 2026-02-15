import { prisma } from '@/lib/prisma';
import { NewCampaignForm } from '@/components/admin/NewCampaignForm';
import type { SurveyListItem } from '@/types/survey';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  // Fetch organizations from database
  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch active surveys from PostgreSQL
  let activeSurveys: SurveyListItem[] = [];
  let surveyError: string | null = null;

  try {
    console.log('[NewCampaignPage] Fetching surveys from PostgreSQL...');
    const surveys = await prisma.survey.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[NewCampaignPage] Got ${surveys.length} active surveys`);

    // Transform to match SurveyListItem type
    activeSurveys = surveys.map((survey) => ({
      _id: survey.id,
      title: survey.title,
      slug: {
        current: survey.id, // PostgreSQL uses ID instead of Sanity slug
      },
      surveyNumber: survey.surveyNumber
        ? parseInt(survey.surveyNumber, 10)
        : undefined,
      surveyType: survey.surveyType,
      isActive: survey.status === 'ACTIVE',
      estimatedMinutes: undefined, // Not stored in PostgreSQL surveys
    }));
  } catch (error) {
    console.error('[NewCampaignPage] Error fetching surveys:', error);
    surveyError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Campaign
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a new survey campaign for your organization
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {surveyError && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">
              Error loading surveys
            </h3>
            <p className="mt-2 text-sm text-red-700">{surveyError}</p>
            <p className="mt-2 text-sm text-red-600">
              Check server logs or Vercel deployment logs for more details.
            </p>
          </div>
        )}
        <NewCampaignForm
          organizations={organizations}
          surveys={activeSurveys}
        />
      </div>
    </div>
  );
}
