export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">
          Bank Engagement Survey Platform
        </h1>
        <p className="text-lg text-gray-600">
          Production-ready survey platform initialization complete.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold mb-2">Admin Dashboard</h2>
            <p className="text-sm text-gray-600">
              Coming soon: /admin/dashboard
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold mb-2">Survey Portal</h2>
            <p className="text-sm text-gray-600">
              Coming soon: /s/[token]
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold mb-2">Reports</h2>
            <p className="text-sm text-gray-600">
              Coming soon: /admin/reports
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
