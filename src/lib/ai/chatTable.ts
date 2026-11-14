import { ACCOUNT_SAMPLE_TEXT, evidenceOf } from '@/lib/evidence';
import { formatDateShort, formatMoney } from '@/lib/format';
import type { QueryResult, Verdict } from '@/types/analysis';
import { pct, rText } from './reviewFormat';

/**
 * Column units of a chat table (JournalAWSSetup src/features/analysis/query.ts): `winRate` is a fraction; `net`, `actual`,
 * `replay` are money in the answer's currency; `avgR`, `avgRLow`, `avgRHigh`, `r` are R. A table whose first column is
 * `measure` (what-if, compare) has one unit per row instead, named by the row's first cell.
 */
const HEADER: Record<string, string> = {
  group: 'Group', measure: 'Measure', date: 'Date', symbol: 'Symbol', direction: 'Direction', setup: 'Setup', session: 'Session',
  assetClass: 'Asset class', weekday: 'Weekday', hour: 'Hour', marketCondition: 'Market condition', newsEvent: 'News', tag: 'Tag',
  plannedRR: 'Planned R:R', holding: 'Holding time', tradeNumber: 'Trade of the day', optionType: 'Option type', expiryDay: 'Expiry day',
  trades: 'Trades', winRate: 'Win rate', net: 'Net P&L', avgR: 'Avg R', range: 'Avg R, 95% range', verdict: 'Evidence', r: 'R',
  actual: 'Actual', replay: 'With the rule',
};
const MONEY = new Set(['net', 'actual', 'replay']);
const R = new Set(['avgR', 'r']);
const NUMERIC = new Set(['trades', 'winRate', 'net', 'avgR', 'range', 'r', 'actual', 'replay']);
const HIDDEN = new Set(['wins', 'label', 'avgRLow', 'avgRHigh']);
const PERIOD = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/;

export interface ChatCell {
  text: string;
  numeric: boolean;
  tone?: 'profit' | 'loss';
}
export interface ChatTableView {
  headers: { label: string; numeric: boolean }[];
  rows: { cells: ChatCell[]; tradeId?: string }[];
  /** null when the sample is established */
  sample: string | null;
  note?: string;
  tradeIds: string[];
  /** a `trades` table: row i is the trade tradeIds[i] */
  perTrade: boolean;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const toneOf = (v: unknown): ChatCell['tone'] => (isNum(v) && v > 0 ? 'profit' : isNum(v) && v < 0 ? 'loss' : undefined);
const isVerdict = (v: unknown): v is Verdict => v === 'edge' || v === 'leak' || v === 'watch';
/** compare's verdict row: the first period's R against the second's */
const COMPARE_VERDICT: Record<Verdict, string> = { edge: 'First period better', leak: 'First period worse', watch: 'No clear difference' };

function byMeasure(measure: string, v: string | number | null, currency: string | undefined): ChatCell {
  if (v === null) return { text: '—', numeric: true };
  if (typeof v === 'string') return { text: isVerdict(v) ? COMPARE_VERDICT[v] : v, numeric: false };
  if (/net p&l/i.test(measure)) return { text: formatMoney(v, currency, { sign: true }), numeric: true, tone: toneOf(v) };
  if (/average r/i.test(measure)) return { text: rText(v), numeric: true, tone: toneOf(v) };
  if (/win rate/i.test(measure)) return { text: pct(v, 1), numeric: true };
  if (/payoff/i.test(measure)) return { text: v.toFixed(2), numeric: true };
  return { text: v.toLocaleString('en-US'), numeric: true };
}

/** A tool result as the cells to draw: the model never types these figures. */
export function chatTableView(t: QueryResult, currency: string | null | undefined): ChatTableView {
  const cur = currency ?? undefined;
  const col = (name: string) => t.columns.indexOf(name);
  const shown = t.columns.map((c, i) => ({ c, i })).filter(({ c }) => !HIDDEN.has(c));
  const lo = col('avgRLow');
  const hi = col('avgRHigh');
  const hasRange = lo >= 0 && hi >= 0 && t.rows.some((r) => isNum(r[lo]) && isNum(r[hi]));
  const avgAt = shown.findIndex(({ c }) => c === 'avgR');
  if (hasRange && avgAt >= 0) shown.splice(avgAt + 1, 0, { c: 'range', i: -1 });
  const tradesAt = col('trades');
  const rowWise = t.columns[0] === 'measure';
  const perTrade = t.columns[0] === 'date' && t.columns.includes('symbol');

  const header = (c: string) => {
    const m = PERIOD.exec(c);
    return m ? `${formatDateShort(m[1])} – ${formatDateShort(m[2], true)}` : HEADER[c] ?? c;
  };

  const cell = (c: string, v: string | number | null, row: (string | number | null)[]): ChatCell => {
    if (rowWise && c !== 'measure') return byMeasure(String(row[0] ?? ''), v, cur);
    if (c === 'range') return { text: isNum(row[lo]) && isNum(row[hi]) ? `${rText(row[lo] as number)} to ${rText(row[hi] as number)}` : '—', numeric: true };
    if (v === null || v === '') return { text: '—', numeric: NUMERIC.has(c) };
    if (c === 'verdict' && isVerdict(v)) return { text: evidenceOf(v, tradesAt >= 0 && isNum(row[tradesAt]) ? row[tradesAt] : 0).text, numeric: false };
    if (c === 'date' && typeof v === 'string') return { text: formatDateShort(v, true), numeric: false };
    if (!isNum(v)) return { text: String(v), numeric: false };
    if (MONEY.has(c)) return { text: formatMoney(v, cur, { sign: true }), numeric: true, tone: toneOf(v) };
    if (R.has(c)) return { text: rText(v), numeric: true, tone: toneOf(v) };
    if (c === 'winRate') return { text: pct(v, 1), numeric: true };
    return { text: v.toLocaleString('en-US'), numeric: NUMERIC.has(c) };
  };

  return {
    headers: shown.map(({ c }) => ({ label: header(c), numeric: rowWise ? c !== 'measure' : NUMERIC.has(c) })),
    rows: t.rows.map((row, ri) => ({
      cells: shown.map(({ c, i }) => cell(c, i >= 0 ? row[i] ?? null : null, row)),
      ...(perTrade && t.tradeIds[ri] ? { tradeId: t.tradeIds[ri] } : {}),
    })),
    sample: t.label === 'established' ? null : ACCOUNT_SAMPLE_TEXT[t.label],
    note: t.note,
    tradeIds: t.tradeIds,
    perTrade,
  };
}

/** Plain-text form of a table, appended to a copied answer. */
export function chatTableText(v: ChatTableView, n: number): string {
  const lines = [`Table ${n}`, v.headers.map((h) => h.label).join(' | '), ...v.rows.map((r) => r.cells.map((c) => c.text).join(' | '))];
  if (v.sample) lines.push(v.sample);
  if (v.note) lines.push(v.note);
  return lines.join('\n');
}
