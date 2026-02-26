import { prisma } from '@/lib/prisma';
import { ReportsGrid } from '@/components/admin/ReportsGrid';
import { Pagination, PAGE_SIZE } from '@/components/ui/Pagination';

// Force dynamic rendering - admin pages need database access at runtime
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ReportsListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const where = {
    status: { in: ['COMPLETED', 'ACTIVE'] as string[] },
    deletedAt: null,
  };

  const [campaigns, totalCount] = await Promise.all([
    prisma.surveyCampaign.findMany({
      where,
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.surveyCampaign.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          View survey results and analytics for completed campaigns
        </p>
      </div>

      <ReportsGrid campaigns={campaigns} />
      {campaigns.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/reports"
        />
      )}
    </div>
  );
}
