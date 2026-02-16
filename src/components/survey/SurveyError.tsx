import Image from 'next/image';

interface SurveyErrorProps {
  title: string;
  message: string;
  details?: string;
  icon?: 'error' | 'completed' | 'locked' | 'calendar';
}

export function SurveyError({
  title,
  message,
  details,
  icon = 'error',
}: SurveyErrorProps) {
  const iconMap = {
    error: (
      <svg
        className="mx-auto h-16 w-16 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    completed: (
      <svg
        className="mx-auto h-16 w-16 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    locked: (
      <svg
        className="mx-auto h-16 w-16 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    calendar: (
      <svg
        className="mx-auto h-16 w-16 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-red.png"
            alt="Logo"
            width={180}
            height={60}
            priority
            className="h-auto w-auto"
          />
        </div>

        <div className="rounded-lg bg-white p-8 text-center shadow-lg">
          {/* Icon */}
          <div className="mb-6">{iconMap[icon]}</div>

          {/* Title */}
          <h1 className="mb-4 text-2xl font-bold text-gray-900">{title}</h1>

          {/* Message */}
          <p className="mb-4 text-base text-gray-600">{message}</p>

          {/* Optional Details */}
          {details && <p className="text-sm text-gray-500">{details}</p>}

          {/* Help Text */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your survey
              administrator or check your invitation email for the correct link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
