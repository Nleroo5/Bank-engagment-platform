'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import type { DemographicDistribution } from '@/components/reports/RespondentDemographicsSection';

interface DemographicDonutChartProps {
  distribution: DemographicDistribution;
}

const DONUT_COLORS = [
  '#003da5', // navy
  '#ce0037', // red
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // rose
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F97316', // orange
];

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{d.value}</p>
      <p className="text-gray-600">
        {d.count} ({d.percentage}%)
      </p>
    </div>
  );
}

export function DemographicDonutChart({ distribution }: DemographicDonutChartProps) {
  const items = distribution.distribution;

  if (items.length === 0) return null;

  // Limit slices — group small slices as "Other" if more than 8
  const MAX_SLICES = 8;
  let chartItems = items;
  if (items.length > MAX_SLICES) {
    const top = items.slice(0, MAX_SLICES - 1);
    const rest = items.slice(MAX_SLICES - 1);
    const otherCount = rest.reduce((s, r) => s + r.count, 0);
    const otherPct = rest.reduce((s, r) => s + r.percentage, 0);
    chartItems = [
      ...top,
      { value: 'Other', count: otherCount, percentage: Math.round(otherPct * 10) / 10 },
    ];
  }

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`${distribution.label} demographic distribution`}
    >
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{distribution.label}</h3>

      <div className="relative" style={{ width: 200, height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartItems}
              dataKey="count"
              nameKey="value"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              startAngle={90}
              endAngle={-270}
              paddingAngle={1}
              stroke="none"
            >
              {chartItems.map((_, index) => (
                <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center: total count */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{distribution.total}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 w-full max-w-[220px] space-y-1">
        {chartItems.map((item, idx) => (
          <div key={item.value} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
            />
            <span className="flex-1 truncate text-gray-600" title={item.value}>
              {item.value}
            </span>
            <span className="shrink-0 font-medium text-gray-700">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Grid layout for multiple demographic donut charts
 */
interface DemographicDonutGridProps {
  distributions: DemographicDistribution[];
}

export function DemographicDonutGrid({ distributions }: DemographicDonutGridProps) {
  const active = distributions.filter((d) => d.distribution.length > 0);
  if (active.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {active.map((dist) => (
        <DemographicDonutChart key={dist.field} distribution={dist} />
      ))}
    </div>
  );
}
