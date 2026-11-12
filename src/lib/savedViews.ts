import { EMPTY_FILTERS, type SortState, type TradeFilters } from '@/lib/tradeFilters';
import type { GroupBy } from '@/lib/tradeGroups';
import type { ColumnConfig } from '@/lib/tradeColumns';

/** A view is the Trades list's whole configuration except the account and period (those are the scope). */
export interface TradeView {
  id: string;
  name: string;
  builtIn?: boolean;
  /** `winners`, `losers` and `needs-journal` are predicates that the filter model cannot express. */
  special?: 'winners' | 'losers' | 'needs-journal';
  filters: TradeFilters;
  sort: SortState;
  group: GroupBy;
  columns: ColumnConfig;
}

const DEFAULT_SORT: SortState = { key: 'date', dir: 'desc' };
const REVIEW: ColumnConfig = { preset: 'review', custom: [] };

export const BUILT_IN_VIEWS: TradeView[] = [
  { id: 'all', name: 'All', builtIn: true, filters: EMPTY_FILTERS, sort: DEFAULT_SORT, group: 'day', columns: REVIEW },
  { id: 'winners', name: 'Winners', builtIn: true, special: 'winners', filters: EMPTY_FILTERS, sort: { key: 'pnl', dir: 'desc' }, group: 'none', columns: REVIEW },
  { id: 'losers', name: 'Losers', builtIn: true, special: 'losers', filters: EMPTY_FILTERS, sort: { key: 'pnl', dir: 'asc' }, group: 'none', columns: REVIEW },
  { id: 'needs-journal', name: 'Needs journal', builtIn: true, special: 'needs-journal', filters: EMPTY_FILTERS, sort: DEFAULT_SORT, group: 'day', columns: { preset: 'journal', custom: [] } },
];

export const VIEWS_KEY = 'tq.tradelog.views';
export const DEFAULT_VIEW_KEY = 'tq.tradelog.defaultView';

export function loadCustomViews(): TradeView[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]') as TradeView[];
    return Array.isArray(raw) ? raw.filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCustomViews(views: TradeView[]): void {
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    // not persisted
  }
}

export function newViewId(): string {
  return `v-${Math.random().toString(36).slice(2, 9)}`;
}

/** A trade needs journalling when it has no strategy, no mistakes tagged on a loss, no notes / lesson, or no screenshot. */
export function needsJournal(t: { strategy?: string; setup?: string; notes?: string; keyLesson?: string; images?: unknown[]; pnl: number; mistakes?: string[] }): boolean {
  const noStrategy = !(t.strategy || t.setup);
  const noText = !t.notes && !t.keyLesson;
  const noShot = !t.images || t.images.length === 0;
  return noStrategy || noText || noShot;
}

export function matchesSpecial(special: TradeView['special'], t: Parameters<typeof needsJournal>[0]): boolean {
  if (special === 'winners') return t.pnl > 0;
  if (special === 'losers') return t.pnl < 0;
  if (special === 'needs-journal') return needsJournal(t);
  return true;
}

/** True when the live configuration differs from the stored one (the tab shows `Save` / `Reset`). */
export function isModified(view: TradeView, live: Pick<TradeView, 'filters' | 'sort' | 'group' | 'columns'>): boolean {
  return JSON.stringify([view.filters, view.sort, view.group, view.columns]) !== JSON.stringify([live.filters, live.sort, live.group, live.columns]);
}
