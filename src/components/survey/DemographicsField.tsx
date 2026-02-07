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

// Field options
const BANK_SIZES = [
  'Less than $100M',
  '$100 - $250M',
  '$250 - $500M',
  '$500M - $1B',
  '$1B - $2.5B',
  '$2.5B - $5B',
  '$5B - $10B',
  '$10B - $15B',
  '$15B - $20B',
  'Greater than $20B',
];

const DEVICES = ['Desktop/Laptop', 'Tablet', 'Mobile Phone'];

const EMPLOYMENT_STATUS = ['Full-Time', 'Part-Time', 'Peak-Time'];

const GENDERS = ['Female', 'Male', 'Other'];

const TIME_AT_BANK = [
  'Less than 1 year',
  '1-5 years',
  '6-10 years',
  'More than 10 years',
];

const BANK_EXPERIENCE = [
  'Less than 1 year',
  '1-10 years',
  '11-20 years',
  'More than 20 years',
];

const DIVISIONS = [
  'Retail Banking',
  'Commercial Banking',
  'Wealth Management',
  'Operations',
  'Technology',
  'Risk Management',
  'Compliance',
  'Human Resources',
  'Marketing',
  'Finance',
  'Executive',
  'Other',
];

const JOB_ROLES = [
  'Teller',
  'Personal Banker',
  'Branch Manager',
  'Loan Officer',
  'Relationship Manager',
  'Analyst',
  'Operations Specialist',
  'IT Specialist',
  'Compliance Officer',
  'HR Specialist',
  'Marketing Specialist',
  'Executive',
  'Administrative Assistant',
  'Security',
  'Facilities',
  'Other',
];

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
    // Check if value is a custom "Other" value
    if (
      (fieldType === 'division' || fieldType === 'jobRole') &&
      value &&
      !getOptionsForField(fieldType).includes(value)
    ) {
      setShowOther(true);
      setOtherValue(value);
    }
  }, [value, fieldType]);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);

    if (newValue === 'Other') {
      setShowOther(true);
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
      default:
        return [];
    }
  };

  // Text input for bank name
  if (fieldType === 'bankName') {
    return (
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <label htmlFor={questionId} className="mb-4 block">
          <span className="mb-2 flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              Q{questionNumber}
            </span>
            <span className="flex-1 text-base font-medium text-gray-900">
              {questionText}
            </span>
          </span>
        </label>
        <input
          id={questionId}
          type="text"
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          placeholder="Enter your bank's name"
        />
      </div>
    );
  }

  // Dropdown for states (simplified - not cascading yet)
  if (fieldType === 'state') {
    return (
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <label htmlFor={questionId} className="mb-4 block">
          <span className="mb-2 flex items-start gap-3">
            <span className="flex-shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              Q{questionNumber}
            </span>
            <span className="flex-1 text-base font-medium text-gray-900">
              {questionText}
            </span>
          </span>
        </label>
        <select
          id={questionId}
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
        >
          <option value="">Select a state</option>
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Radio groups for other fields
  const options = getOptionsForField(fieldType);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex-shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            Q{questionNumber}
          </span>
          <span className="flex-1 text-base font-medium text-gray-900">
            {questionText}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
              selectedValue === option ||
              (option === 'Other' && showOther)
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name={questionId}
              value={option}
              checked={
                selectedValue === option ||
                (option === 'Other' && showOther)
              }
              onChange={() => handleChange(option)}
              disabled={disabled}
              className="h-5 w-5 text-primary-600 focus:ring-primary-500"
            />
            <span className="flex-1 text-gray-900">{option}</span>
          </label>
        ))}

        {/* Show text input when "Other" is selected */}
        {showOther && (
          <div className="ml-8 mt-2">
            <input
              type="text"
              value={otherValue}
              onChange={(e) => handleOtherChange(e.target.value)}
              disabled={disabled}
              placeholder="Please specify..."
              className="block w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}
