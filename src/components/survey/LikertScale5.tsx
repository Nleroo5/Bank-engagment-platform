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
    <fieldset className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
      <legend className="sr-only">
        Question {questionNumber}: {questionText}
      </legend>
      <div className="mb-4">
        <div className="mb-2 flex items-start gap-3">
          <span className="flex-shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            Q{questionNumber}
          </span>
          <p
            className="flex-1 text-base font-medium text-gray-900"
            id={`question-${questionId}`}
          >
            {questionText}
          </p>
        </div>
        {anchorText && (
          <p className="ml-14 text-sm italic text-gray-600">{anchorText}</p>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <div
          className="flex items-center justify-between gap-2"
          role="radiogroup"
          aria-labelledby={`question-${questionId}`}
        >
          {SCALE_LABELS.map((item) => (
            <label
              key={item.value}
              className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border-2 p-3 transition-all ${
                selectedValue === item.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
              <span
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  selectedValue === item.value
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
                aria-hidden="true"
              >
                {item.value}
              </span>
              <span
                className={`text-center text-xs ${
                  selectedValue === item.value
                    ? 'font-medium text-primary-900'
                    : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        <div
          className="space-y-2"
          role="radiogroup"
          aria-labelledby={`question-${questionId}`}
        >
          {SCALE_LABELS.map((item) => (
            <label
              key={item.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                selectedValue === item.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name={questionId}
                value={item.value}
                checked={selectedValue === item.value}
                onChange={() => handleChange(item.value)}
                disabled={disabled}
                className="h-5 w-5 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={item.label}
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">{item.label}</span>
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
