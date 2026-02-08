'use client';

import { useState } from 'react';
import { X, Filter } from 'lucide-react';

interface DemographicFilter {
  field: string;
  label: string;
  value: string;
  count: number;
}

interface FilterOptions {
  divisions: DemographicFilter[];
  jobRoles: DemographicFilter[];
  genders: DemographicFilter[];
  timeAtBank: DemographicFilter[];
}

interface DemographicFiltersProps {
  filterOptions: FilterOptions;
  appliedFilters: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
}

export function DemographicFilters({
  filterOptions,
  appliedFilters,
  onFilterChange,
}: DemographicFiltersProps) {
  const [filters, setFilters] =
    useState<Record<string, string>>(appliedFilters);

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Filter className="mr-2 h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <X className="mr-1 h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Division Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Division
          </label>
          <select
            value={filters.division || ''}
            onChange={(e) => handleFilterChange('division', e.target.value)}
            disabled={filterOptions.divisions.length === 0}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">All Divisions</option>
            {filterOptions.divisions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} ({option.count})
              </option>
            ))}
          </select>
          {filterOptions.divisions.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No divisions meet the anonymity threshold (min 5 respondents)
            </p>
          )}
        </div>

        {/* Job Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Job Role
          </label>
          <select
            value={filters.jobRole || ''}
            onChange={(e) => handleFilterChange('jobRole', e.target.value)}
            disabled={filterOptions.jobRoles.length === 0}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">All Job Roles</option>
            {filterOptions.jobRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} ({option.count})
              </option>
            ))}
          </select>
          {filterOptions.jobRoles.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No job roles meet the anonymity threshold
            </p>
          )}
        </div>

        {/* Time at Bank Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Time at Bank
          </label>
          <select
            value={filters.timeAtBank || ''}
            onChange={(e) => handleFilterChange('timeAtBank', e.target.value)}
            disabled={filterOptions.timeAtBank.length === 0}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">All Tenures</option>
            {filterOptions.timeAtBank.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} ({option.count})
              </option>
            ))}
          </select>
          {filterOptions.timeAtBank.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No tenure groups meet the anonymity threshold
            </p>
          )}
        </div>

        {/* Gender Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Gender
          </label>
          <select
            value={filters.gender || ''}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            disabled={filterOptions.genders.length === 0}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">All Genders</option>
            {filterOptions.genders.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} ({option.count})
              </option>
            ))}
          </select>
          {filterOptions.genders.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No gender groups meet the anonymity threshold
            </p>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 rounded-md bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <strong>{Object.keys(filters).length}</strong> filter
            {Object.keys(filters).length === 1 ? '' : 's'} applied
          </p>
        </div>
      )}
    </div>
  );
}
