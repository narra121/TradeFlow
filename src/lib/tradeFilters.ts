import { rMultiple } from '@/lib/pnl';
import { TRADELOG_KEY } from '@/lib/scope';
import type { Trade, TradingAccount } from '@/types/trade';

export interface TradeFilters {
  q: string;
  symbols: string[];
  outcomes: string[];
  strategies: string[];
  sessions: string[];
  mistakes: string[];
  tags: string[];
  assets: string[];
  /** Rule ids: trades that broke any of them. */
  broken: string[];
  /** `LONG` / `SHORT`. */
  sides: string[];
  /** Account ids. */
  accounts: string[];
  /** Net P&L quick pick: loss, small win, … kept as a simple sign filter. */
  result: '' | 'win' | 'loss' | 'flat';
}

export const EMPTY_FILTERS: TradeFilters = { q: '', symbols: [], outcomes: [], strategies: [], sessions: [], mistakes: [], tags: [], assets: [], broken: [], sides: [], accounts: [], result: '' };

export function hasActiveFilters(f: TradeFilters): boolean {
  return !!f.q.trim() || !!f.result || f.symbols.length + f.outcomes.length + f.strategies.length + f.sessions.length + f.mistakes.length + f.tags.length + f.assets.length + f.broken.length + (f.sides?.length ?? 0) + (f.accounts?.length ?? 0) > 0;
}

/** Find matches symbol, strategy, mistakes, tags, key lesson and notes (E-031). */
export function searchText(t: Trade): string {
  return [t.symbol, t.underlying, t.strategy ?? t.setup, ...(t.mistakes ?? []), ...(t.tags ?? []), t.keyLesson, t.notes].filter(Boolean).join(' ').toLowerCase();
}

export function applyFilters(trades: Trade[], f: TradeFilters): Trade[] {
  const q = f.q.trim().toLowerCase();
  return trades.filter((t) => {
    if (q && !searchText(t).includes(q)) return false;
    if (f.result === 'win' && !(t.pnl > 0)) return false;
    if (f.result === 'loss' && !(t.pnl < 0)) return false;
    if (f.result === 'flat' && t.pnl !== 0) return false;
    if (f.tags?.length && !(t.tags ?? []).some((x) => f.tags.includes(x))) return false;
    if (f.assets?.length && !f.assets.includes(t.assetClass ?? '')) return false;
    if (f.broken?.length && !(t.brokenRuleIds ?? []).some((x) => f.broken.includes(x))) return false;
    if (f.sides?.length && !f.sides.includes(t.direction)) return false;
    if (f.accounts?.length && !f.accounts.includes(t.accountId ?? '')) return false;
    if (f.symbols.length && !f.symbols.includes(t.symbol)) return false;
    if (f.outcomes.length && !f.outcomes.includes(t.outcome)) return false;
    if (f.strategies.length && !f.strategies.includes(t.strategy ?? t.setup ?? '')) return false;
    if (f.sessions.length && !f.sessions.includes(t.session ?? '')) return false;
    if (f.mistakes.length && !(t.mistakes ?? []).some((m) => f.mistakes.includes(m))) return false;
    return true;
  });
}

export type SortKey =
  | 'date' | 'symbol' | 'side' | 'account' | 'asset' | 'size' | 'entry' | 'exit' | 'stop' | 'target' | 'opened' | 'hold' | 'fees'
  | 'pnl' | 'gross' | 'risk' | 'r' | 'planned' | 'outcome' | 'strategy' | 'session' | 'market' | 'broken';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}
export const DEFAULT_SORT: SortState = { key: 'date', dir: 'desc' };

/**
 * Net P&L over initial risk when the lot size is known; otherwise the price-based R, which needs no lot size
 * (the API does not return one for older trades, and assuming 1 would give R in the hundreds of thousands).
 */
export function realisedR(t: Trade): number | null {
  if (t.contractMultiplier && t.contractMultiplier > 0) {
    return rMultiple({ entryPrice: t.entryPrice, stopLoss: t.stopLoss, quantity: t.size, multiplier: t.contractMultiplier }, t.pnl);
  }
  if (!t.stopLoss || t.stopLoss <= 0 || t.stopLoss === t.entryPrice) return null;
  const move = (t.exitPrice - t.entryPrice) * (t.direction === 'LONG' ? 1 : -1);
  return Math.round((move / Math.abs(t.entryPrice - t.stopLoss)) * 100) / 100;
}

function sortValue(t: Trade, key: SortKey, accounts: Map<string, TradingAccount>): number | string {
  switch (key) {
    case 'date':
      return new Date(t.exitDate || t.entryDate).getTime() || 0;
    case 'symbol':
      return t.symbol.toLowerCase();
    case 'account':
      return (t.accountId ? accounts.get(t.accountId)?.name : '')?.toLowerCase() ?? '';
    case 'size':
      return t.size ?? 0;
    case 'entry':
      return t.entryPrice ?? 0;
    case 'exit':
      return t.exitPrice ?? 0;
    case 'pnl':
      return t.pnl ?? 0;
    case 'r':
      return realisedR(t) ?? Number.NEGATIVE_INFINITY;
    case 'outcome':
      return t.outcome;
    case 'strategy':
      return (t.strategy ?? t.setup ?? '').toLowerCase();
    case 'session':
      return (t.session ?? '').toLowerCase();
    case 'market':
      return (t.marketCondition ?? '').toLowerCase();
    case 'side':
      return t.direction;
    case 'asset':
      return t.assetClass ?? '';
    case 'stop':
      return t.stopLoss || 0;
    case 'target':
      return t.takeProfit || 0;
    case 'opened':
      return new Date(t.entryDate).getTime() || 0;
    case 'hold':
      return holdingMinutes(t) ?? -1;
    case 'fees':
      return t.fees ?? 0;
    case 'gross':
      return t.grossPnl ?? t.pnl ?? 0;
    case 'risk':
      return riskAmount(t) ?? -1;
    case 'planned':
      return plannedRR(t) ?? -1;
    case 'broken':
      return t.brokenRuleIds?.length ?? 0;
  }
}

export function holdingMinutes(t: Trade): number | null {
  const a = new Date(t.entryDate).getTime();
  const b = new Date(t.exitDate).getTime();
  return Number.isNaN(a) || Number.isNaN(b) || b < a ? null : Math.round((b - a) / 60000);
}

/** Money at risk (entry to stop) when the lot size is known; otherwise null (never guessed). */
export function riskAmount(t: Trade): number | null {
  if (!t.stopLoss || !t.contractMultiplier) return null;
  return Math.abs(t.entryPrice - t.stopLoss) * t.size * t.contractMultiplier;
}

export function plannedRR(t: Trade): number | null {
  if (!t.stopLoss || !t.takeProfit || t.stopLoss === t.entryPrice) return null;
  return Math.abs(t.takeProfit - t.entryPrice) / Math.abs(t.entryPrice - t.stopLoss);
}

export function sortTrades(trades: Trade[], sort: SortState, accounts: Map<string, TradingAccount>): Trade[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...trades].sort((a, b) => {
    const va = sortValue(a, sort.key, accounts);
    const vb = sortValue(b, sort.key, accounts);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return a.id < b.id ? 1 : -1;
  });
}

export interface CurrencySummary {
  currency: string;
  trades: number;
  net: number;
}

export interface ListSummary {
  count: number;
  winRate: number | null;
  /** One entry per currency, largest trade count first. Trades with no account are counted in `noAccount`. */
  byCurrency: CurrencySummary[];
  noAccount: number;
}

export function summarise(trades: Trade[], accounts: Map<string, TradingAccount>): ListSummary {
  const map = new Map<string, CurrencySummary>();
  let wins = 0;
  let noAccount = 0;
  for (const t of trades) {
    if (t.pnl > 0) wins += 1;
    const acc = t.accountId ? accounts.get(t.accountId) : undefined;
    if (!acc) {
      noAccount += 1;
      continue;
    }
    const cur = acc.currency || 'USD';
    const row = map.get(cur) ?? { currency: cur, trades: 0, net: 0 };
    row.trades += 1;
    row.net += t.pnl ?? 0;
    map.set(cur, row);
  }
  return {
    count: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : null,
    byCurrency: [...map.values()].sort((a, b) => b.trades - a.trades),
    noAccount,
  };
}

/** Distinct values (with counts) across the whole scope for a filter's option list. */
export function distinctValues(trades: Trade[], pick: (t: Trade) => string | string[] | undefined): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const v = pick(t);
    for (const item of Array.isArray(v) ? v : v ? [v] : []) if (item) counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface PersistedListState extends TradeFilters {
  page: number;
}

export function loadListState(): PersistedListState | null {
  try {
    const raw = sessionStorage.getItem(TRADELOG_KEY);
    if (!raw) return null;
    return { ...EMPTY_FILTERS, page: 1, ...(JSON.parse(raw) as Partial<PersistedListState>) };
  } catch {
    return null;
  }
}

export function saveListState(state: PersistedListState): void {
  try {
    sessionStorage.setItem(TRADELOG_KEY, JSON.stringify(state));
  } catch {
    // session storage unavailable: the list simply starts clean next time
  }
}
