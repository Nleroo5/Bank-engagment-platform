import { prisma } from '@/lib/prisma';
import { ReportsGrid } from '@/components/admin/ReportsGrid';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

export default async function ReportsListPage() {
  const campaigns = await prisma.surveyCampaign.findMany({
    where: {
      status: { in: ['COMPLETED', 'ACTIVE'] },
      deletedAt: null,
    },
    include: {
      organization: true,
      _count: {
        select: {
          anonymousResponses: true,
        },
      },
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
