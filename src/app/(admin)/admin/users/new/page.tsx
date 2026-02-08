import { prisma } from '@/lib/prisma';
import { NewUserForm } from '@/components/admin/NewUserForm';

export default async function NewUserPage() {
  // Fetch all organizations (no role-based filtering)
  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new user account</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <NewUserForm
          organizations={organizations}
          currentUserRole="SUPER_ADMIN"
        />
      </div>
    </div>
  );
}
