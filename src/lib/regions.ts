/** Landmarks `F6` moves between, in reading order; a region that is not on the page is skipped. */
const REGION_SELECTORS = ['nav[aria-label="Main"]', 'header', '[role="toolbar"][aria-label="Data shown"]', '#main', 'aside[aria-label]'];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

function regions(root: ParentNode): HTMLElement[] {
  return REGION_SELECTORS.map((s) => root.querySelector<HTMLElement>(s)).filter((el): el is HTMLElement => !!el);
}

/** Moves focus to the next (or previous) region and returns it; wraps around. */
export function focusNextRegion(dir: 1 | -1, root: ParentNode = document): HTMLElement | null {
  const list = regions(root);
  if (list.length === 0) return null;
  const current = list.findIndex((r) => r.contains(document.activeElement));
  const next = list[(current + dir + list.length) % list.length];
  const target = next.matches(FOCUSABLE) ? next : next.querySelector<HTMLElement>(FOCUSABLE);
  (target ?? next).focus({ preventScroll: false });
  return next;
}
