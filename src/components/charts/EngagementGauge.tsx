'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface EngagementGaugeProps {
  score: number;
  maxScore: number;
}

const PERFORMANCE_LEVELS = [
  { min: 80, color: '#16A34A', label: 'Excellent' },
  { min: 60, color: '#F59E0B', label: 'Good' },
  { min: 40, color: '#F97316', label: 'Fair' },
  { min: 0, color: '#EF4444', label: 'Needs Improvement' },
];

function getPerformance(percentage: number) {
  const found = PERFORMANCE_LEVELS.find((level) => percentage >= level.min);
  // Always returns a match since the last level has min: 0
  return found ?? { min: 0, color: '#EF4444', label: 'Needs Improvement' };
}

export function EngagementGauge({ score, maxScore }: EngagementGaugeProps) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  const performance = getPerformance(percentage);

  const remaining = Math.round((100 - percentage) * 10) / 10;
  const gaugeData = [
    { name: 'score', value: percentage },
    { name: 'remaining', value: remaining },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-64 sm:h-40 sm:w-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              dataKey="value"
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={0}
              stroke="none"
            >
              <Cell fill={performance.color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay with score */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span
            className="text-3xl font-bold sm:text-4xl"
            style={{ color: performance.color }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">
            out of {maxScore}.0
          </span>
        </div>
      </div>

      {/* Performance label */}
      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: performance.color }}
        />
        <span
          className="text-sm font-semibold"
          style={{ color: performance.color }}
        >
          {performance.label}
        </span>
        <span className="text-sm text-gray-500">({percentage}%)</span>
      </div>

      {/* Scale markers */}
      <div className="mt-1 flex w-64 justify-between px-2 text-xs text-gray-400 sm:w-72">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
