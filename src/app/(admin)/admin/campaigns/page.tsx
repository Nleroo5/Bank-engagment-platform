import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus } from 'lucide-react';
import { CampaignsTable } from '@/components/admin/CampaignsTable';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      organization: true,
      anonymousResponses: {
        where: {
          completedAt: {
            not: null,
          },
        },
      },
      _count: {
        select: {
          anonymousResponses: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage survey campaigns and track response rates
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No campaigns yet</p>
          <Link
            href="/admin/campaigns/new"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create your first campaign
          </Link>
        </div>
      ) : (
        <CampaignsTable campaigns={campaigns} />
      )}
    </div>
  );
}
