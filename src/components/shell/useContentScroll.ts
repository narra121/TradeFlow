import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const LIST = '[data-trade-list]';
/** Chat scrolls its own message log inside the list, so the page keys belong to it there. */
const CHAT_LOG = '[role="log"]';
const OPEN_DIALOG = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
const RESTORE_FRAMES = 60;
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
 * Puts the list at `top` and keeps trying for about a second: a page that is still loading is too short to reach it yet.
 * Returns the cancel function.
 */
function restoreScroll(list: HTMLElement, top: number): () => void {
  let frame = 0;
  let tries = 0;
  const step = () => {
    list.scrollTop = top;
    if (Math.abs(list.scrollTop - top) > 1 && ++tries < RESTORE_FRAMES) frame = requestAnimationFrame(step);
  };
  step();
  return () => cancelAnimationFrame(frame);
}

/**
 * The content list is the app's only scroller (the document never scrolls), so it also does what the document did for a
 * page: a page opened by a link starts at its top, Back and Forward return to where that entry was left, and the page
 * keys scroll it while focus is on the page title, which takes focus on every route change, or nowhere.
 */
export function useContentScroll(): void {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const entry = useRef(key);

  // Set in the commit that swaps the page, before the browser clamps the list to the new content and reports it as a scroll.
  useLayoutEffect(() => {
    entry.current = key;
  }, [key]);

  useEffect(() => {
    const onScroll = (e: Event) => {
      if (e.target instanceof HTMLElement && e.target.matches(LIST)) positions.current.set(entry.current, e.target.scrollTop);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);

  useLayoutEffect(() => {
    const list = document.querySelector<HTMLElement>(LIST);
    if (navigationType !== 'POP' || !list) return;
    const top = positions.current.get(key) ?? 0;
    if (list.scrollTop !== top) return restoreScroll(list, top);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the type of the navigation is read when the entry changes
  }, [key]);

  useEffect(() => {
    if (navigationType !== 'POP') document.querySelector(LIST)?.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the type of the navigation is read when the page changes
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const onPageTitle = e.target instanceof HTMLElement && e.target.id === 'page-title';
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !(onPageTitle || e.target === document.body)) return;
      if (document.querySelector(OPEN_DIALOG)) return;
      const list = document.querySelector<HTMLElement>(LIST);
      const scroller = list?.querySelector<HTMLElement>(CHAT_LOG) ?? list;
      if (!scroller || scroller.clientHeight === 0) return;
      const top = pageKeyTarget(e, scroller);
      if (top === null) return;
      e.preventDefault();
      scroller.scrollTo({ top });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
