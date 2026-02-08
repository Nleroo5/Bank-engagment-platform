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
} from 'recharts';

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  averageScore: number;
  questionCount: number;
  responseCount: number;
}

interface CategoryBarChartProps {
  data: CategoryScore[];
  scaleMax: number;
}

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  Communication: '#3b82f6', // blue
  Leadership: '#8b5cf6', // purple
  Culture: '#ec4899', // pink
  Accountability: '#f59e0b', // amber
  Execution: '#10b981', // green
  Associate: '#06b6d4', // cyan
  'Team Dynamics': '#ef4444', // red
};

export function CategoryBarChart({ data, scaleMax }: CategoryBarChartProps) {
  const chartData = data.map((item) => ({
    name: item.categoryName,
    score: item.averageScore,
    fill: CATEGORY_COLORS[item.categoryName] || '#6b7280',
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={[0, scaleMax]}
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number) => value.toFixed(1)}
          labelStyle={{ fontWeight: 'bold' }}
        />
        <Legend />
        <Bar dataKey="score" name="Average Score" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
