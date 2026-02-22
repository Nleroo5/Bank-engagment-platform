'use client';

import Image from 'next/image';
import type { Survey } from '@/types/survey';
import { Clock } from 'lucide-react';

interface WelcomeScreenProps {
  survey: Survey;
  onBegin: () => void;
}

export function WelcomeScreen({ survey, onBegin }: WelcomeScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Logo Header */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/header-logo.png"
          alt="Logo"
          width={260}
          height={87}
          priority
          className="h-auto w-auto"
        />
      </div>

      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          {survey.title}
        </h1>

        {survey.welcomeMessage && (
          <p className="mb-6 text-lg text-gray-700">{survey.welcomeMessage}</p>
        )}

        {survey.estimatedMinutes && (
          <div className="mb-6 flex items-center gap-2 text-gray-600">
            <Clock className="h-5 w-5" />
            <span>Estimated time: {survey.estimatedMinutes} minutes</span>
          </div>
        )}

        {survey.instructions && (
          <div className="mb-6 rounded-md bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">Instructions</h2>
            <div className="prose prose-sm text-blue-800">
              {typeof survey.instructions === 'string' ? (
                <p>{survey.instructions}</p>
              ) : (
                <p>
                  Please read each statement carefully and select the option
                  that best represents your view.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-2 text-base text-gray-600">
          <p>
            • Your responses are confidential and will be aggregated with others
          </p>
          <p>• You can save your progress and return later</p>
          <p>• All questions must be answered to complete the survey</p>
        </div>

        <button
          onClick={onBegin}
          className="w-full rounded-md bg-primary-600 px-6 py-3 text-lg font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Begin Survey
        </button>
      </div>
    </div>
  );
}
