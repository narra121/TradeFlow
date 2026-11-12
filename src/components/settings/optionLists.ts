import { defaultOptions } from '@/hooks/useSavedOptions';
import type { Trade } from '@/types/trade';

export type ListKey = 'strategies' | 'sessions' | 'marketConditions' | 'mistakes' | 'newsEvents' | 'tags' | 'symbols' | 'timeframes';

export interface ListDef {
  key: ListKey;
  title: string;
  /** Singular noun for messages: `Add a strategy`. */
  noun: string;
  /** The starter list a reset returns to; empty for lists that start empty. */
  defaults: string[];
  /** Values of this list that one trade carries; absent when trades do not store the list (no counts are shown). */
  valuesOf?: (t: Trade) => string[];
}

const one = (v: string | undefined): string[] => (v ? [v] : []);

/** Starter lists come from `defaultOptions` in `hooks/useSavedOptions.ts`, the one place they are defined. */
export const MAIN_LISTS: ListDef[] = [
  { key: 'strategies', title: 'Strategies', noun: 'strategy', defaults: [...defaultOptions.strategies], valuesOf: (t) => one(t.strategy) },
  { key: 'sessions', title: 'Sessions', noun: 'session', defaults: [...defaultOptions.sessions], valuesOf: (t) => one(t.session) },
  { key: 'marketConditions', title: 'Market conditions', noun: 'market condition', defaults: [...defaultOptions.marketConditions], valuesOf: (t) => one(t.marketCondition) },
  { key: 'mistakes', title: 'Mistakes', noun: 'mistake', defaults: [...defaultOptions.mistakes], valuesOf: (t) => t.mistakes ?? [] },
  { key: 'newsEvents', title: 'News events', noun: 'news event', defaults: [...defaultOptions.newsEvents], valuesOf: (t) => t.newsEvents ?? [] },
  { key: 'tags', title: 'Tags', noun: 'tag', defaults: [], valuesOf: (t) => t.tags ?? [] },
];

/** Stored by the API though not part of the trade form's main lists; shown collapsed so what is stored can be seen and reset. */
export const MORE_LISTS: ListDef[] = [
  { key: 'symbols', title: 'Symbols', noun: 'symbol', defaults: [], valuesOf: (t) => one(t.symbol) },
  { key: 'timeframes', title: 'Timeframes', noun: 'timeframe', defaults: [], valuesOf: (t) => (t.images ?? []).map((i) => i.timeframe).filter(Boolean) },
];

/** How many of the given trades carry each value of the list. */
export function countUsage(def: ListDef, trades: Trade[]): Map<string, number> | undefined {
  const valuesOf = def.valuesOf;
  if (!valuesOf) return undefined;
  const counts = new Map<string, number>();
  for (const t of trades) for (const v of valuesOf(t)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

export function hasValue(list: string[], value: string): boolean {
  const key = value.trim().toLowerCase();
  return list.some((v) => v.toLowerCase() === key);
}

/** Entries the user added on top of the starter list. */
export function ownEntries(def: ListDef, list: string[]): string[] {
  return list.filter((v) => !hasValue(def.defaults, v));
}

export function isStarterList(def: ListDef, list: string[]): boolean {
  return list.length === def.defaults.length && def.defaults.every((d) => hasValue(list, d));
}
