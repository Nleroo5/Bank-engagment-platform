'use client';

import { useState } from 'react';

export interface DemographicBreakdown {
  dimension: string;
  dimensionLabel: string;
  groups: Array<{
    group: string;
    respondentCount: number;
    overallScore: number;
    categoryScores: Array<{
      categoryId: string;
      categoryName: string;
      averageScore: number;
    }>;
  }>;
}

interface HeatmapChartProps {
  breakdowns: Record<string, DemographicBreakdown>;
  scaleMax: number;
}

function scoreToColor(score: number, scaleMax: number): string {
  if (scaleMax <= 0) return 'bg-gray-200 text-gray-600';
  const pct = (score / scaleMax) * 100;
  if (pct >= 80) return 'bg-green-600 text-white';
  if (pct >= 70) return 'bg-green-400 text-white';
  if (pct >= 60) return 'bg-green-200 text-green-900';
  if (pct >= 50) return 'bg-amber-200 text-amber-900';
  if (pct >= 40) return 'bg-amber-400 text-white';
  return 'bg-red-400 text-white';
}

function scoreToHex(score: number, scaleMax: number): string {
  if (scaleMax <= 0) return '#D1D5DB';
  const pct = (score / scaleMax) * 100;
  if (pct >= 80) return '#16A34A';
  if (pct >= 70) return '#4ADE80';
  if (pct >= 60) return '#BBF7D0';
  if (pct >= 50) return '#FDE68A';
  if (pct >= 40) return '#FBBF24';
  return '#F87171';
}

const DIMENSION_OPTIONS = [
  { value: 'division', label: 'Division' },
  { value: 'jobRole', label: 'Job Role' },
  { value: 'gender', label: 'Gender' },
  { value: 'timeAtBank', label: 'Time at Bank' },
];

export function HeatmapChart({ breakdowns, scaleMax }: HeatmapChartProps) {
  const availableDimensions = DIMENSION_OPTIONS.filter((opt) => {
    const b = breakdowns[opt.value];
    return b && b.groups.length > 0;
  });

  const [selectedDimension, setSelectedDimension] = useState(
    availableDimensions[0]?.value ?? 'division'
  );

  const breakdown = breakdowns[selectedDimension];
  if (!breakdown || breakdown.groups.length === 0) {
    return null;
  }

  const groups = breakdown.groups;
  const categories =
    groups[0]?.categoryScores.map((cs) => ({
      id: cs.categoryId,
      name: cs.categoryName,
    })) ?? [];

  return (
    <div className="w-full">
      {/* Dimension selector */}
      {availableDimensions.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <label
            htmlFor="heatmap-dimension"
            className="text-sm font-medium text-gray-600"
          >
            Break down by:
          </label>
          <select
            id="heatmap-dimension"
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

      {/* Heatmap grid - scrollable on mobile */}
      <div
        className="-mx-2 overflow-x-auto px-2"
        role="region"
        aria-label={`Heatmap of category scores by ${breakdown.dimensionLabel}`}
        tabIndex={0}
      >
        <table className="min-w-full border-collapse" style={{ minWidth: Math.max(500, groups.length * 80 + 160) }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-600">
                Category
              </th>
              {groups.map((group) => (
                <th
                  key={group.group}
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-600"
                >
                  <div className="truncate" title={group.group}>
                    {group.group}
                  </div>
                  <div className="text-xs font-normal text-gray-400">
                    n={group.respondentCount}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-medium text-gray-800">
                  {cat.name}
                </td>
                {groups.map((group) => {
                  const score =
                    group.categoryScores.find((cs) => cs.categoryId === cat.id)
                      ?.averageScore ?? 0;
                  const colorClass = scoreToColor(score, scaleMax);

                  return (
                    <td key={group.group} className="px-1 py-1">
                      <div
                        className={`flex items-center justify-center rounded px-2 py-2 text-xs font-bold ${colorClass}`}
                        title={`${cat.name} - ${group.group}: ${score.toFixed(1)} / ${scaleMax}`}
                      >
                        {score.toFixed(1)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Overall row */}
            <tr className="border-t-2 border-gray-300">
              <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-900">
                Overall
              </td>
              {groups.map((group) => {
                const colorClass = scoreToColor(group.overallScore, scaleMax);
                return (
                  <td key={group.group} className="px-1 py-1">
                    <div
                      className={`flex items-center justify-center rounded px-2 py-2 text-xs font-bold ${colorClass}`}
                    >
                      {group.overallScore.toFixed(1)}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
        <span>Score range:</span>
        {[
          { label: 'Low', pct: 30 },
          { label: '', pct: 45 },
          { label: 'Mid', pct: 55 },
          { label: '', pct: 65 },
          { label: '', pct: 75 },
          { label: 'High', pct: 85 },
        ].map((item) => (
          <div key={item.pct} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-6 rounded-sm"
              style={{ backgroundColor: scoreToHex((item.pct / 100) * scaleMax, scaleMax) }}
            />
            {item.label && <span>{item.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
