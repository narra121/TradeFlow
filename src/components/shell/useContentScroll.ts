import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const LIST = '[data-trade-list]';
/** Pixels one arrow press moves, as in the browser's own scrolling. */
const ARROW_STEP = 40;

function pageKeyTarget(e: KeyboardEvent, list: HTMLElement): number | null {
  const page = Math.round(list.clientHeight * 0.875);
  switch (e.key) {
    case 'PageDown':
      return list.scrollTop + page;
    case 'PageUp':
      return list.scrollTop - page;
    case ' ':
      return list.scrollTop + (e.shiftKey ? -page : page);
    case 'ArrowDown':
      return list.scrollTop + ARROW_STEP;
    case 'ArrowUp':
      return list.scrollTop - ARROW_STEP;
    case 'Home':
      return 0;
    case 'End':
      return list.scrollHeight;
    default:
      return null;
  }
}

/**
 * The content list is the app's only scroller (the document never scrolls), so it also does what the document did for a
 * page: a page opened by a link starts at its top, and the page keys scroll it while focus is on the page title, which
 * takes focus on every route change, or nowhere.
 */
export function useContentScroll(): void {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== 'POP') document.querySelector(LIST)?.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the type of the navigation is read when the page changes
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const onPageTitle = e.target instanceof HTMLElement && e.target.id === 'page-title';
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !(onPageTitle || e.target === document.body)) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const list = document.querySelector<HTMLElement>(LIST);
      if (!list || list.clientHeight === 0) return;
      const top = pageKeyTarget(e, list);
      if (top === null) return;
      e.preventDefault();
      list.scrollTo({ top });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
