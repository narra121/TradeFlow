import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STORAGE_KEY = 'tradequt-table-page-size';

export function getStoredPageSize(): PageSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (PAGE_SIZE_OPTIONS.includes(parsed as PageSize)) {
        return parsed as PageSize;
      }
    }
  } catch {
    // localStorage unavailable
  }
  return 50;
}

function storePageSize(size: PageSize) {
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    // localStorage unavailable
  }
}

export interface TablePaginationProps {
  /** Current 1-based page number */
  currentPage: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Items displayed per page */
  pageSize: PageSize;
  /** Whether a page transition is in progress */
  isLoading?: boolean;
  /** Callback when user changes page */
  onPageChange: (page: number) => void;
  /** Callback when user changes page size */
  onPageSizeChange: (size: PageSize) => void;
  /** Optional className for the outer container */
  className?: string;
}

/**
 * Generates an array of page numbers and ellipsis markers for pagination display.
 * Always shows first page, last page, and up to 3 pages around the current page.
 * Example: [1, '...', 4, 5, 6, '...', 10]
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  // Always show page 1
  pages.push(1);

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  // Pages around current
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      if (clamped !== currentPage) {
        onPageChange(clamped);
      }
    },
    [currentPage, totalPages, onPageChange],
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = Number(value) as PageSize;
      storePageSize(newSize);
      onPageSizeChange(newSize);
    },
    [onPageSizeChange],
  );

  // Keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: KeyboardEvent) => {
      // Only handle when focus is inside the pagination bar
      if (!container.contains(document.activeElement)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages);
      }
    };

    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  }, [currentPage, totalPages, goToPage]);

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <div
      ref={containerRef}
      role="navigation"
      aria-label="Table pagination"
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        'border-t border-border/50 bg-card/80 backdrop-blur-sm',
        className,
      )}
    >
      {/* Left: Item count + page size */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">
          {totalItems === 0 ? (
            'No trades'
          ) : (
            <>
              Showing{' '}
              <span className="font-medium text-foreground">
                {startItem}-{endItem}
              </span>{' '}
              of{' '}
              <span className="font-medium text-foreground">{totalItems}</span>{' '}
              trades
            </>
          )}
        </span>

        {/* Mobile count */}
        <span className="text-sm text-muted-foreground whitespace-nowrap sm:hidden">
          {totalItems === 0 ? 'No trades' : `${startItem}-${endItem} of ${totalItems}`}
        </span>

        {/* Loading indicator */}
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        )}

        {/* Page size selector */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">per page</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1">
        {/* Desktop: Full navigation */}
        <div className="hidden sm:flex items-center gap-1">
          {/* First page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isFirstPage || isLoading}
            onClick={() => goToPage(1)}
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          {/* Previous */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isFirstPage || isLoading}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Page numbers */}
          {pageNumbers.map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center w-8 h-8 text-sm text-muted-foreground select-none"
                aria-hidden
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === currentPage ? 'outline' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 text-sm font-medium',
                  item === currentPage &&
                    'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20',
                )}
                disabled={isLoading}
                onClick={() => goToPage(item)}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </Button>
            ),
          )}

          {/* Next */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLastPage || isLoading}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLastPage || isLoading}
            onClick={() => goToPage(totalPages)}
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile: Simplified navigation */}
        <div className="flex sm:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isFirstPage || isLoading}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-medium text-foreground px-2 min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLastPage || isLoading}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
