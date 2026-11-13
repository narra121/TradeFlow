import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** `/guide#100%` is a valid URL whose hash is not valid percent-encoding: use it as written. */
function targetId(hash: string): string {
  const raw = hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * react-router scrolls nowhere on client-side navigation (BrowserRouter). A link to another page opens it at the top;
 * a link with `#id` scrolls the target into view and moves focus to it so `/glossary#drawdown` and `/#product` work.
 * Back and forward (and the first load) are left to the browser's own scroll restoration.
 */
export function useHashScroll(): void {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (!hash) {
      if (navigationType !== 'POP') window.scrollTo(0, 0);
      return;
    }
    const id = targetId(hash);
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the type of the navigation is read when the page or hash changes
  }, [pathname, hash]);
}
