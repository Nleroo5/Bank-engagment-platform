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
} from 'recharts';

const CHART_COLORS = [
  '#003da5',
  '#ce0037',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
];

interface Distribution {
  field: string;
  label: string;
  total: number;
  distribution: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
}

interface DemographicsDetailSectionProps {
  distributions: Distribution[];
}

export function DemographicsDetailSection({
  distributions,
}: DemographicsDetailSectionProps) {
  const visibleDistributions = distributions.filter(
    (dist) => dist.distribution.length > 0
  );

  if (visibleDistributions.length === 0) {
    return null;
  }

  return (
    <>
      {visibleDistributions.map((dist, index) => (
        <div
          key={dist.field}
          className="rounded-lg border border-gray-200 bg-white p-6"
        >
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            {dist.label}
          </h2>

          <div className="-mx-2 mb-6 overflow-x-auto px-2">
            <div
              style={{
                height: Math.min(
                  600,
                  Math.max(300, dist.distribution.length * 50)
                ),
                minWidth: 480,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dist.distribution}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="value"
                    type="category"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'count') {
                        return [value, 'Count'];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  >
                    {dist.distribution.map((_entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          CHART_COLORS[(index + idx) % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {dist.label}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {dist.distribution.map((item, idx) => (
                  <tr key={item.value} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.value}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                      {item.percentage}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-4 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor:
                                CHART_COLORS[
                                  (index + idx) % CHART_COLORS.length
                                ],
                            }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs text-gray-500">
                          {item.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    {dist.total}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    100%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
