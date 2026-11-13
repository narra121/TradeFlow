import { useEffect, useState, type RefObject } from 'react';

/**
 * True once the element has been on screen, which is also after its first paint: the moment the lazy visuals may load.
 * Never true in an automated browser: scripts/prerender-routes.js snapshots /login and /signup in one, and the snapshot
 * must be the first paint (empty picture box), not a demo frozen mid-animation that the real page then replaces.
 */
export function useSeen(ref: RefObject<Element>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || navigator.webdriver) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}
