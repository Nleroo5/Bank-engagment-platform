'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import type { DemographicBreakdown } from './HeatmapChart';

interface GroupedScoreBarProps {
  breakdowns: Record<string, DemographicBreakdown>;
  scaleMax: number;
}

const GROUP_COLORS = [
  '#003da5',
  '#ce0037',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
  '#84CC16',
];

const DIMENSION_OPTIONS = [
  { value: 'division', label: 'Division' },
  { value: 'jobRole', label: 'Job Role' },
  { value: 'gender', label: 'Gender' },
  { value: 'timeAtBank', label: 'Time at Bank' },
];

interface TransformedRow {
  category: string;
  [groupName: string]: string | number;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-900">
            {Number(p.value ?? 0).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GroupedScoreBar({ breakdowns, scaleMax }: GroupedScoreBarProps) {
  const availableDimensions = DIMENSION_OPTIONS.filter((opt) => {
    const b = breakdowns[opt.value];
    return b && b.groups.length > 1;
  });

  const [selectedDimension, setSelectedDimension] = useState(
    availableDimensions[0]?.value ?? 'division'
  );

  const breakdown = breakdowns[selectedDimension];
  if (!breakdown || breakdown.groups.length < 2) {
    return null;
  }

  const groups = breakdown.groups;
  const categories =
    groups[0]?.categoryScores.map((cs) => cs.categoryName) ?? [];

  // Transform data: one row per category, one key per group
  const chartData: TransformedRow[] = categories.map((catName) => {
    const row: TransformedRow = { category: catName };
    groups.forEach((group) => {
      const score = group.categoryScores.find(
        (cs) => cs.categoryName === catName
      );
      row[group.group] = score ? Math.round(score.averageScore * 10) / 10 : 0;
    });
    return row;
  });

  const chartHeight = Math.max(300, categories.length * 60);

  return (
    <div className="w-full">
      {/* Dimension selector */}
      {availableDimensions.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <label
            htmlFor="grouped-bar-dimension"
            className="text-sm font-medium text-gray-600"
          >
            Compare by:
          </label>
          <select
            id="grouped-bar-dimension"
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {availableDimensions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="-mx-2 overflow-x-auto px-2"
        role="region"
        aria-label={`Category scores grouped by ${breakdown.dimensionLabel}`}
        tabIndex={0}
      >
        <div style={{ height: chartHeight, minWidth: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, scaleMax]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />

              {groups.map((group, idx) => (
                <Bar
                  key={group.group}
                  dataKey={group.group}
                  fill={GROUP_COLORS[idx % GROUP_COLORS.length]}
                  barSize={Math.max(8, Math.min(16, 120 / groups.length))}
                  radius={[0, 2, 2, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
