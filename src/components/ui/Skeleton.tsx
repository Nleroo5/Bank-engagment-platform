import React from 'react';

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(4)].map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton className="h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {[...Array(rows)].map((_, i) => (
            <tr key={i}>
              {[...Array(4)].map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <Skeleton className="h-4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Deterministic bar heights — Math.random() in render causes React hydration mismatches
// (server produces different values than the client re-render, triggering errors #418/#423/#425)
const SKELETON_BAR_HEIGHTS = [120, 80, 150, 60, 130, 90, 110];

export function SkeletonChart() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="flex items-end gap-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1">
            <Skeleton
              className="mb-2 w-full"
              style={{ height: `${SKELETON_BAR_HEIGHTS[i % SKELETON_BAR_HEIGHTS.length]}px` }}
            />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
