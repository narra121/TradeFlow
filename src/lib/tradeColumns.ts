import type { SortKey } from '@/lib/tradeFilters';

export type ColumnGroup = 'Identity' | 'Execution' | 'Result' | 'Journal';
export type ColumnPreset = 'review' | 'execution' | 'journal';

export interface TradeColumnDef {
  id: string;
  label: string;
  group: ColumnGroup;
  sort?: SortKey;
  /** Pixel width (default); the table is fixed-width-friendly so the Review preset fits 1,040 px. */
  width: number;
  align?: 'right';
  pinned?: 'left' | 'right';
  /** Presets that include the column. */
  presets: ColumnPreset[];
  /** Hidden in the docked pane's compact set. */
  compact?: boolean;
}

export const TRADE_COLUMNS: TradeColumnDef[] = [
  { id: 'date', label: 'Date', group: 'Identity', sort: 'date', width: 112, pinned: 'left', presets: ['review', 'execution', 'journal'], compact: true },
  { id: 'symbol', label: 'Symbol', group: 'Identity', sort: 'symbol', width: 112, pinned: 'left', presets: ['review', 'execution', 'journal'], compact: true },
  { id: 'side', label: 'Side', group: 'Identity', sort: 'side', width: 76, presets: ['review', 'execution'] },
  { id: 'account', label: 'Account', group: 'Identity', sort: 'account', width: 136, presets: [] },
  { id: 'asset', label: 'Asset class', group: 'Identity', sort: 'asset', width: 96, presets: ['execution'] },
  { id: 'qty', label: 'Qty', group: 'Execution', sort: 'size', width: 64, align: 'right', presets: ['review', 'execution'] },
  { id: 'entry', label: 'Entry', group: 'Execution', sort: 'entry', width: 104, align: 'right', presets: ['review', 'execution'] },
  { id: 'exit', label: 'Exit', group: 'Execution', sort: 'exit', width: 104, align: 'right', presets: ['review', 'execution'] },
  { id: 'stop', label: 'Stop', group: 'Execution', sort: 'stop', width: 104, align: 'right', presets: ['execution'] },
  { id: 'target', label: 'Target', group: 'Execution', sort: 'target', width: 104, align: 'right', presets: ['execution'] },
  { id: 'opened', label: 'Opened', group: 'Execution', sort: 'opened', width: 120, presets: ['execution'] },
  { id: 'hold', label: 'Hold', group: 'Execution', sort: 'hold', width: 72, align: 'right', presets: ['execution'] },
  { id: 'fees', label: 'Fees', group: 'Execution', sort: 'fees', width: 80, align: 'right', presets: ['execution'] },
  { id: 'pnl', label: 'Net P&L', group: 'Result', sort: 'pnl', width: 112, align: 'right', pinned: 'right', presets: ['review', 'execution', 'journal'], compact: true },
  { id: 'gross', label: 'Gross P&L', group: 'Result', sort: 'gross', width: 112, align: 'right', presets: ['execution'] },
  { id: 'risk', label: 'Risk', group: 'Result', sort: 'risk', width: 88, align: 'right', presets: ['execution'] },
  { id: 'r', label: 'R', group: 'Result', sort: 'r', width: 72, align: 'right', presets: ['review', 'execution', 'journal'], compact: true },
  { id: 'planned', label: 'Planned R:R', group: 'Result', sort: 'planned', width: 80, align: 'right', presets: [] },
  { id: 'outcome', label: 'Outcome', group: 'Result', sort: 'outcome', width: 88, presets: ['review'] },
  { id: 'strategy', label: 'Strategy', group: 'Journal', sort: 'strategy', width: 104, presets: ['review', 'journal'] },
  { id: 'session', label: 'Session', group: 'Journal', sort: 'session', width: 104, presets: ['journal'] },
  { id: 'market', label: 'Market', group: 'Journal', sort: 'market', width: 104, presets: ['journal'] },
  { id: 'mistakes', label: 'Mistakes', group: 'Journal', width: 140, presets: ['journal'] },
  { id: 'broken', label: 'Broken rules', group: 'Journal', sort: 'broken', width: 96, presets: ['journal'] },
  { id: 'tags', label: 'Tags', group: 'Journal', width: 140, presets: ['journal'] },
  { id: 'lesson', label: 'Key lesson', group: 'Journal', width: 200, presets: ['journal'] },
  { id: 'news', label: 'News', group: 'Journal', width: 120, presets: [] },
  { id: 'journal', label: 'Journal', group: 'Journal', width: 68, presets: ['review', 'journal'] },
];

export const PRESET_LABEL: Record<ColumnPreset, string> = { review: 'Review', execution: 'Execution', journal: 'Journal' };

export interface ColumnConfig {
  preset: ColumnPreset | 'custom';
  /** Widths in px the user dragged columns to (E-035), by column id. */
  widths?: Record<string, number>;
  /** Ids in display order when `preset` is `custom`. */
  custom: string[];
}

export const DEFAULT_COLUMN_CONFIG: ColumnConfig = { preset: 'review', custom: [] };
export const COLUMN_KEY = 'tq.tradelog.columns';

export function presetColumns(preset: ColumnPreset): string[] {
  return TRADE_COLUMNS.filter((c) => c.presets.includes(preset)).map((c) => c.id);
}

/**
 * Columns to draw, in order. Account is added automatically while the scope is All accounts; the docked pane keeps
 * only the compact set; pinned columns keep their edge.
 */
export function resolveColumns(config: ColumnConfig, opts: { showAccount: boolean; compact: boolean }): TradeColumnDef[] {
  const ids = config.preset === 'custom' ? config.custom : presetColumns(config.preset);
  const set = new Set(ids);
  if (opts.showAccount) set.add('account');
  else if (config.preset !== 'custom') set.delete('account');
  let cols = TRADE_COLUMNS.filter((c) => set.has(c.id));
  if (config.preset === 'custom') cols = ids.map((id) => TRADE_COLUMNS.find((c) => c.id === id)).filter((c): c is TradeColumnDef => !!c).concat(opts.showAccount && !ids.includes('account') ? TRADE_COLUMNS.filter((c) => c.id === 'account') : []);
  if (opts.compact) cols = cols.filter((c) => c.compact);
  const byCatalogue = (a: TradeColumnDef, b: TradeColumnDef) => TRADE_COLUMNS.indexOf(a) - TRADE_COLUMNS.indexOf(b);
  const left = cols.filter((c) => c.pinned === 'left').sort(byCatalogue);
  const right = cols.filter((c) => c.pinned === 'right').sort(byCatalogue);
  const middle = cols.filter((c) => !c.pinned);
  return [...left, ...middle, ...right];
}

export function loadColumnConfig(): ColumnConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_KEY) ?? 'null') as Partial<ColumnConfig> | null;
    if (raw && (raw.preset === 'custom' || raw.preset === 'review' || raw.preset === 'execution' || raw.preset === 'journal')) {
      const widths = Object.fromEntries(Object.entries(raw.widths ?? {}).filter(([id, w]) => TRADE_COLUMNS.some((c) => c.id === id) && typeof w === 'number'));
      return { preset: raw.preset, custom: (raw.custom ?? []).filter((id) => TRADE_COLUMNS.some((c) => c.id === id)), ...(Object.keys(widths).length ? { widths } : {}) };
    }
  } catch {
    // fall through to the default
  }
  return DEFAULT_COLUMN_CONFIG;
}

export function saveColumnConfig(c: ColumnConfig): void {
  try {
    localStorage.setItem(COLUMN_KEY, JSON.stringify(c));
  } catch {
    // not persisted
  }
}

/** Moves one id up or down within a custom list. */
export function moveColumn(ids: string[], id: string, delta: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
