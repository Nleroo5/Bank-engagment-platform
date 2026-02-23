import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/helpers';
import { Plus, Upload, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  VIEWER: 'Viewer',
  RESPONDENT: 'Respondent',
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ORG_ADMIN: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-700',
  RESPONDENT: 'bg-green-100 text-green-800',
};

export default async function UsersPage() {
  const session = await getSession();
  const currentRole = (session?.user as { role?: string } | undefined)?.role ?? 'VIEWER';

  const users = await prisma.user.findMany({
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const canManage = currentRole === 'SUPER_ADMIN' || currentRole === 'ORG_ADMIN';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage platform users and their roles
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users/import"
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
            <Link
              href="/admin/users/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              New User
            </Link>
          </div>
        )}
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a user.
          </p>
          {canManage && (
            <div className="mt-6">
              <Link
                href="/admin/users/new"
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || '—'}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.organization?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
