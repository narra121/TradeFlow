/** When a dialog opened from a row menu closes, the menu item is gone: focus goes to the row's actions button, found by its accessible name. */
export function returnFocusByName(name: string | null | undefined, event: Event): void {
  if (!name) return;
  const target = [...document.querySelectorAll<HTMLElement>('button[aria-label]')].find((b) => b.getAttribute('aria-label') === name);
  if (!target) return;
  event.preventDefault();
  target.focus();
}

/**
 * `onOpenAutoFocus` of a popover that holds an `AccountListbox`: focus goes to its search field, or to the list when
 * it is too short to have one. An `autoFocus` attribute loses to the focus trap of a dialog the popover sits in.
 */
export function focusAccountList(event: Event): void {
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('input[type=search], [role=listbox]')?.focus();
}
