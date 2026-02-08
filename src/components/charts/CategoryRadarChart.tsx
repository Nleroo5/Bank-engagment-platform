'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  averageScore: number;
  questionCount: number;
  responseCount: number;
}

interface CategoryRadarChartProps {
  data: CategoryScore[];
  scaleMax: number;
}

export function CategoryRadarChart({
  data,
  scaleMax,
}: CategoryRadarChartProps) {
  const chartData = data.map((item) => ({
    category: item.categoryName,
    score: item.averageScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, scaleMax]} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => value.toFixed(1)}
          labelStyle={{ fontWeight: 'bold' }}
        />
        <Radar
          name="Average Score"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
