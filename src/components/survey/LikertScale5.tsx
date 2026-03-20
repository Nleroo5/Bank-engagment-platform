'use client';

import { useState, useEffect } from 'react';

interface LikertScale5Props {
  questionId: string;
  questionNumber: number;
  questionText: string;
  anchorText?: string;
  value?: number;
  onChange: (questionId: string, value: number) => void;
  disabled?: boolean;
  displayLabel?: string;
}

const SCALE_LABELS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export function LikertScale5({
  questionId,
  questionNumber,
  questionText,
  anchorText,
  value,
  onChange,
  disabled = false,
  displayLabel,
}: LikertScale5Props) {
  const [selectedValue, setSelectedValue] = useState<number | undefined>(value);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const handleChange = (newValue: number) => {
    setSelectedValue(newValue);
    onChange(questionId, newValue);
  };

  return (
    <fieldset>
      <legend className="sr-only">
        Question {displayLabel ?? questionNumber}: {questionText}
      </legend>

      {/* Question Text - Apple Style: Large, Bold, Prominent */}
      <div className="mb-8">
        <p
          className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
          id={`question-${questionId}`}
        >
          {questionText}
        </p>
        {anchorText && (
          <p className="mt-3 text-base italic text-gray-500">{anchorText}</p>
        )}
      </div>

      {/* Desktop view - iOS-style Cards */}
      <div className="hidden md:block">
        <div
          className="flex items-stretch justify-between gap-3"
          role="radiogroup"
          aria-labelledby={`question-${questionId}`}
        >
          {SCALE_LABELS.map((item) => (
            <label
              key={item.value}
              className={`group relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 transition-all duration-200 ${
                selectedValue === item.value
                  ? 'scale-105 border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/30'
                  : 'border-gray-200 bg-gray-50 hover:scale-105 hover:border-gray-300 hover:bg-white hover:shadow-md'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              <input
                type="radio"
                name={questionId}
                value={item.value}
                checked={selectedValue === item.value}
                onChange={() => handleChange(item.value)}
                disabled={disabled}
                className="sr-only"
                aria-label={item.label}
              />

              {/* Checkmark for selected state */}
              {selectedValue === item.value && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <span
                className={`mb-3 text-center text-base font-semibold ${
                  selectedValue === item.value
                    ? 'text-primary-900'
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}
              >
                {item.label}
              </span>
              <span
                className={`text-sm ${
                  selectedValue === item.value
                    ? 'text-primary-600'
                    : 'text-gray-500'
                }`}
              >
                {item.value}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Mobile view - iOS-style Stacked Cards */}
      <div className="md:hidden">
        <div
          className="space-y-3"
          role="radiogroup"
          aria-labelledby={`question-${questionId}`}
        >
          {SCALE_LABELS.map((item) => (
            <label
              key={item.value}
              className={`group relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-5 transition-all duration-200 ${
                selectedValue === item.value
                  ? 'scale-105 border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20'
                  : 'border-gray-200 bg-gray-50 active:scale-[0.98] active:bg-white'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              <input
                type="radio"
                name={questionId}
                value={item.value}
                checked={selectedValue === item.value}
                onChange={() => handleChange(item.value)}
                disabled={disabled}
                className="sr-only"
                aria-label={item.label}
              />

              {/* Radio Circle */}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                selectedValue === item.value
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300 bg-white'
              }`}>
                {selectedValue === item.value && (
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <span className={`text-base font-semibold ${
                  selectedValue === item.value
                    ? 'text-primary-900'
                    : 'text-gray-900'
                }`}>
                  {item.label}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({item.value})
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
