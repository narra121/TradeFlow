/** When a dialog opened from a row menu closes, the menu item is gone: focus goes to the row's actions button, found by its accessible name. */
export function returnFocusByName(name: string | null | undefined, event: Event): void {
  if (!name) return;
  const target = [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find((b) => b.getAttribute('aria-label') === name);
  if (!target) return;
  event.preventDefault();
  target.focus();
}
