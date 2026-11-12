export type KeyScope = 'Everywhere' | 'Lists' | 'Trade pane and forms';

export interface KeyEntry {
  /** Stable id: handlers, the palette and tooltips refer to it. */
  id: string;
  keys: string[];
  label: string;
  scope: KeyScope;
  /** Single-key shortcut: ignored while typing and when the switch in the sheet is off. */
  single?: boolean;
}

/** The one keyboard map (E-016): the shortcut sheet, the palette hints and `aria-keyshortcuts` all read it. */
export const KEYMAP: KeyEntry[] = [
  { id: 'palette', keys: ['Ctrl/⌘', 'K'], label: 'Command palette', scope: 'Everywhere' },
  { id: 'new-trade', keys: ['N'], label: 'New trade', scope: 'Everywhere', single: true },
  { id: 'search', keys: ['/'], label: 'Search trades', scope: 'Everywhere', single: true },
  { id: 'shortcuts', keys: ['?'], label: 'This sheet', scope: 'Everywhere', single: true },
  { id: 'collapse-sidebar', keys: ['['], label: 'Collapse or expand the sidebar', scope: 'Everywhere', single: true },
  { id: 'period-prev', keys: [','], label: 'Previous period', scope: 'Everywhere', single: true },
  { id: 'period-next', keys: ['.'], label: 'Next period', scope: 'Everywhere', single: true },
  { id: 'refresh', keys: ['Shift', 'R'], label: 'Refresh the data on screen', scope: 'Everywhere', single: true },
  { id: 'region', keys: ['F6'], label: 'Move between sidebar, top bar, scope bar, page and pane', scope: 'Everywhere' },
  { id: 'row-next', keys: ['↓', 'J'], label: 'Next row', scope: 'Lists', single: true },
  { id: 'row-prev', keys: ['↑', 'K'], label: 'Previous row', scope: 'Lists', single: true },
  { id: 'row-open', keys: ['Enter'], label: 'Open the highlighted trade', scope: 'Lists' },
  { id: 'row-select', keys: ['X'], label: 'Select the highlighted row', scope: 'Lists', single: true },
  { id: 'row-select-space', keys: ['Space'], label: 'Select the highlighted row', scope: 'Lists' },
  { id: 'pick-strategy', keys: ['S'], label: 'Strategy picker for the row or the selection', scope: 'Lists', single: true },
  { id: 'pick-mistakes', keys: ['T'], label: 'Mistakes picker for the row or the selection', scope: 'Lists', single: true },
  { id: 'pick-tags', keys: ['Shift', 'T'], label: 'Tags picker for the row or the selection', scope: 'Lists', single: true },
  { id: 'group-collapse', keys: ['←'], label: 'Collapse the group (on a group header)', scope: 'Lists' },
  { id: 'group-expand', keys: ['→'], label: 'Expand the group (on a group header)', scope: 'Lists' },
  { id: 'delete', keys: ['Delete'], label: 'Delete (asks first)', scope: 'Lists' },
  { id: 'trade-edit', keys: ['E'], label: 'Edit the open trade', scope: 'Trade pane and forms', single: true },
  { id: 'trade-next', keys: ['→', 'J'], label: 'Next trade', scope: 'Trade pane and forms', single: true },
  { id: 'trade-prev', keys: ['←', 'K'], label: 'Previous trade', scope: 'Trade pane and forms', single: true },
  { id: 'trade-expand', keys: ['F'], label: 'Expand or collapse the trade pane', scope: 'Trade pane and forms', single: true },
  { id: 'trade-duplicate', keys: ['Shift', 'N'], label: 'New trade from the open one', scope: 'Trade pane and forms', single: true },
  { id: 'trade-screenshots', keys: ['V'], label: 'View screenshots', scope: 'Trade pane and forms', single: true },
  { id: 'cancel', keys: ['Esc'], label: 'Cancel, leave edit mode, close the pane', scope: 'Trade pane and forms' },
  { id: 'save', keys: ['Ctrl/⌘', 'Enter'], label: 'Save the trade form', scope: 'Trade pane and forms' },
  { id: 'save-another', keys: ['Ctrl/⌘', 'Shift', 'Enter'], label: 'Save and add another', scope: 'Trade pane and forms' },
];

export const KEY_SCOPES: KeyScope[] = ['Everywhere', 'Lists', 'Trade pane and forms'];

export const keyEntry = (id: string): KeyEntry | undefined => KEYMAP.find((k) => k.id === id);
