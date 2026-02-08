import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FileBarChart, Users, Calendar } from 'lucide-react';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function ReportsListPage() {
  // Fetch campaigns (show all - no role-based filtering)
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      status: { in: ['COMPLETED', 'ACTIVE'] },
    },
    include: {
      organization: true,
      _count: {
        select: {
          invitations: true,
        },
      },
      invitations: {
        where: {
          status: 'COMPLETED',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const getResponseRate = (
    invitations: { status: string }[],
    totalInvited: number
  ) => {
    if (totalInvited === 0) return 0;
    return Math.round((invitations.length / totalInvited) * 100);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          View survey results and analytics for completed campaigns
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FileBarChart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No reports available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Complete a campaign to view its report.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/campaigns"
              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              View Campaigns
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const completedCount = campaign.invitations.length;
            const totalInvitations = campaign._count.invitations;
            const responseRate = getResponseRate(
              campaign.invitations,
              totalInvitations || 1
            );

            return (
              <Link
                key={campaign.id}
                href={`/admin/reports/${campaign.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {campaign.surveyTitle}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {campaign.organization.name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      campaign.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="mr-2 h-4 w-4" />
                    <span>
                      {completedCount} / {totalInvitations} responses
                    </span>
                    <span className="ml-2 font-medium text-primary-600">
                      ({responseRate}%)
                    </span>
                  </div>

                  {campaign.endDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>
                        Ended{' '}
                        {new Date(campaign.endDate).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">View Report</span>
                    <span className="text-primary-600">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
