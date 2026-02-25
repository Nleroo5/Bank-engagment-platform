import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">404</h1>
        <p className="mb-6 text-gray-600">This page does not exist.</p>
        <Link
          href="/"
          className="text-primary-600 underline hover:text-primary-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
