import { prisma } from '@/lib/prisma';
import { getAllSurveys } from '@/lib/sanity';
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

  // Fetch active surveys from Sanity with error handling
  let activeSurveys: SurveyListItem[] = [];
  let surveyError: string | null = null;

  try {
    console.log('[NewCampaignPage] Fetching surveys from Sanity...');
    const surveys = await getAllSurveys();
    console.log(`[NewCampaignPage] Got ${surveys.length} total surveys`);
    activeSurveys = surveys.filter((survey) => survey.isActive);
    console.log(
      `[NewCampaignPage] Filtered to ${activeSurveys.length} active surveys`
    );
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
