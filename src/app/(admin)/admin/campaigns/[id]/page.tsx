import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CampaignActions } from '@/components/admin/CampaignActions';
import { ArrowLeft } from 'lucide-react';

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

  const completedCount = campaign.invitations.filter(
    (inv) => inv.status === 'COMPLETED'
  ).length;
  const totalCount = campaign.invitations.length;
  const responseRate =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {campaign.surveyTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.organization.name}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
              campaign.status
            )}`}
          >
            {campaign.status}
          </span>
        </div>
      </div>

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
          <p className="text-sm text-gray-500">Total Invitations</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {totalCount}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Response Rate</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {responseRate}%
          </p>
          <p className="text-sm text-gray-500">
            {completedCount} of {totalCount}
          </p>
        </div>
      </div>

      {/* Response Rate Progress Bar */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Response Progress
        </h2>
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${responseRate}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {completedCount} completed • {totalCount - completedCount} pending
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        <CampaignActions campaign={campaign} />
      </div>

      {/* Invitations List */}
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
              No invitations sent yet. Activate the campaign and send
              invitations to get started.
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
    </div>
  );
}
