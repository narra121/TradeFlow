import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * react-router does not scroll to `#id` on client-side navigation (BrowserRouter). Scrolls the
 * target into view and moves focus to it so `/glossary#drawdown` and `/#product` work from links.
 */
export function useHashScroll(): void {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
}
