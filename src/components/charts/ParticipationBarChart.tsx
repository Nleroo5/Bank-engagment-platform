'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  TooltipProps,
} from 'recharts';
import type { DemographicDistribution } from '@/components/reports/RespondentDemographicsSection';

interface ParticipationBarChartProps {
  distribution: DemographicDistribution;
  height?: number;
}

function getParticipationColor(percentage: number): string {
  if (percentage >= 80) return '#10B981'; // green
  if (percentage >= 60) return '#3B82F6'; // blue
  if (percentage >= 40) return '#F59E0B'; // amber
  return '#EF4444'; // red
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{d.name}</p>
      <p className="text-gray-600">
        {d.count} respondent{d.count !== 1 ? 's' : ''} ({d.percentage}%)
      </p>
    </div>
  );
}

export function ParticipationBarChart({
  distribution,
  height,
}: ParticipationBarChartProps) {
  const items = distribution.distribution;
  if (items.length === 0) return null;

  // Sort descending by percentage
  const sorted = [...items].sort((a, b) => b.percentage - a.percentage);

  const chartData = sorted.map((item) => ({
    name: item.value,
    percentage: item.percentage,
    count: item.count,
    fill: getParticipationColor(item.percentage),
  }));

  const chartHeight = height ?? Math.max(250, chartData.length * 44);

  return (
    <div
      className="w-full"
      role="img"
      aria-label={`${distribution.label} participation bar chart`}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: '#374151' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="percentage"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Color legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
        {[
          { label: '80%+', color: '#10B981' },
          { label: '60-79%', color: '#3B82F6' },
          { label: '40-59%', color: '#F59E0B' },
          { label: '<40%', color: '#EF4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
