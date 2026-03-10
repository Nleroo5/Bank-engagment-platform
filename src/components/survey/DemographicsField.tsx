'use client';

import { useState, useEffect } from 'react';

interface DemographicsFieldProps {
  questionId: string;
  questionNumber: number;
  questionText: string;
  fieldType: string;
  inputType: 'text' | 'dropdown' | 'radio';
  options: string[];
  allowOther: boolean;
  placeholder: string;
  value?: string;
  onChange: (questionId: string, value: string) => void;
  disabled?: boolean;
}

export function DemographicsField({
  questionId,
  questionNumber,
  questionText,
  inputType,
  options,
  allowOther,
  placeholder,
  value = '',
  onChange,
  disabled = false,
}: DemographicsFieldProps) {
  // Merge "Other" into options if allowOther is true and not already present
  const effectiveOptions = allowOther && !options.includes('Other')
    ? [...options, 'Other']
    : options;

  const [selectedValue, setSelectedValue] = useState<string>(value);
  const [otherValue, setOtherValue] = useState<string>('');
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    setSelectedValue(value);
    if (allowOther && value) {
      if (value === 'Other' || !options.includes(value)) {
        setShowOther(true);
        if (value !== 'Other') {
          setOtherValue(value);
        }
      } else {
        setShowOther(false);
        setOtherValue('');
      }
    }
  }, [value, allowOther, options]);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);

    if (newValue === 'Other') {
      setShowOther(true);
      onChange(questionId, 'Other');
    } else {
      setShowOther(false);
      setOtherValue('');
      onChange(questionId, newValue);
    }
  };

  const handleOtherChange = (otherText: string) => {
    setOtherValue(otherText);
    onChange(questionId, otherText);
  };

  // Text input fields
  if (inputType === 'text') {
    return (
      <fieldset>
        <legend className="sr-only">
          Question {questionNumber}: {questionText}
        </legend>

        <div className="mb-8">
          <p
            className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
            id={`question-${questionId}`}
          >
            {questionText}
          </p>
        </div>

        <input
          id={questionId}
          type="text"
          inputMode="text"
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          placeholder={placeholder || 'Enter value'}
          aria-labelledby={`question-${questionId}`}
        />
      </fieldset>
    );
  }

  // Dropdown fields
  if (inputType === 'dropdown') {
    return (
      <fieldset>
        <legend className="sr-only">
          Question {questionNumber}: {questionText}
        </legend>

        <div className="mb-8">
          <p
            className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
            id={`question-${questionId}`}
          >
            {questionText}
          </p>
        </div>

        <select
          id={questionId}
          value={showOther ? 'Other' : selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          aria-labelledby={`question-${questionId}`}
        >
          <option value="">{placeholder || 'Select an option'}</option>
          {effectiveOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {allowOther && showOther && (
          <div className="mt-6">
            <input
              type="text"
              inputMode="text"
              value={otherValue}
              onChange={(e) => handleOtherChange(e.target.value)}
              disabled={disabled}
              placeholder="Please specify..."
              aria-label={`Specify other ${questionText.toLowerCase()}`}
              className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        )}
      </fieldset>
    );
  }

  // Radio group fields
  if (effectiveOptions.length === 0) return null;

  return (
    <fieldset>
      <legend className="sr-only">
        Question {questionNumber}: {questionText}
      </legend>

      <div className="mb-8">
        <p
          className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
          id={`question-${questionId}`}
        >
          {questionText}
        </p>
      </div>

      {/* Desktop view - iOS-style Cards */}
      <div className="hidden md:block">
        <div
          className="flex flex-wrap items-stretch justify-start gap-4"
          role="radiogroup"
          aria-labelledby={`question-${questionId}`}
        >
          {effectiveOptions.map((item) => (
            <label
              key={item}
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-6 py-8 transition-all duration-200 ${
                selectedValue === item
                  ? 'scale-105 border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/30'
                  : 'border-gray-200 bg-gray-50 hover:scale-105 hover:border-gray-300 hover:bg-white hover:shadow-md'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              style={{ minWidth: '140px' }}
            >
              <input
                type="radio"
                name={questionId}
                value={item}
                checked={selectedValue === item}
                onChange={() => handleChange(item)}
                disabled={disabled}
                className="sr-only"
                aria-label={item}
              />

              {selectedValue === item && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <span
                className={`text-center text-lg font-semibold ${
                  selectedValue === item
                    ? 'text-primary-900'
                    : 'text-gray-700 group-hover:text-gray-900'
                }`}
              >
                {item}
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
          {effectiveOptions.map((item) => (
            <label
              key={item}
              className={`group relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-6 transition-all duration-200 ${
                selectedValue === item
                  ? 'scale-105 border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20'
                  : 'border-gray-200 bg-gray-50 active:scale-[0.98] active:bg-white'
              } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              <input
                type="radio"
                name={questionId}
                value={item}
                checked={selectedValue === item}
                onChange={() => handleChange(item)}
                disabled={disabled}
                className="sr-only"
                aria-label={item}
              />

              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  selectedValue === item
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {selectedValue === item && (
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <span
                  className={`text-lg font-semibold ${
                    selectedValue === item ? 'text-primary-900' : 'text-gray-900'
                  }`}
                >
                  {item}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Show text input when "Other" is selected */}
      {allowOther && showOther && (
        <div className="mt-6">
          <input
            type="text"
            inputMode="text"
            value={otherValue}
            onChange={(e) => handleOtherChange(e.target.value)}
            disabled={disabled}
            placeholder="Please specify..."
            aria-label={`Specify other ${questionText.toLowerCase()}`}
            className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      )}
    </fieldset>
  );
}
