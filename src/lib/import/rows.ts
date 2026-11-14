import type { NormalizedTrade } from '@/types/import';
import type { RowDates } from './dates';

/** Everything above this many rows is cut off with a warning (the review grid and the save are built for it). */
export const MAX_REVIEW_ROWS = 5000;

export type RowStatus = 'ready' | 'fix' | 'duplicate' | 'excluded' | 'saved';
export type EditableField = 'symbol' | 'side' | 'quantity' | 'entryPrice' | 'exitPrice' | 'openDate' | 'closeDate' | 'fees' | 'pnl';
export type RowErrors = Partial<Record<EditableField, string>>;

export interface ReviewRow {
  /** unique inside the review; never changes when the row is edited */
  key: string;
  trade: NormalizedTrade;
  /** the row's checkbox: rows that are not included are never saved */
  included: boolean;
  /** file name, or `Screenshots 1–3` */
  source: string;
  /** screenshot batch index, to show the right image next to the row */
  batch?: number;
  /** externalIds of the rows this one was merged from */
  mergedFrom?: string[];
  /** set by Move to account: where this row is saved instead of the import's account */
  accountId?: string;
  /** why the row is in the review (e.g. a line the parser skipped), shown with its errors */
  note?: string;
  /** created on the server by a save that is still open for a retry or an undo */
  saved?: boolean;
  /** screenshot rows: how the dates were read, for the date order switch and the missing open/close time note */
  dates?: RowDates;
}

export function makeRows(trades: NormalizedTrade[], source: string, opts: { batch?: number; startAt?: number } = {}): ReviewRow[] {
  const start = opts.startAt ?? 0;
  return trades.map((trade, i) => ({
    key: `${start + i}|${trade.externalId}`,
    trade,
    included: !trade.duplicate,
    source,
    batch: opts.batch,
  }));
}

const validDate = (iso: string | undefined) => !!iso && !Number.isNaN(new Date(iso).getTime());

/** One message per field, phrased as the rule (D.5). Empty object = the row can be saved. */
/** A number typed into a cell: a comma is a thousands separator, and an empty cell is NaN so validation flags it instead of saving 0. */
export function parseNumberCell(raw: string): number {
  return raw.trim() === '' ? Number.NaN : Number(raw.replace(/,/g, ''));
}

export function validateTrade(t: NormalizedTrade): RowErrors {
  const e: RowErrors = {};
  if (!t.symbol.trim()) e.symbol = 'Enter a symbol.';
  if (!(t.quantity > 0)) e.quantity = 'Enter a quantity greater than 0.';
  if (!(t.entryPrice > 0)) e.entryPrice = 'Enter an entry price greater than 0.';
  if (!(t.exitPrice > 0)) e.exitPrice = 'Enter an exit price greater than 0.';
  if (!validDate(t.openDate)) e.openDate = 'Add an open date and time.';
  if (!validDate(t.closeDate)) e.closeDate = 'Add a close date and time.';
  else if (validDate(t.openDate) && new Date(t.closeDate) < new Date(t.openDate)) e.closeDate = 'Closed must be after Opened.';
  if (!Number.isFinite(t.pnl)) e.pnl = 'Enter a number for Net P&L.';
  if (!Number.isFinite(t.fees) || t.fees < 0) e.fees = 'Enter fees of 0 or more.';
  return e;
}

export function rowStatus(row: ReviewRow, errors: RowErrors = validateTrade(row.trade)): RowStatus {
  if (row.saved) return 'saved';
  if (!row.included) return row.trade.duplicate ? 'duplicate' : 'excluded';
  return Object.keys(errors).length > 0 ? 'fix' : 'ready';
}

export interface RowSummary {
  all: number;
  ready: number;
  fix: number;
  duplicate: number;
  excluded: number;
  saved: number;
  /** net of the rows that will be saved */
  net: number;
}

export function summarise(rows: ReviewRow[]): RowSummary {
  const s: RowSummary = { all: rows.length, ready: 0, fix: 0, duplicate: 0, excluded: 0, saved: 0, net: 0 };
  for (const r of rows) {
    const status = rowStatus(r);
    s[status] += 1;
    if (status === 'ready' || status === 'saved') s.net += r.trade.pnl;
  }
  return s;
}

const sideSign = (side: 'BUY' | 'SELL') => (side === 'BUY' ? 1 : -1);

/** (exit − entry) × quantity × multiplier, signed by direction. */
export function grossFrom(t: Pick<NormalizedTrade, 'side' | 'entryPrice' | 'exitPrice' | 'quantity' | 'contractMultiplier'>): number {
  return sideSign(t.side) * (t.exitPrice - t.entryPrice) * t.quantity * (t.contractMultiplier ?? 1);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.02, Math.abs(a) * 0.001);

const outcomeOf = (pnl: number): NormalizedTrade['outcome'] => (pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN');

/**
 * Applies one cell edit. P&L follows price, quantity, side and fee edits only when the row's P&L matched this
 * formula before the edit; otherwise (broker-reported P&L with lot sizes or charges we cannot see) it is left alone
 * and stays editable.
 */
export function applyEdit(t: NormalizedTrade, field: EditableField, value: string | number | 'BUY' | 'SELL'): NormalizedTrade {
  const next: NormalizedTrade = { ...t, [field]: value } as NormalizedTrade;
  if (field === 'pnl') {
    next.grossPnl = round2((next.pnl as number) + next.fees);
    next.outcome = outcomeOf(next.pnl);
    return next;
  }
  if (field === 'symbol' || field === 'openDate' || field === 'closeDate') return next;
  // A cleared cell is a validation error on that cell; it must not wipe the P&L through the formula.
  if (typeof value === 'number' && Number.isNaN(value)) return next;
  const before = grossFrom(t) - t.fees;
  const unset = !Number.isFinite(t.pnl);
  const ready = next.quantity > 0 && next.entryPrice > 0 && next.exitPrice > 0;
  if (close(before, t.pnl) || (unset && ready)) {
    next.grossPnl = round2(grossFrom(next));
    next.pnl = round2(next.grossPnl - next.fees);
    next.outcome = outcomeOf(next.pnl);
  } else if (field === 'fees') {
    next.pnl = round2(next.grossPnl - next.fees);
    next.outcome = outcomeOf(next.pnl);
  }
  return next;
}

export function moveRows(rows: ReviewRow[], keys: ReadonlySet<string>, accountId: string | undefined): ReviewRow[] {
  return rows.map((r) => (keys.has(r.key) && !r.saved ? { ...r, accountId } : r));
}

export function editRow(rows: ReviewRow[], key: string, field: EditableField, value: string | number): ReviewRow[] {
  return rows.map((r) => {
    if (r.key !== key) return r;
    const dates = r.dates && (field === 'openDate' || field === 'closeDate') ? { ...r.dates, [field === 'openDate' ? 'openMissing' : 'closeMissing']: false } : r.dates;
    return { ...r, trade: applyEdit(r.trade, field, value), ...(dates ? { dates } : {}) };
  });
}

/** The review's note for a screenshot row whose open or close time was not in the screenshot; null otherwise. */
export function missingTimeNote(row: ReviewRow): string | null {
  if (row.dates?.openMissing) return 'Open time not in the screenshot — set it or keep the close time.';
  if (row.dates?.closeMissing) return 'Close time not in the screenshot — set it or keep the open time.';
  return null;
}

/** Unsaved, included rows whose open (or close) time was not in the screenshot and still copies the other date. */
export function missingTimeCounts(rows: ReviewRow[]): { open: number; close: number } {
  const live = rows.filter((r) => r.included && !r.saved && r.dates);
  return { open: live.filter((r) => r.dates!.openMissing).length, close: live.filter((r) => r.dates!.closeMissing).length };
}

export function setIncluded(rows: ReviewRow[], keys: ReadonlySet<string>, included: boolean): ReviewRow[] {
  return rows.map((r) => (keys.has(r.key) && !r.saved ? { ...r, included } : r));
}

/** Short stable hash for derived external ids (merged rows, screenshot rows). */
export function shortHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Rows can merge when they share a symbol and a direction (partial fills of one position). */
export function canMerge(rows: ReviewRow[]): boolean {
  if (rows.length < 2) return false;
  const [first] = rows;
  return rows.every((r) => r.trade.symbol === first.trade.symbol && r.trade.side === first.trade.side);
}

/** Size-weighted average prices; quantities, fees and P&L add up; the span runs from the first open to the last close. */
export function mergeTrades(trades: NormalizedTrade[]): NormalizedTrade {
  const [first] = trades;
  const qty = trades.reduce((s, t) => s + t.quantity, 0);
  const weighted = (pick: (t: NormalizedTrade) => number) => (qty > 0 ? trades.reduce((s, t) => s + pick(t) * t.quantity, 0) / qty : 0);
  const fees = round2(trades.reduce((s, t) => s + t.fees, 0));
  const pnl = round2(trades.reduce((s, t) => s + t.pnl, 0));
  const opens = trades.map((t) => t.openDate).filter(validDate).sort();
  const closes = trades.map((t) => t.closeDate).filter(validDate).sort();
  const ids = trades.map((t) => t.externalId);
  return {
    ...first,
    quantity: qty,
    entryPrice: round4(weighted((t) => t.entryPrice)),
    exitPrice: round4(weighted((t) => t.exitPrice)),
    openDate: opens[0] ?? first.openDate,
    closeDate: closes[closes.length - 1] ?? first.closeDate,
    fees,
    pnl,
    grossPnl: round2(trades.reduce((s, t) => s + t.grossPnl, 0)),
    outcome: outcomeOf(pnl),
    stopLoss: first.stopLoss,
    takeProfit: first.takeProfit,
    externalId: `m-${shortHash(ids.join('|'))}`,
    duplicate: trades.every((t) => t.duplicate),
  };
}

export function mergeRows(rows: ReviewRow[], keys: ReadonlySet<string>): ReviewRow[] {
  const picked = rows.filter((r) => keys.has(r.key) && !r.saved);
  if (!canMerge(picked)) return rows;
  const trade = mergeTrades(picked.map((r) => r.trade));
  const merged: ReviewRow = {
    ...picked[0],
    key: `merged|${shortHash(picked.map((r) => r.key).join('|'))}`,
    trade,
    // Fills that were all already imported stay "Already imported" until the user re-includes the merged row.
    included: !trade.duplicate,
    mergedFrom: picked.flatMap((r) => r.mergedFrom ?? [r.trade.externalId]),
  };
  const at = rows.findIndex((r) => picked.includes(r));
  const out: ReviewRow[] = [];
  rows.forEach((r, i) => {
    if (i === at) out.push(merged);
    if (!picked.includes(r)) out.push(r);
  });
  return out;
}

export function filterRows(rows: ReviewRow[], filter: 'all' | RowStatus, query: string): ReviewRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => (filter === 'all' || rowStatus(r) === filter) && (!q || r.trade.symbol.toLowerCase().includes(q)));
}

/** First row that blocks the import, for the Needs a fix → Enter path. */
export function firstProblemKey(rows: ReviewRow[]): string | null {
  return rows.find((r) => rowStatus(r) === 'fix')?.key ?? null;
}

/** The parser's `The file has 7412 trades; only the first 5000 are returned.` warning, as numbers. */
export function parseTruncation(warning: string): { total: number; shown: number } | null {
  const m = /has ([\d,]+) trades; only the first ([\d,]+) are returned/.exec(warning);
  return m ? { total: Number(m[1].replace(/,/g, '')), shown: Number(m[2].replace(/,/g, '')) } : null;
}
