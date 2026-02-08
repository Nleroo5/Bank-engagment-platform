import { NewOrganizationForm } from '@/components/admin/NewOrganizationForm';

export const dynamic = 'force-dynamic';

export default async function NewOrganizationPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Organization
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a new bank organization and optionally create user accounts
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <NewOrganizationForm />
      </div>

      {/* CSV Import Section */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Bulk Import Users
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Need to add a large number of users? You can use CSV import after
          creating the organization.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          The CSV import feature will be available on the organization detail
          page after creation.
        </p>
      </div>
    </div>
  );
}
