import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { NewUserForm } from '@/components/admin/NewUserForm';

export default async function NewUserPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/admin/login');
  }

  // Fetch organizations
  const where =
    currentUser.role === 'SUPER_ADMIN'
      ? {}
      : { id: currentUser.organizationId || '' };

  const organizations = await prisma.organization.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new user account
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <NewUserForm
          organizations={organizations}
          currentUserRole={currentUser.role}
        />
      </div>
    </div>
  );
}
