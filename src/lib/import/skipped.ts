import Papa from 'papaparse';
import type { NormalizedTrade, ParseImportResponse } from '@/types/import';
import { grossFrom, makeRows, shortHash, type ReviewRow } from './rows';

/** Header aliases of the generic CSV layout: mirrors JournalAWSSetup src/features/import/parsers/generic.ts. */
const ALIASES = {
  symbol: ['symbol', 'instrument', 'ticker', 'scrip', 'script', 'stock', 'stock name', 'name', 'item', 'asset', 'pair', 'contract'],
  side: ['side', 'type', 'direction', 'buy sell', 'trade type', 'action', 'transaction type', 'b s'],
  quantity: ['quantity', 'qty', 'size', 'volume', 'lots', 'units', 'shares', 'traded qty'],
  entryPrice: ['entry price', 'entry', 'open price', 'buy price', 'avg buy price', 'buy avg'],
  exitPrice: ['exit price', 'exit', 'close price', 'sell price', 'avg sell price', 'sell avg'],
  openTime: ['open time', 'entry time', 'open date', 'entry date', 'opened', 'opened at'],
  closeTime: ['close time', 'exit time', 'close date', 'exit date', 'closed', 'closed at'],
  pnl: ['pnl', 'p l', 'profit', 'profit loss', 'realized p l', 'net p l', 'net pnl', 'gross p l'],
  fees: ['fees', 'charges', 'commission', 'brokerage', 'total charges'],
  stopLoss: ['stop loss', 'sl', 's l', 'stop'],
  takeProfit: ['take profit', 'tp', 't p', 'target'],
  tradeId: ['trade id', 'trade no', 'trade num', 'ticket', 'deal', 'id', 'execution id'],
} as const;

type Field = keyof typeof ALIASES;
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const REQUIRED_LABEL: Partial<Record<Field, string>> = {
  symbol: 'Symbol',
  side: 'Side',
  quantity: 'Quantity',
  entryPrice: 'Entry price',
  exitPrice: 'Exit price',
  openTime: 'Open time',
};

export interface SkippedLine {
  /** 1-based line of the file */
  line: number;
  raw: string;
  reason: string;
  /** the cells that could be read, as a row to fix; null when even the direction cannot be read */
  trade: NormalizedTrade | null;
}

const IST_MINUTES = 330;

/** `2026-11-02 09:15` is read in IST like the parser does for generic files; anything else falls back to the browser. */
function readDate(value: string): string {
  const v = value.trim();
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  if (m) {
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) - IST_MINUTES * 60_000;
    return new Date(ms).toISOString();
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

const readNumber = (v: string | undefined): number | null => {
  const n = Number((v ?? '').replace(/[,\s₹$]/g, ''));
  return (v ?? '').trim() === '' || !Number.isFinite(n) ? null : n;
};

function readSide(v: string | undefined): 'BUY' | 'SELL' | null {
  const s = (v ?? '').trim().toLowerCase();
  if (['buy', 'b', 'long', 'bought'].includes(s)) return 'BUY';
  if (['sell', 's', 'short', 'sold'].includes(s)) return 'SELL';
  return null;
}

/**
 * Lines of a closed-trade CSV that the parser dropped. The parse response only counts them, so this reads the file again:
 * rows whose symbol, quantity and direction have no parsed trade are the skipped ones. Returns [] when the file's rows
 * cannot be matched one to one with the parse (fills layouts, merged lines), never a guess.
 */
export function findSkippedLines(text: string, parsed: NormalizedTrade[], skipped: number): SkippedLine[] {
  if (skipped <= 0) return [];
  const rows = Papa.parse<string[]>(text, { skipEmptyLines: false }).data;
  let headerAt = -1;
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const hits = rows[i].map(norm).filter((h) => Object.values(ALIASES).some((a) => (a as readonly string[]).includes(h)));
    if (hits.length >= 3) {
      headerAt = i;
      break;
    }
  }
  if (headerAt < 0) return [];
  const headers = rows[headerAt].map(norm);
  const col = {} as Record<Field, number>;
  const used = new Set<number>();
  for (const f of Object.keys(ALIASES) as Field[]) {
    col[f] = -1;
    for (const a of ALIASES[f]) {
      const i = headers.findIndex((h, j) => h === a && !used.has(j));
      if (i >= 0) {
        col[f] = i;
        used.add(i);
        break;
      }
    }
  }
  if (col.symbol < 0 || col.side < 0 || col.quantity < 0) return [];

  const data = rows.map((cells, i) => ({ cells, line: i + 1 })).slice(headerAt + 1).filter((r) => r.cells.some((c) => c.trim() !== ''));
  if (data.length !== parsed.length + skipped) return [];

  const left = new Map<string, number>();
  for (const t of parsed) {
    const k = `${t.symbol.toUpperCase()}|${t.quantity}|${t.side}`;
    left.set(k, (left.get(k) ?? 0) + 1);
  }
  const unmatched: typeof data = [];
  for (const r of data) {
    const sym = (r.cells[col.symbol] ?? '').trim().toUpperCase();
    const qty = readNumber(r.cells[col.quantity]);
    const side = readSide(r.cells[col.side]);
    const k = `${sym}|${qty}|${side}`;
    if (sym && qty !== null && side && (left.get(k) ?? 0) > 0) left.set(k, (left.get(k) ?? 0) - 1);
    else unmatched.push(r);
  }
  if (unmatched.length !== skipped) return [];

  return unmatched.map(({ cells, line }) => {
    const get = (f: Field) => (col[f] >= 0 ? (cells[col[f]] ?? '').trim() : '');
    const symbol = get('symbol').toUpperCase();
    const side = readSide(get('side'));
    const quantity = readNumber(get('quantity'));
    const entry = readNumber(get('entryPrice'));
    const exit = readNumber(get('exitPrice'));
    const openDate = readDate(get('openTime'));
    const closeDate = readDate(get('closeTime')) || openDate;
    const missing: string[] = [];
    if (!symbol) missing.push(REQUIRED_LABEL.symbol!);
    if (!side) missing.push(REQUIRED_LABEL.side!);
    if (quantity === null || quantity <= 0) missing.push(REQUIRED_LABEL.quantity!);
    if (entry === null || entry <= 0) missing.push(REQUIRED_LABEL.entryPrice!);
    if (exit === null || exit <= 0) missing.push(REQUIRED_LABEL.exitPrice!);
    if (!openDate) missing.push(REQUIRED_LABEL.openTime!);
    const reason = missing.length > 0 ? `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing or not readable.` : 'The parser could not read this line.';
    const raw = cells.join(',');
    if (!side) return { line, raw, reason, trade: null };
    const fees = Math.abs(readNumber(get('fees')) ?? 0);
    const base = { side, quantity: quantity ?? 0, entryPrice: entry ?? 0, exitPrice: exit ?? 0, contractMultiplier: undefined };
    const given = readNumber(get('pnl'));
    const canCompute = (quantity ?? 0) > 0 && (entry ?? 0) > 0 && (exit ?? 0) > 0;
    const gross = canCompute ? grossFrom(base) : null;
    const pnl = given ?? (gross !== null ? Math.round((gross - fees) * 100) / 100 : Number.NaN);
    const sl = readNumber(get('stopLoss'));
    const tp = readNumber(get('takeProfit'));
    const id = get('tradeId');
    const trade: NormalizedTrade = {
      symbol,
      side,
      quantity: base.quantity,
      entryPrice: base.entryPrice,
      exitPrice: base.exitPrice,
      openDate,
      closeDate,
      outcome: pnl > 0 ? 'TP' : pnl < 0 ? 'SL' : 'BREAKEVEN',
      pnl,
      stopLoss: sl && sl > 0 ? sl : null,
      takeProfit: tp && tp > 0 ? tp : null,
      tags: [],
      assetClass: 'stock',
      fees,
      grossPnl: Number.isFinite(pnl) ? Math.round((pnl + fees) * 100) / 100 : 0,
      externalId: id ? `generic_csv:${id}` : `generic_csv:line:${line}:${shortHash(raw)}`,
      importSource: 'generic_csv',
    };
    return { line, raw, reason, trade };
  });
}

/** Skipped lines of a parsed generic CSV as review rows that need a fix, plus the lines that cannot be shown as rows. */
export function recoverSkipped(
  name: string,
  text: string,
  res: Pick<ParseImportResponse, 'detectedSource' | 'trades' | 'skipped'>,
  startAt: number,
): { rows: ReviewRow[]; unread: { line: number; raw: string; reason: string }[] } {
  if (res.detectedSource !== 'generic_csv' || !/\.(csv|txt)$/i.test(name)) return { rows: [], unread: [] };
  const lines = findSkippedLines(text, res.trades, res.skipped);
  const rows: ReviewRow[] = [];
  const unread: { line: number; raw: string; reason: string }[] = [];
  for (const l of lines) {
    if (!l.trade) {
      unread.push({ line: l.line, raw: l.raw, reason: l.reason });
      continue;
    }
    const [row] = makeRows([l.trade], name, { startAt: startAt + rows.length });
    rows.push({ ...row, key: `skipped|${l.line}|${row.key}`, note: `Line ${l.line}: the parser skipped this line. ${l.reason}` });
  }
  return { rows, unread };
}

export function base64ToText(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
