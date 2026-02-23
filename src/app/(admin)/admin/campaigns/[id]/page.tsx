import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CampaignActions } from '@/components/admin/CampaignActions';
import { CampaignHeaderActions } from '@/components/admin/CampaignHeaderActions';
import { CopyButton } from '@/components/admin/CopyButton';
import { ArrowLeft, Link as LinkIcon, Shield } from 'lucide-react';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

interface CampaignDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
      anonymousResponses: {
        orderBy: {
          startedAt: 'desc',
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const completedCount = campaign.anonymousResponses.filter(
    (r) => r.completedAt !== null
  ).length;

  const totalCount = campaign.maxResponses || campaign.anonymousResponses.length;

  const responseRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const publicLink = `${baseUrl}/a/${campaign.accessCode}`;

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/campaigns"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {campaign.surveyTitle}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                <Shield className="h-4 w-4" />
                Anonymous
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.organization.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                campaign.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : campaign.status === 'DRAFT'
                    ? 'bg-gray-100 text-gray-800'
                    : campaign.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
              }`}
            >
              {campaign.status}
            </span>
            <CampaignHeaderActions campaign={campaign} />
          </div>
        </div>
      </div>

      {/* Public Survey Link */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-100 p-2">
            <LinkIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 font-semibold text-blue-900">
              Public Survey Link
            </h3>
            <p className="mb-3 text-sm text-blue-700">
              Share this link with respondents. They&apos;ll need to enter the
              access code to begin.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicLink}
                className="flex-1 rounded-md border border-blue-300 bg-white px-3 py-2 font-mono text-sm"
              />
              <CopyButton text={publicLink} />
            </div>
            <div className="mt-3 rounded-md bg-white p-3">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Access Code:</span>{' '}
                <code className="rounded bg-gray-100 px-2 py-1 font-mono text-blue-600">
                  {campaign.accessCode}
                </code>
              </p>
              {campaign.maxResponses && (
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-semibold">Maximum Responses:</span>{' '}
                  {campaign.maxResponses}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Info Summary */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Start Date</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {campaign.startDate
              ? new Date(campaign.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
              : 'Not set'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">End Date</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {campaign.endDate
              ? new Date(campaign.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
              : 'No expiration'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Responses</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {campaign.anonymousResponses.length}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {responseRate}%
          </p>
          <p className="text-sm text-gray-500">{completedCount} completed</p>
        </div>
      </div>

      {/* Response Rate Progress Bar */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Completion Progress
        </h2>
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${responseRate}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {completedCount} completed •{' '}
          {campaign.anonymousResponses.filter((r) => !r.completedAt).length} in progress
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <CampaignActions campaign={campaign} />
      </div>

      {/* Anonymous Responses Summary */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Anonymous Responses
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Individual responses are anonymized and cannot be traced to
            specific respondents
          </p>
        </div>

        {campaign.anonymousResponses.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">
              No responses yet. Share the public link to start collecting
              anonymous responses.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total Started</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {campaign.anonymousResponses.length}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-700">Completed</p>
                <p className="mt-1 text-2xl font-bold text-green-900">
                  {completedCount}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm text-orange-700">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-orange-900">
                  {
                    campaign.anonymousResponses.filter((r) => !r.completedAt)
                      .length
                  }
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>Privacy Note:</strong> For anonymity protection,
                individual response data is not shown. View aggregate reports
                to analyze results while maintaining respondent privacy.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
