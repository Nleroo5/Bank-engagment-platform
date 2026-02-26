import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Plus, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage banks and their users
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Link>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No organizations
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new organization.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/organizations/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Organization
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/admin/organizations/${org.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {org.name}
                  </h3>
                  {org.sizeRange && (
                    <p className="mt-1 text-sm text-gray-500">
                      Size: {org.sizeRange}
                    </p>
                  )}
                  {org.locationCity && org.locationState && (
                    <p className="mt-1 text-sm text-gray-500">
                      {org.locationCity}, {org.locationState}
                    </p>
                  )}
                </div>
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-gray-200 pt-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {org._count.users}
                  </p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
