'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ConfettiEffect } from './ConfettiEffect';
import type { Survey } from '@/types/survey';

interface CompletionScreenProps {
  survey: Survey;
}

export function CompletionScreen({ survey }: CompletionScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <ConfettiEffect />

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
        {/* Animated checkmark circle */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <motion.svg
              className="h-12 w-12 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
              />
            </motion.svg>
          </div>
        </motion.div>

        <motion.h1
          className="mb-4 text-3xl font-bold text-gray-900"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          Thank You!
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          {survey.completionMessage ? (
            <p className="mb-6 text-lg text-gray-700">{survey.completionMessage}</p>
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
        </motion.div>
      </div>
    </div>
  );
}
