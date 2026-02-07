export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Login Temporarily Unavailable
          </h2>
          <p className="mt-4 text-sm text-gray-600">
            The admin login is currently disabled. Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
}
