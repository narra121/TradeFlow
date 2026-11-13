/**
 * The one look of every popup surface: menu, select list, popover, combobox list, tooltip (DESIGN-ENTERPRISE D.1,
 * elevation level 1). The primitives in this folder and the hand-built lists inside popovers take their classes from
 * here.
 */

/**
 * `z-50`, not the `popover` step (40): popups open from inside dialogs and sheets (`z-50` in `dialog.tsx` and
 * `sheet.tsx`) and are portalled after them, so the same step keeps them on top. `popup-motion` lives in `index.css`.
 */
export const popupSurface = 'z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-overlay popup-motion';

/** Distance kept from the viewport edge when a popup is shifted or flipped, in px. */
export const POPUP_COLLISION_PADDING = 8;

/** A row of a popup list: 32 px (44 px on touch), 13 / 20, radius 4; a keyboard focus ring is drawn inside the row. */
export const popupItem =
  'relative flex min-h-8 w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-left text-13 text-foreground -outline-offset-2 transition-colors duration-100 [@media(pointer:coarse)]:min-h-11';

/**
 * The row under the pointer or the keyboard cursor. `--muted`, the usual hover step, is 1.06:1 against `--popover`
 * and cannot be seen, so popups use `--secondary`.
 */
export const popupHighlight = 'bg-secondary';

/** A row of a hand-built list (button, link, label or `li`) inside a popover. */
export const popupOption = `${popupItem} cursor-pointer hover:bg-secondary`;

export const popupLabel = 'px-2 py-1.5 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground';

export const popupSeparator = '-mx-1 my-1 h-px bg-border';
