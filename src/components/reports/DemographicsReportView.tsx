'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertCircle, Users, TrendingUp } from 'lucide-react';
import {
  SkeletonCard,
  SkeletonChart,
} from '@/components/ui/Skeleton';

interface DemographicsData {
  campaign: {
    id: string;
    surveyTitle: string;
    surveyType: string;
    organizationName: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    isAnonymous: boolean;
  };
  metrics: {
    totalInvitations: number;
    completedCount: number;
    completionRate: number;
  };
  demographics: {
    respondentCount: number;
    distributions: Array<{
      field: string;
      label: string;
      total: number;
      distribution: Array<{
        value: string;
        count: number;
        percentage: number;
      }>;
    }>;
  };
}

interface DemographicsReportViewProps {
  campaignId: string;
}

// Brand colors for charts
const CHART_COLORS = [
  '#003da5', // Navy Blue
  '#ce0037', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Rose
  '#14B8A6', // Teal
];

export function DemographicsReportView({
  campaignId,
}: DemographicsReportViewProps) {
  const [data, setData] = useState<DemographicsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${campaignId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || 'Failed to load report'
        );
      }

      const reportData = await response.json();
      setData(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="sr-only" role="status" aria-live="polite">
          Loading demographics report...
        </div>
        {/* Summary cards skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Charts skeleton */}
        {[...Array(4)].map((_, i) => (
          <SkeletonChart key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Unable to load report
            </h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.demographics.respondentCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Response Rate
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data.metrics.completionRate}%
              </p>
              <p className="text-xs text-gray-500">
                {data.metrics.completedCount} / {data.metrics.totalInvitations}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Data Fields
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data.demographics.distributions.filter(d => d.distribution.length > 0).length}
              </p>
              <p className="text-xs text-gray-500">with responses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">
          About Demographics Reports
        </h3>
        <p className="text-sm text-blue-800">
          This report shows the distribution of responses across different
          demographic categories. Each chart displays the count and percentage
          of respondents for each option. Use this data to understand the
          composition of your survey audience and identify patterns or trends.
        </p>
      </div>

      {/* Demographics Distributions */}
      {data.demographics.distributions
        .filter((dist) => dist.distribution.length > 0) // Only show fields with data
        .map((dist, index) => (
          <div
            key={dist.field}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {dist.label}
            </h2>

            {/* Bar Chart */}
            <div className="-mx-2 mb-6 overflow-x-auto px-2">
              <div style={{ height: Math.min(600, Math.max(300, dist.distribution.length * 50)), minWidth: 480 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dist.distribution}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="value" type="category" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'count') {
                        return [value, 'Count'];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS[index % CHART_COLORS.length]}>
                    {dist.distribution.map((_entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CHART_COLORS[(index + idx) % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {dist.label}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Visual
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dist.distribution.map((item, idx) => (
                    <tr key={item.value} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {item.value}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {item.count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                        {item.percentage}%
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-4 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full"
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor:
                                  CHART_COLORS[(index + idx) % CHART_COLORS.length],
                              }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">
                            {item.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      {dist.total}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900">
                      100%
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
