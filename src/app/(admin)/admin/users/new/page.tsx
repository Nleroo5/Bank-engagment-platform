import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/helpers';
import { NewUserForm } from '@/components/admin/NewUserForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  const session = await getSession();
  const currentRole = (session?.user as { role?: string } | undefined)?.role ?? 'VIEWER';

  const organizations = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">New User</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new user to the platform
        </p>
      </div>

      <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <NewUserForm organizations={organizations} currentUserRole={currentRole} />
      </div>
    </div>
  );
}
