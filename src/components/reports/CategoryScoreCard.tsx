'use client';

import type { WeightedCategoryScore } from '@/components/charts/CategoryScoresChart';

interface CategoryScoreCardProps {
  category: WeightedCategoryScore;
  rank?: number;
  showDetails?: boolean;
}

/**
 * Individual category score card displaying weighted scoring metrics
 *
 * Shows:
 * - Category name with color indicator
 * - Weighted score (large)
 * - Weight multiplier
 * - Raw score
 * - Percentage of maximum
 * - Score range (min-max)
 * - Standard deviation
 */
export function CategoryScoreCard({
  category,
  rank,
  showDetails = true,
}: CategoryScoreCardProps) {
  // Determine score level for color coding
  const getScoreLevel = (percentage: number) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'fair';
    return 'needs-improvement';
  };

  const scoreLevel = getScoreLevel(category.averagePercentage);

  const scoreLevelStyles = {
    excellent: 'from-green-50 to-green-100 border-green-200',
    good: 'from-blue-50 to-blue-100 border-blue-200',
    fair: 'from-yellow-50 to-yellow-100 border-yellow-200',
    'needs-improvement': 'from-red-50 to-red-100 border-red-200',
  };

  const scoreLevelTextStyles = {
    excellent: 'text-green-700',
    good: 'text-blue-700',
    fair: 'text-yellow-700',
    'needs-improvement': 'text-red-700',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 bg-gradient-to-br p-6 shadow-sm transition-all hover:shadow-md ${scoreLevelStyles[scoreLevel]}`}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-gray-700 shadow">
          #{rank}
        </div>
      )}

      {/* Category color indicator */}
      {category.colorCode && (
        <div
          className="absolute left-0 top-0 h-full w-1.5"
          style={{ backgroundColor: category.colorCode }}
        />
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          {category.categoryName}
        </h3>
        {category.categoryWeight !== 1 && (
          <p className="text-sm text-gray-600">
            Weight:{' '}
            <span className="font-semibold">×{category.categoryWeight}</span>
          </p>
        )}
      </div>

      {/* Main score */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-4xl font-bold ${scoreLevelTextStyles[scoreLevel]}`}
          >
            {category.averageWeightedScore.toFixed(1)}
          </span>
          <span className="text-lg text-gray-500">weighted</span>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          Raw score: {category.averageRawScore.toFixed(1)}
        </div>
      </div>

      {/* Percentage bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
          <span>Performance</span>
          <span className="font-semibold">
            {category.averagePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              scoreLevel === 'excellent'
                ? 'bg-green-500'
                : scoreLevel === 'good'
                  ? 'bg-blue-500'
                  : scoreLevel === 'fair'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(category.averagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Additional details */}
      {showDetails && (
        <div className="space-y-2 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Score Range:</span>
            <span className="font-medium">
              {category.minWeightedScore.toFixed(1)} -{' '}
              {category.maxWeightedScore.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Std Deviation:</span>
            <span className="font-medium">
              {category.standardDeviation.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Questions:</span>
            <span className="font-medium">{category.questionCount}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Respondents:</span>
            <span className="font-medium">{category.respondentCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Grid layout for multiple category score cards
 */
interface CategoryScoreGridProps {
  categories: WeightedCategoryScore[];
  showRanking?: boolean;
  showDetails?: boolean;
}

export function CategoryScoreGrid({
  categories,
  showRanking = true,
  showDetails = true,
}: CategoryScoreGridProps) {
  // Sort by weighted score descending for ranking
  const sortedCategories = showRanking
    ? [...categories].sort(
        (a, b) => b.averageWeightedScore - a.averageWeightedScore
      )
    : categories;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedCategories.map((category, index) => (
        <CategoryScoreCard
          key={category.categoryId}
          category={category}
          rank={showRanking ? index + 1 : undefined}
          showDetails={showDetails}
        />
      ))}
    </div>
  );
}
