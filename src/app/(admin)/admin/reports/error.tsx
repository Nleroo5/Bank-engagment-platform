'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ReportsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Reports] Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Report unavailable
        </h2>
        <p className="mb-6 text-sm text-gray-600">
          {error.message ||
            'The report could not be loaded. This may be a temporary issue with the survey data or a configuration problem.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Try again
          </button>
          <Link
            href="/admin/reports"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
