import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ReportView } from '@/components/reports/ReportView';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { ArrowLeft, Calendar, Building2 } from 'lucide-react';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

interface ReportPageProps {
  params: { campaignId: string };
}

export default async function ReportPage({ params }: ReportPageProps) {
  // Fetch campaign for header information
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.campaignId },
    include: {
      organization: true,
    },
  });

  if (!campaign) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">
            Campaign not found
          </h3>
          <p className="mt-2 text-sm text-red-700">
            The campaign you are looking for does not exist.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/reports"
              className="text-sm font-medium text-red-800 hover:text-red-900"
            >
              Back to Reports →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reports
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign.surveyTitle}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Building2 className="mr-2 h-4 w-4" />
                <span>{campaign.organization.name}</span>
              </div>

              {campaign.startDate && campaign.endDate && (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>
                    {new Date(campaign.startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(campaign.endDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  campaign.status === 'COMPLETED'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {campaign.status}
              </span>
            </div>
          </div>

          <ExportButtons
            campaignId={params.campaignId}
            surveyTitle={campaign.surveyTitle}
          />
        </div>
      </div>

      {/* Report Content */}
      <ReportView campaignId={params.campaignId} />
    </div>
  );
}
