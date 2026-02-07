'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';

/**
 * Category score data with weighted scoring
 */
export interface WeightedCategoryScore {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  colorCode?: string;
  sortOrder?: number;
  averageWeightedScore: number;
  averageRawScore: number;
  minWeightedScore: number;
  maxWeightedScore: number;
  standardDeviation: number;
  averagePercentage: number;
  respondentCount: number;
  questionCount: number;
}

interface CategoryScoresChartProps {
  data: WeightedCategoryScore[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

/**
 * Custom tooltip showing detailed weighted scoring information
 */
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-lg">
      <p className="mb-2 font-semibold text-gray-900">{data.name}</p>
      <div className="space-y-1 text-sm">
        <p className="text-gray-700">
          <span className="font-medium">Weighted Score:</span>{' '}
          <span className="font-bold">{data.weightedScore.toFixed(1)}</span>
        </p>
        <p className="text-gray-600">
          <span className="font-medium">Raw Score:</span> {data.rawScore.toFixed(1)}
        </p>
        <p className="text-gray-600">
          <span className="font-medium">Weight:</span> ×{data.weight}
        </p>
        <p className="text-gray-600">
          <span className="font-medium">Range:</span> {data.min.toFixed(1)} -{' '}
          {data.max.toFixed(1)}
        </p>
        <p className="text-gray-600">
          <span className="font-medium">Std Dev:</span> {data.stdDev.toFixed(1)}
        </p>
        <p className="text-blue-600 font-medium">
          {data.percentage.toFixed(1)}% of maximum
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {data.respondentCount} respondents • {data.questionCount} questions
        </p>
      </div>
    </div>
  );
}

/**
 * Horizontal bar chart displaying weighted category scores
 *
 * Features:
 * - Shows weighted scores with category-specific colors
 * - Displays weight multipliers in labels
 * - Detailed tooltip with raw vs weighted scores
 * - Responsive design
 * - Accessible with ARIA labels
 */
export function CategoryScoresChart({
  data,
  height = 400,
  showLegend = true,
  showGrid = true,
}: CategoryScoresChartProps) {
  // Sort data by sortOrder or name
  const sortedData = [...data].sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  // Transform data for chart
  const chartData = sortedData.map((item) => ({
    name: item.categoryName,
    weightedScore: item.averageWeightedScore,
    rawScore: item.averageRawScore,
    weight: item.categoryWeight,
    percentage: item.averagePercentage,
    min: item.minWeightedScore,
    max: item.maxWeightedScore,
    stdDev: item.standardDeviation,
    respondentCount: item.respondentCount,
    questionCount: item.questionCount,
    color: item.colorCode || '#6b7280',
  }));

  // Calculate max value for Y-axis (add 10% padding)
  const maxScore = Math.max(...chartData.map((d) => d.max));
  const yAxisMax = Math.ceil(maxScore * 1.1);

  return (
    <div className="w-full" role="img" aria-label="Category weighted scores bar chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          layout="horizontal"
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          )}

          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fontSize: 12, fill: '#374151' }}
            tickFormatter={(value, index) => {
              const weight = chartData[index]?.weight;
              return weight !== 1 ? `${value} (×${weight})` : value;
            }}
          />

          <YAxis
            domain={[0, yAxisMax]}
            label={{
              value: 'Weighted Score',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#374151', fontSize: 14, fontWeight: 500 },
            }}
            tick={{ fontSize: 12, fill: '#374151' }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />

          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={() => 'Weighted Score'}
            />
          )}

          <Bar
            dataKey="weightedScore"
            name="Weighted Score"
            radius={[8, 8, 0, 0]}
            maxBarSize={80}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={{ filter: 'brightness(1)', transition: 'filter 0.3s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Accessible table alternative */}
      <div className="sr-only" role="table" aria-label="Category scores data table">
        <div role="rowgroup">
          <div role="row">
            <div role="columnheader">Category</div>
            <div role="columnheader">Weighted Score</div>
            <div role="columnheader">Weight</div>
            <div role="columnheader">Percentage</div>
          </div>
        </div>
        <div role="rowgroup">
          {chartData.map((item, index) => (
            <div role="row" key={index}>
              <div role="cell">{item.name}</div>
              <div role="cell">{item.weightedScore.toFixed(1)}</div>
              <div role="cell">×{item.weight}</div>
              <div role="cell">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
