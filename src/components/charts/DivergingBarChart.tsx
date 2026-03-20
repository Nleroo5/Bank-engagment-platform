'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  TooltipProps,
} from 'recharts';

export interface CategoryResponseDistribution {
  categoryId: string;
  categoryName: string;
  colorCode?: string;
  total: number;
  distribution: Record<string, number>; // scale value -> count
}

interface DivergingBarChartProps {
  data: CategoryResponseDistribution[];
  scaleMax: number;
}

// Color palettes for diverging bars
const LIKERT5_COLORS = {
  stronglyDisagree: '#DC2626', // red-600
  disagree: '#F87171',         // red-400
  neutral: '#9CA3AF',          // gray-400
  agree: '#4ADE80',            // green-400
  stronglyAgree: '#16A34A',    // green-600
};

const LIKERT3_COLORS = {
  rarely: '#DC2626',
  sometimes: '#F59E0B',
  frequently: '#16A34A',
};

interface TransformedRow {
  category: string;
  [key: string]: string | number;
}

function transformData(
  data: CategoryResponseDistribution[],
  scaleMax: number
): TransformedRow[] {
  return data.map((cat) => {
    const total = cat.total || 1;

    if (scaleMax === 3) {
      const rarely = cat.distribution['1'] || 0;
      const sometimes = cat.distribution['2'] || 0;
      const frequently = cat.distribution['3'] || 0;

      const row: TransformedRow = {
        category: cat.categoryName,
        'Rarely': -Math.round((rarely / total) * 1000) / 10,
        'Sometimes': -Math.round((sometimes / total) * 1000) / 10,
        'Frequently': Math.round((frequently / total) * 1000) / 10,
      };
      return row;
    }

    // likert5
    const sd = cat.distribution['1'] || 0;
    const d = cat.distribution['2'] || 0;
    const n = cat.distribution['3'] || 0;
    const a = cat.distribution['4'] || 0;
    const sa = cat.distribution['5'] || 0;

    const row: TransformedRow = {
      category: cat.categoryName,
      'Strongly Disagree': -Math.round((sd / total) * 1000) / 10,
      'Disagree': -Math.round((d / total) * 1000) / 10,
      'Neutral': Math.round((n / total) * 1000) / 10,
      'Agree': Math.round((a / total) * 1000) / 10,
      'Strongly Agree': Math.round((sa / total) * 1000) / 10,
    };
    return row;
  });
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const merged: Array<{ name: string; value: number; color: string }> = [];

  payload.forEach((p) => {
    const name = String(p.name ?? '');
    const val = Math.abs(Number(p.value ?? 0));
    if (val !== 0) {
      merged.push({ name, value: val, color: p.color ?? '#6B7280' });
    }
  });

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      {merged.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-900">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function DivergingBarChart({
  data,
  scaleMax,
}: DivergingBarChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = transformData(data, scaleMax);
  const isLikert3 = scaleMax === 3;
  const chartHeight = Math.max(250, data.length * 50);

  return (
    <div className="w-full">
      <div
        className="-mx-2 overflow-x-auto px-2"
        role="region"
        aria-label="Diverging stacked bar chart showing response distribution"
        tabIndex={0}
      >
        <div style={{ height: chartHeight, minWidth: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              stackOffset="sign"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[-100, 100]}
                tickFormatter={(v: number) => `${Math.abs(v)}%`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />

              {isLikert3 ? (
                <>
                  <Bar
                    dataKey="Rarely"
                    stackId="stack"
                    fill={LIKERT3_COLORS.rarely}
                    name="Rarely"
                  />
                  <Bar
                    dataKey="Sometimes"
                    stackId="stack"
                    fill={LIKERT3_COLORS.sometimes}
                    name="Sometimes"
                  />
                  <Bar
                    dataKey="Frequently"
                    stackId="stack"
                    fill={LIKERT3_COLORS.frequently}
                    name="Frequently"
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="Strongly Disagree"
                    stackId="stack"
                    fill={LIKERT5_COLORS.stronglyDisagree}
                    name="Strongly Disagree"
                  />
                  <Bar
                    dataKey="Disagree"
                    stackId="stack"
                    fill={LIKERT5_COLORS.disagree}
                    name="Disagree"
                  />
                  <Bar
                    dataKey="Neutral"
                    stackId="stack"
                    fill={LIKERT5_COLORS.neutral}
                    name="Neutral"
                  />
                  <Bar
                    dataKey="Agree"
                    stackId="stack"
                    fill={LIKERT5_COLORS.agree}
                    name="Agree"
                  />
                  <Bar
                    dataKey="Strongly Agree"
                    stackId="stack"
                    fill={LIKERT5_COLORS.stronglyAgree}
                    name="Strongly Agree"
                  />
                </>
              )}

              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
                wrapperStyle={{ fontSize: 11 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        {isLikert3
          ? 'Left = Rarely + Sometimes, Right = Frequently'
          : 'Left = Negative sentiment, Right = Positive sentiment (Neutral on right side)'}
      </p>
    </div>
  );
}
