import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Building2, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface OrganizationDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const organization = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { users: true },
      },
      campaigns: {
        where: { deletedAt: null },
        include: {
          _count: {
            select: { anonymousResponses: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/organizations"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-3">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {organization.name}
            </h1>
            {organization.locationCity && (
              <p className="mt-1 text-sm text-gray-500">
                {[organization.locationCity, organization.locationState, organization.locationCountry]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-500">Total Users</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {organization._count.users}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {organization.campaigns.filter((c) => c.status === 'ACTIVE').length}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {organization.campaigns.length}
          </p>
        </div>
      </div>

      {/* Organization Details */}
      {(organization.sizeRange || organization.locationCountry) && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {organization.sizeRange && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Size</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.sizeRange}</dd>
              </div>
            )}
            {organization.locationCountry && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.locationCountry}</dd>
              </div>
            )}
            {organization.locationState && (
              <div>
                <dt className="text-sm font-medium text-gray-500">State</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.locationState}</dd>
              </div>
            )}
            {organization.locationCity && (
              <div>
                <dt className="text-sm font-medium text-gray-500">City</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.locationCity}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Campaigns List */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500">
            All survey campaigns for this organization
          </p>
        </div>

        {organization.campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No campaigns yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {organization.campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {campaign.surveyTitle}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                    {campaign.accessCode && (
                      <span>
                        Code:{' '}
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                          {campaign.accessCode}
                        </code>
                      </span>
                    )}
                    <span>{campaign._count.anonymousResponses} responses</span>
                    {campaign.endDate && (
                      <span>
                        Ends{' '}
                        {new Date(campaign.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/campaigns/${campaign.id}`}
                  className="ml-4 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
