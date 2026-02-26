'use client';

import { Treemap, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import type { DemographicDistribution } from '@/components/reports/RespondentDemographicsSection';

interface DemographicsTreemapProps {
  distributions: DemographicDistribution[];
}

const FIELD_COLORS: Record<string, string> = {
  division: '#003da5',
  jobRole: '#8B5CF6',
  gender: '#EC4899',
  timeAtBank: '#10B981',
  bankExperience: '#F59E0B',
  employmentStatus: '#14B8A6',
  bankSize: '#3B82F6',
  device: '#6366F1',
  country: '#ce0037',
  state: '#F97316',
  metroArea: '#EF4444',
  city: '#84CC16',
};

interface TreemapNode {
  name: string;
  size?: number;
  field?: string;
  parentLabel?: string;
  children?: TreemapNode[];
}

function buildTreemapData(distributions: DemographicDistribution[]): TreemapNode[] {
  return distributions
    .filter((dist) => dist.distribution.length > 0)
    .map((dist) => ({
      name: dist.label,
      field: dist.field,
      children: dist.distribution.slice(0, 10).map((item) => ({
        name: item.value,
        size: item.count,
        field: dist.field,
        parentLabel: dist.label,
      })),
    }));
}

function getColor(field: string, opacity: number = 1): string {
  const hex = FIELD_COLORS[field] ?? '#6B7280';
  if (opacity === 1) return hex;

  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

interface CustomContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  depth: number;
  field?: string;
  size?: number;
}

function CustomTreemapContent(props: CustomContentProps) {
  const { x, y, width, height, name, depth, field, size } = props;

  if (depth === 0) return null;

  const fieldKey = field ?? '';
  const isParent = depth === 1;
  const bgColor = isParent
    ? getColor(fieldKey, 0.15)
    : getColor(fieldKey, 0.7);
  const textColor = isParent ? getColor(fieldKey) : '#FFFFFF';

  const showLabel = width > 40 && height > 20;
  const showCount = width > 50 && height > 34;
  const fontSize = Math.min(12, Math.max(9, width / 10));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        ry={2}
        style={{
          fill: bgColor,
          stroke: '#fff',
          strokeWidth: isParent ? 2 : 1,
          strokeOpacity: 1,
        }}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showCount ? 6 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: isParent ? 11 : fontSize,
            fontWeight: isParent ? 700 : 500,
            fill: textColor,
          }}
        >
          {name.length > Math.floor(width / 7)
            ? name.slice(0, Math.floor(width / 7)) + '...'
            : name}
        </text>
      )}
      {showCount && !isParent && size != null && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: Math.max(9, fontSize - 1),
            fill: 'rgba(255,255,255,0.85)',
          }}
        >
          {size}
        </text>
      )}
    </g>
  );
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.depth === 1) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-gray-900">{d.name}</p>
      {d.parentLabel && (
        <p className="text-xs text-gray-500">{d.parentLabel}</p>
      )}
      <p className="text-gray-600">{d.size} respondents</p>
    </div>
  );
}

export function DemographicsTreemap({ distributions }: DemographicsTreemapProps) {
  const treeData = buildTreemapData(distributions);

  if (treeData.length === 0) return null;

  // Pick top 4-6 fields that have the most interesting data (most values)
  const topFields = [...treeData]
    .sort((a, b) => (b.children?.length ?? 0) - (a.children?.length ?? 0))
    .slice(0, 6);

  const rootData = {
    name: 'Demographics',
    children: topFields,
  };

  return (
    <div className="w-full">
      <div className="h-72 sm:h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={rootData.children}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={<CustomTreemapContent x={0} y={0} width={0} height={0} name="" depth={0} />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {topFields.map((field) => (
          <div key={field.field} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: getColor(field.field ?? '', 0.7) }}
            />
            <span className="text-gray-600">{field.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
