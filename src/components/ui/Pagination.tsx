import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

/**
 * Server-friendly pagination using <Link> for URL-based navigation.
 * Renders Previous / page numbers / Next controls.
 */
export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  function href(page: number): string {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-6">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={href(currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400" aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            &hellip;
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary-600 text-sm font-semibold text-white"
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={href(currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400" aria-disabled="true">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

/**
 * Build an array of page numbers and ellipsis markers.
 * Always shows first, last, and pages around the current page.
 */
function buildPageNumbers(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export { PAGE_SIZE };
