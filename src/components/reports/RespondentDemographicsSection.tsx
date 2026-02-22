'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';

export interface DemographicDistribution {
  field: string;
  label: string;
  total: number;
  distribution: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
}

export interface RespondentDemographicsData {
  respondentCount: number;
  distributions: DemographicDistribution[];
}

interface RespondentDemographicsSectionProps {
  data: RespondentDemographicsData;
}

const CHART_COLORS = [
  '#003da5',
  '#ce0037',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

const MAX_VISIBLE_ITEMS = 8;

export function RespondentDemographicsSection({
  data,
}: RespondentDemographicsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeDists = data.distributions.filter(
    (d) => d.distribution.length > 0
  );

  if (activeDists.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-expanded={isExpanded}
        aria-controls="respondent-demographics-body"
      >
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Respondent Demographics
            </h2>
            <p className="text-sm text-gray-500">
              {data.respondentCount}{' '}
              {data.respondentCount === 1 ? 'respondent' : 'respondents'} &middot;{' '}
              {activeDists.length}{' '}
              {activeDists.length === 1 ? 'field' : 'fields'} with data
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          id="respondent-demographics-body"
          className="border-t border-gray-200 px-6 py-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {activeDists.map((dist, index) => (
              <DistributionCard
                key={dist.field}
                dist={dist}
                colorIndex={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DistributionCardProps {
  dist: DemographicDistribution;
  colorIndex: number;
}

function DistributionCard({ dist, colorIndex }: DistributionCardProps) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll
    ? dist.distribution
    : dist.distribution.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = dist.distribution.length - MAX_VISIBLE_ITEMS;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{dist.label}</h3>

      <div className="space-y-2">
        {visible.map((item, idx) => (
          <div key={item.value} className="flex items-center gap-2">
            <div
              className="w-28 shrink-0 truncate text-xs text-gray-600"
              title={item.value}
            >
              {item.value}
            </div>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor:
                    CHART_COLORS[(colorIndex + idx) % CHART_COLORS.length],
                }}
              />
            </div>
            <div className="w-10 shrink-0 text-right text-xs font-medium text-gray-700">
              {item.percentage}%
            </div>
            <div className="w-6 shrink-0 text-right text-xs text-gray-400">
              {item.count}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-primary-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          +{hiddenCount} more
        </button>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {dist.total} {dist.total === 1 ? 'response' : 'responses'}
      </p>
    </div>
  );
}
