'use client';

import { useState, useEffect, useCallback } from 'react';
import { CategoryScoresChart } from '@/components/charts/CategoryScoresChart';
import type { WeightedCategoryScore } from '@/components/charts/CategoryScoresChart';
import { CategoryRadarChart } from '@/components/charts/CategoryRadarChart';
import { DemographicDonutGrid } from '@/components/charts/DemographicDonutChart';
import { ParticipationBarChart } from '@/components/charts/ParticipationBarChart';
import { CategoryScoreGrid } from '@/components/reports/CategoryScoreCard';
import { DemographicsTreemap } from '@/components/charts/DemographicsTreemap';
import { DivergingBarChart } from '@/components/charts/DivergingBarChart';
import type { CategoryResponseDistribution } from '@/components/charts/DivergingBarChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import type { DemographicBreakdown } from '@/components/charts/HeatmapChart';
import { GroupedScoreBar } from '@/components/charts/GroupedScoreBar';
import { DemographicFilters } from './DemographicFilters';
import { DemographicsDetailSection } from './DemographicsDetailSection';
import type { RespondentDemographicsData } from './RespondentDemographicsSection';
import { AlertCircle, Users, TrendingUp, BarChart3 } from 'lucide-react';
import {
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
} from '@/components/ui/Skeleton';

interface ReportData {
  campaign: {
    id: string;
    surveyTitle: string;
    surveyType: string;
    organizationName: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
  };
  metrics: {
    totalInvitations: number;
    completedCount: number;
    completionRate: number;
    filteredCount: number;
  };
  scores?: {
    overall: number;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      averageScore: number;
      questionCount: number;
      responseCount: number;
    }>;
    sections: Array<{
      sectionId: string;
      sectionTitle: string;
      averageScore: number;
      questionCount: number;
      responseCount: number;
    }>;
  };
  categoryAggregates?: WeightedCategoryScore[];
  responseDistribution?: CategoryResponseDistribution[];
  demographicBreakdowns?: Record<string, DemographicBreakdown>;
  respondentDemographics?: RespondentDemographicsData;
  filters: {
    applied: Record<string, string>;
    available: {
      divisions: Array<{
        field: string;
        label: string;
        value: string;
        count: number;
      }>;
      jobRoles: Array<{
        field: string;
        label: string;
        value: string;
        count: number;
      }>;
      genders: Array<{
        field: string;
        label: string;
        value: string;
        count: number;
      }>;
      timeAtBank: Array<{
        field: string;
        label: string;
        value: string;
        count: number;
      }>;
    };
  };
  scale?: {
    min: number;
    max: number;
    type: string;
  };
}

interface ReportViewProps {
  campaignId: string;
}

export function ReportView({ campaignId }: ReportViewProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `/api/reports/${campaignId}?${queryParams.toString()}`
      );

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
  }, [campaignId, filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="sr-only" role="status" aria-live="polite">
          Loading report data...
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonChart />
        <SkeletonTable rows={5} />
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

  const isDemographics = data.campaign.surveyType === 'demographics';
  const scaleMax = data.scale?.max ?? (data.campaign.surveyType === 'likert3' ? 3 : 5);

  // Find the division distribution for participation chart
  const divisionDist = data.respondentDemographics?.distributions.find(
    (d) => d.field === 'division'
  );

  const hasDemographicData =
    data.respondentDemographics &&
    data.respondentDemographics.distributions.some(
      (d) => d.distribution.length > 0
    );

  // Count demographic fields with data (for demographics summary card)
  const dataFieldCount =
    data.respondentDemographics?.distributions.filter(
      (d) => d.distribution.length > 0
    ).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Content - 3 columns */}
        <div className="space-y-6 lg:col-span-3">
          {/* 1. Summary Cards */}
          {isDemographics ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-primary-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Respondents
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.metrics.filteredCount}
                    </p>
                    {data.metrics.filteredCount !== data.metrics.completedCount && (
                      <p className="text-xs text-gray-500">
                        of {data.metrics.completedCount} total
                      </p>
                    )}
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
                      {data.metrics.completedCount} /{' '}
                      {data.metrics.totalInvitations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Data Fields
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dataFieldCount}
                    </p>
                    <p className="text-xs text-gray-500">with responses</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-primary-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Respondents</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.metrics.filteredCount}
                    </p>
                    {data.metrics.filteredCount !== data.metrics.completedCount && (
                      <p className="text-xs text-gray-500">
                        of {data.metrics.completedCount} total
                      </p>
                    )}
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
                      {data.metrics.completedCount} /{' '}
                      {data.metrics.totalInvitations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <span className="text-sm font-bold">
                      {data.scores?.overall.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Overall Score
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      out of {scaleMax}.0
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Category Weighted Scores Chart — scored only */}
          {!isDemographics && (
            <>
              {data.categoryAggregates && data.categoryAggregates.length > 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 text-xl font-bold text-gray-900">
                    Weighted Category Scores
                  </h2>
                  <CategoryScoresChart data={data.categoryAggregates} />
                </div>
              ) : data.scores ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 text-xl font-bold text-gray-900">
                    Average Score by Category
                  </h2>
                  <CategoryRadarChart data={data.scores.categories} scaleMax={scaleMax} />
                </div>
              ) : null}
            </>
          )}

          {/* 4. Category Score Cards Grid — scored only */}
          {!isDemographics && data.categoryAggregates && data.categoryAggregates.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Category Performance
              </h2>
              <CategoryScoreGrid categories={data.categoryAggregates} />
            </div>
          )}

          {/* 5. Diverging Stacked Bar — Response Sentiment Breakdown — scored only */}
          {!isDemographics && data.responseDistribution && data.responseDistribution.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Response Sentiment by Category
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Distribution of responses across the rating scale for each category
              </p>
              <DivergingBarChart
                data={data.responseDistribution}
                scaleMax={scaleMax}
              />
            </div>
          )}

          {/* 6. Sections Table — scored only */}
          {!isDemographics && data.scores && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Scores by Section
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Section
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Average Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.scores.sections.map((section) => (
                      <tr key={section.sectionId}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {section.sectionTitle}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {section.questionCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                          {section.averageScore.toFixed(1)} / {scaleMax}.0
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-primary-600"
                              style={{
                                width: `${(section.averageScore / scaleMax) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Heatmap — Category Scores by Demographic — scored only */}
          {!isDemographics && data.demographicBreakdowns && (
            (() => {
              const hasGroups = Object.values(data.demographicBreakdowns).some(
                (b) => b.groups.length >= 2
              );
              if (!hasGroups) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Score Heatmap
                  </h2>
                  <p className="mb-4 text-sm text-gray-500">
                    Category scores across demographic groups — color-coded from red (low) to green (high)
                  </p>
                  <HeatmapChart
                    breakdowns={data.demographicBreakdowns}
                    scaleMax={scaleMax}
                  />
                </div>
              );
            })()
          )}

          {/* 8. Grouped Bar Chart — Category Scores by Demographic — scored only */}
          {!isDemographics && data.demographicBreakdowns && (
            (() => {
              const hasMultipleGroups = Object.values(data.demographicBreakdowns).some(
                (b) => b.groups.length >= 2
              );
              if (!hasMultipleGroups) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Category Scores by Group
                  </h2>
                  <p className="mb-4 text-sm text-gray-500">
                    Compare how each demographic group scores across categories
                  </p>
                  <GroupedScoreBar
                    breakdowns={data.demographicBreakdowns}
                    scaleMax={scaleMax}
                  />
                </div>
              );
            })()
          )}

          {/* 9. Demographics Treemap */}
          {hasDemographicData && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Demographic Composition
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Hierarchical view of respondent demographics — rectangle size represents count
              </p>
              <DemographicsTreemap
                distributions={data.respondentDemographics!.distributions}
              />
            </div>
          )}

          {/* 10. Demographic Breakdown — Donut Charts (both survey types) */}
          {hasDemographicData && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                Respondent Demographics
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                {data.respondentDemographics!.respondentCount} respondent
                {data.respondentDemographics!.respondentCount !== 1 ? 's' : ''}
              </p>
              <DemographicDonutGrid
                distributions={data.respondentDemographics!.distributions}
              />
            </div>
          )}

          {/* 11. Division Participation (both survey types) */}
          {divisionDist && divisionDist.distribution.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Participation by Division
              </h2>
              <ParticipationBarChart distribution={divisionDist} />
            </div>
          )}

          {/* 12. Demographics Detail Tables */}
          {data.respondentDemographics && (
            <DemographicsDetailSection
              distributions={data.respondentDemographics.distributions}
            />
          )}

          {/* 13. Category Radar Chart — scored only, when bar chart shown above */}
          {!isDemographics &&
            data.categoryAggregates &&
            data.categoryAggregates.length > 0 &&
            data.scores && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                  Category Comparison
                </h2>
                <CategoryRadarChart
                  data={data.scores.categories}
                  scaleMax={scaleMax}
                />
              </div>
            )}
        </div>

        {/* Sidebar - Filters - 1 column */}
        <div className="order-first lg:order-last lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <DemographicFilters
              filterOptions={data.filters.available}
              appliedFilters={data.filters.applied}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
