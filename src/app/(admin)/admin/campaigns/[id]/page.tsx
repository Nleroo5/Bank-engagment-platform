import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CampaignActions } from '@/components/admin/CampaignActions';
import { CampaignHeaderActions } from '@/components/admin/CampaignHeaderActions';
import { ArrowLeft, Link as LinkIcon, Copy, Shield } from 'lucide-react';

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
      invitations: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'OPENED':
        return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate response metrics based on campaign type
  const isAnonymous = campaign.isAnonymous;
  const completedCount = isAnonymous
    ? campaign.anonymousResponses.filter((r) => r.completedAt !== null).length
    : campaign.invitations.filter((inv) => inv.status === 'COMPLETED').length;

  const totalCount = isAnonymous
    ? campaign.maxResponses || campaign.anonymousResponses.length
    : campaign.invitations.length;

  const responseRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Generate public link for anonymous surveys
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const publicLink = isAnonymous ? `${baseUrl}/a/${campaign.accessCode}` : null;

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
              {isAnonymous && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                  <Shield className="h-4 w-4" />
                  Anonymous
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.organization.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
                campaign.status
              )}`}
            >
              {campaign.status}
            </span>
            <CampaignHeaderActions campaign={campaign} />
          </div>
        </div>
      </div>

      {/* Anonymous Survey Public Link */}
      {isAnonymous && publicLink && (
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
                Share this link with respondents. They&apos;ll need to enter the access code to begin.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicLink}
                  className="flex-1 rounded-md border border-blue-300 bg-white px-3 py-2 font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(publicLink)}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
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
                    <span className="font-semibold">Maximum Responses:</span> {campaign.maxResponses}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Info Summary */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Start Date</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {campaign.startDate
              ? new Date(campaign.startDate).toLocaleDateString()
              : 'Not set'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">End Date</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {campaign.endDate
              ? new Date(campaign.endDate).toLocaleDateString()
              : 'No expiration'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            {isAnonymous ? 'Total Responses' : 'Total Invitations'}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {isAnonymous ? campaign.anonymousResponses.length : totalCount}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            {isAnonymous ? 'Completion Rate' : 'Response Rate'}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {responseRate}%
          </p>
          <p className="text-sm text-gray-500">
            {completedCount} {isAnonymous ? 'completed' : `of ${totalCount}`}
          </p>
        </div>
      </div>

      {/* Response Rate Progress Bar */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {isAnonymous ? 'Completion' : 'Response'} Progress
        </h2>
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${responseRate}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {completedCount} completed •{' '}
          {isAnonymous
            ? `${campaign.anonymousResponses.filter((r) => !r.completedAt).length} in progress`
            : `${totalCount - completedCount} pending`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <CampaignActions campaign={campaign} />
      </div>

      {/* Anonymous Responses Summary OR Invitations List */}
      {isAnonymous ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Anonymous Responses
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Individual responses are anonymized and cannot be traced to specific respondents
            </p>
          </div>

          {campaign.anonymousResponses.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                No responses yet. Share the public link to start collecting anonymous responses.
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
                    {campaign.anonymousResponses.filter((r) => !r.completedAt).length}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Privacy Note:</strong> For anonymity protection, individual response data is not shown.
                  View aggregate reports to analyze results while maintaining respondent privacy.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Invitations</h2>
            <p className="mt-1 text-sm text-gray-500">
              Survey invitations sent to organization members
            </p>
          </div>

          {campaign.invitations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">
                No invitations sent yet. Activate the campaign and send invitations to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Respondent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Opened At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Completed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {campaign.invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {invitation.user.name || 'Unnamed User'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {invitation.user.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            invitation.status
                          )}`}
                        >
                          {invitation.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {invitation.sentAt
                          ? new Date(invitation.sentAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {invitation.openedAt
                          ? new Date(invitation.openedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {invitation.completedAt
                          ? new Date(invitation.completedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
