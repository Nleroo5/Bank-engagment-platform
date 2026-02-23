import { prisma } from '@/lib/prisma';
import { CSVImportForm } from '@/components/admin/CSVImportForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ImportUsersPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Import Users</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bulk import users from a CSV file
        </p>
      </div>

      <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <CSVImportForm organizations={organizations} />
      </div>
    </div>
  );
}
