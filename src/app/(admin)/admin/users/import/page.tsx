import { prisma } from '@/lib/prisma';
import { CSVImportForm } from '@/components/admin/CSVImportForm';

export default async function ImportUsersPage() {
  // Fetch all organizations (no role-based filtering)
  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Users from CSV</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file to create multiple users at once
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CSVImportForm organizations={organizations} />
      </div>
    </div>
  );
}
