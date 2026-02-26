'use client';

import { useState, useEffect } from 'react';

interface DemographicsFieldProps {
  questionId: string;
  questionNumber: number;
  questionText: string;
  fieldType: string;
  value?: string;
  onChange: (questionId: string, value: string) => void;
  disabled?: boolean;
}

// Field options as per requirements
const BANK_SIZES = [
  '<$100M',
  '$100 - $250M',
  '$250 - $499M',
  '$500 - $749M',
  '$750 - $999M',
  '$1 - $2.99B',
  '$3 - $4.99B',
  '$5 - $7.49B',
  '$7.5 - $9.99B',
  '$10 - $19.99B',
  '>$20B',
];

const DEVICES = ['Desktop / Laptop', 'Tablet', 'Mobile Phone'];

const EMPLOYMENT_STATUS = ['Full-time', 'Part-time', 'Peak-time'];

const GENDERS = ['Female', 'Male', 'Other'];

const TIME_AT_BANK = ['0-5 years', '6-10 years', '11-20 years', '> 20 years'];

const BANK_EXPERIENCE = [
  '0-5 years',
  '6-10 years',
  '11-20 years',
  '> 20 years',
];

const DIVISIONS = [
  'Administration',
  'Call Center',
  'Commercial Banking',
  'Credit Department',
  'Information Systems / Technology',
  'Loan Administration',
  'Operations',
  'Retail Banking',
  'Risk',
  'Wealth Management',
  'Other',
];

const JOB_ROLES = [
  'Branch Staff',
  'Branch Manager',
  'Call Center Operations',
  'C-Suite Executive',
  'Credit Underwriting',
  'Executive Management',
  'Finance',
  'Financial Advisors',
  'Human Resources',
  'Loan Administration',
  'Operations Staff',
  'Relationship Manager',
  'Risk',
  'Support Staff',
  'Technology Staff',
  'Other',
];

const COUNTRIES = ['United States', 'Canada'];

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

export function DemographicsField({
  questionId,
  questionNumber,
  questionText,
  fieldType,
  value = '',
  onChange,
  disabled = false,
}: DemographicsFieldProps) {
  const [selectedValue, setSelectedValue] = useState<string>(value);
  const [otherValue, setOtherValue] = useState<string>('');
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    setSelectedValue(value);
    // Check if value is "Other" or a custom "Other" value
    if ((fieldType === 'division' || fieldType === 'jobRole') && value) {
      const options = getOptionsForField(fieldType);
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
  }, [value, fieldType]);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);

    if (newValue === 'Other') {
      setShowOther(true);
      // Immediately notify parent so the question is marked as answered
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

  const getOptionsForField = (field: string): string[] => {
    switch (field) {
      case 'bankSize':
        return BANK_SIZES;
      case 'device':
        return DEVICES;
      case 'employmentStatus':
        return EMPLOYMENT_STATUS;
      case 'gender':
        return GENDERS;
      case 'timeAtBank':
        return TIME_AT_BANK;
      case 'bankExperience':
        return BANK_EXPERIENCE;
      case 'division':
        return DIVISIONS;
      case 'jobRole':
        return JOB_ROLES;
      case 'country':
        return COUNTRIES;
      case 'state':
        return US_STATES;
      default:
        return [];
    }
  };

  // Text input for bank name, metro area, and city - Apple Style
  if (fieldType === 'bankName' || fieldType === 'city' || fieldType === 'metroArea') {
    let placeholder = 'Enter value';
    if (fieldType === 'bankName') placeholder = "Enter your bank's name";
    if (fieldType === 'city') placeholder = 'Enter city name';
    if (fieldType === 'metroArea') placeholder = 'Enter metro area';

    return (
      <fieldset>
        <legend className="sr-only">
          Question {questionNumber}: {questionText}
        </legend>

        {/* Question Text - Apple Style: Large, Bold, Prominent */}
        <div className="mb-8">
          <p
            className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
            id={`question-${questionId}`}
          >
            {questionText}
          </p>
        </div>

        {/* Text Input - Large, Modern */}
        <input
          id={questionId}
          type="text"
          inputMode="text"
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          placeholder={placeholder}
          aria-labelledby={`question-${questionId}`}
        />
      </fieldset>
    );
  }

  // Dropdown for location fields (country, state) and categorical fields (bankSize, division, jobRole) - Apple Style
  if (
    fieldType === 'state' ||
    fieldType === 'country' ||
    fieldType === 'bankSize' ||
    fieldType === 'division' ||
    fieldType === 'jobRole'
  ) {
    const options = getOptionsForField(fieldType);
    let placeholderText = 'Select an option';
    if (fieldType === 'country') placeholderText = 'Select a country';
    if (fieldType === 'state') placeholderText = 'Select a state';
    if (fieldType === 'bankSize') placeholderText = 'Select bank size';
    if (fieldType === 'division') placeholderText = 'Select division';
    if (fieldType === 'jobRole') placeholderText = 'Select job role';

    // Handle "Other" option for division and jobRole
    const hasOtherOption = fieldType === 'division' || fieldType === 'jobRole';

    return (
      <fieldset>
        <legend className="sr-only">
          Question {questionNumber}: {questionText}
        </legend>

        {/* Question Text - Apple Style: Large, Bold, Prominent */}
        <div className="mb-8">
          <p
            className="text-xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl md:text-3xl"
            id={`question-${questionId}`}
          >
            {questionText}
          </p>
        </div>

        {/* Dropdown - Large, Modern */}
        <select
          id={questionId}
          value={showOther ? 'Other' : selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          aria-labelledby={`question-${questionId}`}
        >
          <option value="">{placeholderText}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {/* Show text input when "Other" is selected for division/jobRole */}
        {hasOtherOption && showOther && (
          <div className="mt-6">
            <input
              type="text"
              inputMode="text"
              value={otherValue}
              onChange={(e) => handleOtherChange(e.target.value)}
              disabled={disabled}
              placeholder="Please specify..."
              className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        )}
      </fieldset>
    );
  }

  // Radio groups for other fields - Apple Style (iOS Cards)
  const options = getOptionsForField(fieldType);

  if (options.length === 0) {
    return null;
  }

  return (
    <fieldset>
      <legend className="sr-only">
        Question {questionNumber}: {questionText}
      </legend>

      {/* Question Text - Apple Style: Large, Bold, Prominent */}
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
          {options.map((item) => (
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

              {/* Checkmark for selected state */}
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
          {options.map((item) => (
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

              {/* Radio Circle */}
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
      {showOther && (
        <div className="mt-6">
          <input
            type="text"
            inputMode="text"
            value={otherValue}
            onChange={(e) => handleOtherChange(e.target.value)}
            disabled={disabled}
            placeholder="Please specify..."
            className="block w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-6 py-5 text-lg transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      )}
    </fieldset>
  );
}
