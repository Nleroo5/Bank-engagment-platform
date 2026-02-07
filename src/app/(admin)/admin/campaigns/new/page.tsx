import { prisma } from '@/lib/prisma';
import { getAllSurveys } from '@/lib/sanity';
import { NewCampaignForm } from '@/components/admin/NewCampaignForm';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  // Fetch organizations from database
  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Fetch active surveys from Sanity
  const surveys = await getAllSurveys();
  const activeSurveys = surveys.filter((survey) => survey.isActive);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="mt-1 text-sm text-gray-500">
          Set up a new survey campaign for your organization
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <NewCampaignForm
          organizations={organizations}
          surveys={activeSurveys}
        />
      </div>
    </div>
  );
}
