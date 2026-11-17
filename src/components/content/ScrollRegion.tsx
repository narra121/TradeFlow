import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A box that scrolls sideways when its content is wider than the page (tables on phones). Only while it actually
 * scrolls is it a named, focusable region, so keyboard users can scroll it (WCAG 2.1.1) without an extra tab stop for
 * every table that fits; it then also says that more columns sit to the right.
 */
export function ScrollRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return (
    <>
      <div
        ref={ref}
        className={cn('overflow-x-auto', className)}
        {...(scrolls ? { role: 'region', tabIndex: 0, 'aria-label': label } : {})}
      >
        {children}
      </div>
      {scrolls && (
        <p aria-hidden="true" className="px-3 py-2 text-xs text-muted-foreground">
          Scroll sideways for more columns →
        </p>
      )}
    </>
  );
}
