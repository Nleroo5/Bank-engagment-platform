import { prisma } from '@/lib/prisma';
import { ReportsGrid } from '@/components/admin/ReportsGrid';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function ReportsListPage() {
  // Fetch only non-deleted campaigns with completed/active status
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      status: { in: ['COMPLETED', 'ACTIVE'] },
      deletedAt: null, // Exclude deleted campaigns
    },
    include: {
      organization: true,
      // Count BOTH tracked invitations AND anonymous responses
      _count: {
        select: {
          invitations: true, // Total tracked invitations
          anonymousResponses: true, // Total anonymous sessions (completed + pending)
        },
      },
      // Get completed tracked invitations
      invitations: {
        where: {
          status: 'COMPLETED',
        },
      },
      // Get completed anonymous responses
      anonymousResponses: {
        where: {
          completedAt: { not: null },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          View survey results and analytics for completed campaigns
        </p>
      </div>

      <ReportsGrid campaigns={campaigns} />
    </div>
  );
}
