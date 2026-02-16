'use client';

import Image from 'next/image';
import { CheckCircle } from 'lucide-react';
import type { Survey } from '@/types/survey';

interface CompletionScreenProps {
  survey: Survey;
}

export function CompletionScreen({ survey }: CompletionScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
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
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>

        <h1 className="mb-4 text-3xl font-bold text-gray-900">Thank You!</h1>

        {survey.completionMessage ? (
          <p className="mb-6 text-lg text-gray-700">
            {survey.completionMessage}
          </p>
        ) : (
          <p className="mb-6 text-lg text-gray-700">
            Your responses have been submitted successfully. We appreciate your
            time and valuable feedback.
          </p>
        )}

        <div className="rounded-md bg-green-50 p-4">
          <p className="text-base text-green-800">
            Your responses are confidential and will be used to improve our
            organization.
          </p>
        </div>

        <div className="mt-8 text-base text-gray-500">
          You may now close this window.
        </div>
      </div>
    </div>
  );
}
