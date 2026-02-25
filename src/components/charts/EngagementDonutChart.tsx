'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';

interface ScoreDistribution {
  highlyEngaged: { count: number; percentage: number };
  moderatelyEngaged: { count: number; percentage: number };
  disengaged: { count: number; percentage: number };
}

interface EngagementDonutChartProps {
  distribution: ScoreDistribution;
  overallScore: number;
  scaleMax: number;
}

const SEGMENTS = [
  { key: 'highlyEngaged', label: 'Highly Engaged', color: '#10B981' },
  { key: 'moderatelyEngaged', label: 'Moderately Engaged', color: '#F59E0B' },
  { key: 'disengaged', label: 'Disengaged', color: '#EF4444' },
] as const;

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold" style={{ color: d.color }}>
        {d.label}
      </p>
      <p className="text-gray-700">
        {d.count} respondent{d.count !== 1 ? 's' : ''} ({d.percentage}%)
      </p>
    </div>
  );
}

export function EngagementDonutChart({
  distribution,
  overallScore,
  scaleMax,
}: EngagementDonutChartProps) {
  const data = SEGMENTS.map((seg) => {
    const bucket = distribution[seg.key];
    return {
      label: seg.label,
      count: bucket.count,
      percentage: bucket.percentage,
      color: seg.color,
    };
  }).filter((d) => d.count > 0);

  // If no data, show placeholder
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        No engagement data available
      </div>
    );
  }

  const totalRespondents = data.reduce((s, d) => s + d.count, 0);

  return (
    <div role="img" aria-label="Engagement distribution donut chart">
      <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={120}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">
            {overallScore.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">out of {scaleMax}.0</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {SEGMENTS.map((seg) => {
          const bucket = distribution[seg.key];
          if (bucket.count === 0) return null;
          return (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-gray-700">
                {seg.label}: {bucket.count} ({bucket.percentage}%)
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        {totalRespondents} total respondent{totalRespondents !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
