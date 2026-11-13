import {
  SAMPLE_DAYS,
  SAMPLE_MONTH,
  SAMPLE_RECENT,
  SAMPLE_RULE_BREAK_DAYS,
  SAMPLE_TRADES,
  SAMPLE_WINS,
  type SampleDay,
} from '@/components/public/tourFixture';
import { formatMoney, formatPercent } from '@/lib/format';

export { SAMPLE_DAYS, SAMPLE_MONTH, SAMPLE_RECENT, SAMPLE_RULE_BREAK_DAYS, SAMPLE_TRADES, SAMPLE_WINS };

/** The sample account's currency; every figure in the showcase visuals is in it. */
export const SAMPLE_CURRENCY = 'USD';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SampleStats {
  net: number;
  trades: number;
  days: number;
  wins: number;
  losses: number;
  /** Percent, 0–100. */
  winRate: number;
  bestDay: SampleDay;
  /** Net P&L of the trades that broke a rule (negative = what breaking rules cost). */
  brokenRules: number;
  brokenTrades: number;
  brokenDays: number;
}

/** Month figures, computed from the fixture; `extraBroken` adds trades marked as broken after the fact (hero demo). */
export function sampleStats(extraBroken: { pnl: number; day: number }[] = []): SampleStats {
  const trades = SAMPLE_DAYS.reduce((s, d) => s + d.trades, 0);
  const wins = SAMPLE_WINS.reduce((s, w) => s + w, 0);
  const brokenDays = SAMPLE_DAYS.filter((d) => SAMPLE_RULE_BREAK_DAYS.includes(d.day));
  const extraDays = extraBroken.map((t) => t.day).filter((day) => !SAMPLE_RULE_BREAK_DAYS.includes(day));
  return {
    net: round2(SAMPLE_DAYS.reduce((s, d) => s + d.pnl, 0)),
    trades,
    days: SAMPLE_DAYS.length,
    wins,
    losses: trades - wins,
    winRate: (wins / trades) * 100,
    bestDay: SAMPLE_DAYS.reduce((best, d) => (d.pnl > best.pnl ? d : best)),
    brokenRules: round2(brokenDays.reduce((s, d) => s + d.pnl, 0) + extraBroken.reduce((s, t) => s + t.pnl, 0)),
    brokenTrades: brokenDays.reduce((s, d) => s + d.trades, 0) + extraBroken.length,
    brokenDays: brokenDays.length + new Set(extraDays).size,
  };
}

/** Running net P&L after each trading day, with the running peak (drawdown = peak − value). */
export function equitySeries(): { day: number; pnl: number; value: number; peak: number }[] {
  let value = 0;
  let peak = 0;
  return SAMPLE_DAYS.map((d) => {
    value = round2(value + d.pnl);
    peak = Math.max(peak, value);
    return { day: d.day, pnl: d.pnl, value, peak };
  });
}

/** The app's calendar tint step against the month's largest day: under ⅓ → 1, under ⅔ → 2, else 3. */
export function dayTintStep(pnl: number, days: SampleDay[] = SAMPLE_DAYS): 1 | 2 | 3 {
  const max = Math.max(...days.map((d) => Math.abs(d.pnl)));
  const share = Math.abs(pnl) / max;
  return share < 1 / 3 ? 1 : share < 2 / 3 ? 2 : 3;
}

/** One calendar cell per slot of a Monday-first month grid; `null` = blank lead-in cell. */
export function monthCells(): ({ day: number; data?: SampleDay; broke: boolean } | null)[] {
  const cells: ({ day: number; data?: SampleDay; broke: boolean } | null)[] = Array.from({ length: SAMPLE_MONTH.firstWeekday }, () => null);
  for (let day = 1; day <= SAMPLE_MONTH.days; day++) {
    cells.push({ day, data: SAMPLE_DAYS.find((d) => d.day === day), broke: SAMPLE_RULE_BREAK_DAYS.includes(day) });
  }
  return cells;
}

/** Result money per DESIGN-ENTERPRISE D.3: sign always, U+2212 minus before the symbol. */
export const money = (value: number) => formatMoney(value, SAMPLE_CURRENCY, { sign: true });
export const percent = (value: number) => formatPercent(value, 1);
/** `9 Nov` — day and short month (D.3 Date). */
export const dayLabel = (day: number) => `${day} Nov`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function dashboardAlt(): string {
  const s = sampleStats();
  return `Sample data, not your account: the TradeQut dashboard for ${SAMPLE_MONTH.label} with net P&L ${money(s.net)} over ${s.trades} trades, a win rate of ${percent(s.winRate)}, an equity curve, a month calendar and the cost of broken rules, ${money(s.brokenRules)}.`;
}

/** The text alternative for every still of the sample dashboard (DESIGN-AUTH §4.3), computed from the fixture. */
export const DASHBOARD_ALT = dashboardAlt();

/**
 * NSE index options on Zerodha with the rates in force on 10 Nov 2026 — the 2026-04-01 row of the import's rate table
 * (JournalAWSSetup src/features/import/charges/india.ts): ₹20 per order, STT 0.15 % of sell value, exchange 0.03503 %,
 * SEBI 0.0001 %, stamp duty 0.003 % of buy value, GST 18 % on brokerage + exchange + SEBI.
 */
const NSE_OPTIONS_2026 = { perOrder: 20, sttSell: 0.0015, exchange: 0.0003503, sebi: 0.000001, stampBuy: 0.00003, gst: 0.18 };

export interface SampleIndiaTrade {
  symbol: string;
  quantity: number;
  buy: number;
  sell: number;
  gross: number;
  charges: { label: string; value: number }[];
  totalCharges: number;
  net: number;
}

function indiaOptionTrade(symbol: string, quantity: number, buy: number, sell: number): SampleIndiaTrade {
  const r = NSE_OPTIONS_2026;
  const buyValue = quantity * buy;
  const sellValue = quantity * sell;
  const brokerage = r.perOrder * 2;
  const exchange = (buyValue + sellValue) * r.exchange;
  const sebi = (buyValue + sellValue) * r.sebi;
  const raw = { brokerage, stt: sellValue * r.sttSell, exchange, sebi, stamp: buyValue * r.stampBuy, gst: (brokerage + exchange + sebi) * r.gst };
  const charges = [
    { label: 'Brokerage', value: round2(raw.brokerage) },
    { label: 'STT', value: round2(raw.stt) },
    { label: 'Exchange', value: round2(raw.exchange) },
    { label: 'SEBI fee', value: round2(raw.sebi) },
    { label: 'Stamp duty', value: round2(raw.stamp) },
    { label: 'GST', value: round2(raw.gst) },
  ];
  const totalCharges = round2(Object.values(raw).reduce((a, b) => a + b, 0));
  const gross = round2(sellValue - buyValue);
  return { symbol, quantity, buy, sell, gross, charges, totalCharges, net: round2(gross - totalCharges) };
}

/** Two sample F&O trades from a Zerodha tradebook, 10 Nov 2026. */
export const SAMPLE_INDIA_TRADES: SampleIndiaTrade[] = [
  indiaOptionTrade('NIFTY 25000 CE', 75, 120, 152),
  indiaOptionTrade('BANKNIFTY 56000 PE', 35, 210, 186.5),
];

export const inr = (value: number, sign = true) => formatMoney(value, 'INR', { sign });

/** Net P&L by session for the sample month (sums to the month: 29 trades, +$370.50). */
export const SAMPLE_SESSIONS = [
  { session: 'Asia', trades: 8, pnl: 120.6 },
  { session: 'London', trades: 9, pnl: -61.3 },
  { session: 'New York', trades: 12, pnl: 311.2 },
];

/** The two rules broken in the sample month, by rule (sums to the broken-rules cost: 6 trades, −$118.25). */
export const SAMPLE_BROKEN_RULES = [
  { rule: 'Trade with the 1-hour trend', trades: 4, pnl: -76.25 },
  { rule: 'Max 2 trades per session', trades: 2, pnl: -42 },
];
