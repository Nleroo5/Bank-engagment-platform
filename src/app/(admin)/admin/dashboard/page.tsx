import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Plus,
  Upload,
} from 'lucide-react';
import { RecentCampaignsTable } from '@/components/admin/RecentCampaignsTable';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Fetch stats (exclude deleted campaigns from all metrics)
  const [campaigns, users, invitations, anonymousCompleted, anonymousPending] =
    await Promise.all([
      // Total campaigns (active ones, not deleted)
      prisma.surveyCampaign.count({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),

      // Total users
      prisma.user.count(),

      // Invitations from non-deleted campaigns only
      prisma.invitation.findMany({
        where: {
          campaign: {
            deletedAt: null,
          },
        },
        select: {
          status: true,
        },
      }),

      // Completed anonymous responses
      prisma.anonymousResponse.count({
        where: {
          completedAt: { not: null },
          campaign: { deletedAt: null },
        },
      }),

      // Pending anonymous responses
      prisma.anonymousResponse.count({
        where: {
          completedAt: null,
          campaign: { deletedAt: null },
        },
      }),
    ]);

  // Calculate pending responses from tracked invitations (SENT or OPENED, not completed)
  const pendingTrackedInvitations = invitations.filter(
    (inv) => inv.status === 'SENT' || inv.status === 'OPENED'
  ).length;

  // Total pending responses = tracked + anonymous
  const pendingResponses = pendingTrackedInvitations + anonymousPending;

  // Calculate completion rate (both tracked and anonymous)
  const completedTrackedInvitations = invitations.filter(
    (inv) => inv.status === 'COMPLETED'
  ).length;
  const totalCompleted = completedTrackedInvitations + anonymousCompleted;
  const totalInvitations = invitations.length + anonymousCompleted + anonymousPending;

  const completionRate =
    totalInvitations > 0
      ? Math.round((totalCompleted / totalInvitations) * 100)
      : 0;

  // Fetch recent campaigns (exclude deleted)
  const recentCampaigns = await prisma.surveyCampaign.findMany({
    where: {
      deletedAt: null, // Exclude deleted campaigns
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
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to the Survey Administration Dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Active Campaigns */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Campaigns
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {campaigns}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{users}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Pending Responses */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Responses
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {pendingResponses}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Completion Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {completionRate}%
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="flex gap-4">
          <Link
            href="/admin/campaigns/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
          <Link
            href="/admin/users/import"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import Users
          </Link>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Campaigns
          </h2>
          <Link
            href="/admin/campaigns"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No campaigns yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new campaign.
            </p>
            <div className="mt-6">
              <Link
                href="/admin/campaigns/new"
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Link>
            </div>
          </div>
        ) : (
          <RecentCampaignsTable campaigns={recentCampaigns} />
        )}
      </div>
    </div>
  );
}
