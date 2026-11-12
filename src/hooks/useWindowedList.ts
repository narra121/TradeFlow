import { useLayoutEffect, useState, type RefObject } from 'react';
import { scrollParentOf } from '@/lib/scrollParent';

export interface ListItemBox {
  top: number;
  height: number;
}

/**
 * Which items of a fixed-height list are near the viewport of its scrolling ancestor (E-050: ≤ 40 mounted of 5,000).
 * `items` are laid out top to bottom from the container's top edge; the caller renders spacers of the returned heights.
 */
export function useWindowedList(ref: RefObject<HTMLElement>, items: ListItemBox[], enabled: boolean, overscan = 6) {
  const [view, setView] = useState({ top: 0, height: 800 });
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    const parent = scrollParentOf(el);
    const measure = () => {
      if (!el) return;
      const offset = el.getBoundingClientRect().top - (parent ? parent.getBoundingClientRect().top : 0);
      const height = parent ? parent.clientHeight : window.innerHeight;
      // Viewport top relative to the container's top edge.
      const top = -offset;
      setView((v) => (Math.abs(v.top - top) < 1 && v.height === height ? v : { top, height }));
    };
    measure();
    const target: HTMLElement | Window = parent ?? window;
    target.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      target.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [ref, enabled, items.length]);

  if (!enabled || items.length === 0) return { start: 0, end: items.length, spacerTop: 0, spacerBottom: 0 };
  const first = (y: number) => {
    let lo = 0;
    let hi = items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (items[mid].top + items[mid].height <= y) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const start = Math.max(0, first(view.top) - overscan);
  const end = Math.min(items.length, first(view.top + view.height) + 1 + overscan);
  const last = items[items.length - 1];
  const total = last.top + last.height;
  const tail = items[end - 1];
  return { start, end, spacerTop: items[start].top, spacerBottom: Math.max(0, total - (tail.top + tail.height)) };
}
