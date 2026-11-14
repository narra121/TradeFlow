/** The one sample dataset behind the landing-page product tour. Every figure on the tour derives from it. */
export interface SampleDay {
  /** Day of November 2026. */
  day: number;
  pnl: number;
  trades: number;
}

/** 1 November 2026 is a Sunday; the grid starts on Monday like the app's calendar, so it sits in the last column. */
export const SAMPLE_MONTH = { label: 'November 2026', firstWeekday: 6 /* blank cells before the 1st, Monday-first */, days: 30 };

export const SAMPLE_DAYS: SampleDay[] = [
  { day: 2, pnl: 85.5, trades: 3 },
  { day: 3, pnl: -42, trades: 2 },
  { day: 4, pnl: 120.25, trades: 4 },
  { day: 5, pnl: 64, trades: 2 },
  { day: 6, pnl: -31.5, trades: 3 },
  { day: 9, pnl: 140, trades: 3 },
  { day: 10, pnl: -76.25, trades: 4 },
  { day: 11, pnl: 52.8, trades: 2 },
  { day: 12, pnl: 18.5, trades: 1 },
  { day: 13, pnl: -22, trades: 2 },
  { day: 16, pnl: 61.2, trades: 3 },
];

/** The days whose trades broke a rule (every trade that day). */
export const SAMPLE_RULE_BREAK_DAYS: number[] = [3, 10];

export interface SampleRecentTrade {
  day: number;
  /** 24-hour time in the user's zone. */
  time: string;
  symbol: string;
  direction: 'Long' | 'Short';
  pnl: number;
  r: number;
}

/** The latest six trades, newest first; each day's rows sum to that day's P&L in SAMPLE_DAYS. */
export const SAMPLE_RECENT: SampleRecentTrade[] = [
  { day: 16, time: '10:42', symbol: 'EURUSD', direction: 'Long', pnl: 68, r: 1.7 },
  { day: 16, time: '09:15', symbol: 'GBPUSD', direction: 'Short', pnl: -21.8, r: -0.5 },
  { day: 16, time: '08:30', symbol: 'XAUUSD', direction: 'Long', pnl: 15, r: 0.3 },
  { day: 13, time: '14:05', symbol: 'EURUSD', direction: 'Short', pnl: -14, r: -0.4 },
  { day: 13, time: '10:20', symbol: 'USDJPY', direction: 'Long', pnl: -8, r: -0.2 },
  { day: 12, time: '11:48', symbol: 'EURUSD', direction: 'Long', pnl: 18.5, r: 0.5 },
];

export interface SampleTrade {
  day: number;
  symbol: string;
  pnl: number;
  /** 24-hour close time in the user's zone. */
  closed: string;
  /** Minutes the trade was open. */
  mins: number;
  /** Realised R: the price move in the trade's favour ÷ the distance from entry to stop. Every sample trade has a stop. */
  r: number;
}

/**
 * Every trade of the month, oldest first: each day's rows sum to its SAMPLE_DAYS entry, and the last six are SAMPLE_RECENT
 * (same close time and R). No two trades of a day overlap.
 */
export const SAMPLE_TRADES: SampleTrade[] = [
  { day: 2, symbol: 'EURUSD', pnl: 62, closed: '09:45', mins: 95, r: 1.55 },
  { day: 2, symbol: 'GBPUSD', pnl: -18, closed: '11:00', mins: 40, r: -0.45 },
  { day: 2, symbol: 'XAUUSD', pnl: 41.5, closed: '14:40', mins: 70, r: 0.95 },
  { day: 3, symbol: 'USDJPY', pnl: -17.5, closed: '09:30', mins: 25, r: -0.5 },
  { day: 3, symbol: 'GBPUSD', pnl: -24.5, closed: '10:30', mins: 52, r: -0.7 },
  { day: 4, symbol: 'EURUSD', pnl: 54, closed: '10:10', mins: 110, r: 1.35 },
  { day: 4, symbol: 'XAUUSD', pnl: 72.25, closed: '13:10', mins: 150, r: 1.7 },
  { day: 4, symbol: 'GBPUSD', pnl: -25, closed: '14:20', mins: 35, r: -0.6 },
  { day: 4, symbol: 'USDJPY', pnl: 19, closed: '16:15', mins: 45, r: 0.5 },
  { day: 5, symbol: 'EURUSD', pnl: 38, closed: '10:20', mins: 80, r: 0.95 },
  { day: 5, symbol: 'AUDUSD', pnl: 26, closed: '12:15', mins: 60, r: 0.65 },
  { day: 6, symbol: 'XAUUSD', pnl: 22.5, closed: '09:35', mins: 50, r: 0.5 },
  { day: 6, symbol: 'GBPUSD', pnl: -30, closed: '10:35', mins: 30, r: -1.2 },
  { day: 6, symbol: 'EURUSD', pnl: -24, closed: '11:45', mins: 64, r: -0.6 },
  { day: 9, symbol: 'XAUUSD', pnl: 82, closed: '10:50', mins: 140, r: 2 },
  { day: 9, symbol: 'EURUSD', pnl: 36, closed: '12:35', mins: 75, r: 0.9 },
  { day: 9, symbol: 'USDJPY', pnl: 22, closed: '14:35', mins: 55, r: 0.55 },
  { day: 10, symbol: 'GBPUSD', pnl: -41, closed: '09:40', mins: 40, r: -1.3 },
  { day: 10, symbol: 'EURUSD', pnl: -33.75, closed: '10:30', mins: 42, r: -1.25 },
  { day: 10, symbol: 'USDJPY', pnl: 18, closed: '11:30', mins: 49, r: 0.45 },
  { day: 10, symbol: 'XAUUSD', pnl: -19.5, closed: '15:00', mins: 40, r: -0.5 },
  { day: 11, symbol: 'EURUSD', pnl: 31.8, closed: '10:35', mins: 85, r: 0.8 },
  { day: 11, symbol: 'AUDUSD', pnl: 21, closed: '12:20', mins: 50, r: 0.5 },
  { day: 12, symbol: 'EURUSD', pnl: 18.5, closed: '11:48', mins: 68, r: 0.5 },
  { day: 13, symbol: 'USDJPY', pnl: -8, closed: '10:20', mins: 35, r: -0.2 },
  { day: 13, symbol: 'EURUSD', pnl: -14, closed: '14:05', mins: 45, r: -0.4 },
  { day: 16, symbol: 'XAUUSD', pnl: 15, closed: '08:30', mins: 40, r: 0.3 },
  { day: 16, symbol: 'GBPUSD', pnl: -21.8, closed: '09:15', mins: 35, r: -0.5 },
  { day: 16, symbol: 'EURUSD', pnl: 68, closed: '10:42', mins: 62, r: 1.7 },
];

/** Winning trades per day, aligned with SAMPLE_DAYS and counted from SAMPLE_TRADES. Shared with the auth pane (DESIGN-SHARED S8a). */
export const SAMPLE_WINS: number[] = SAMPLE_DAYS.map((d) => SAMPLE_TRADES.filter((t) => t.day === d.day && t.pnl > 0).length);

export const SAMPLE_TRADE = {
  symbol: 'EURUSD',
  direction: 'Long',
  entry: '1.0850',
  stop: '1.0830',
  exit: '1.0884',
  rMultiple: '+1.7R',
  pnl: 68,
  setup: 'Breakout retest',
  mistakes: 'None',
  note: 'Waited for the retest of the London high instead of chasing the first break. Stop below the retest low.',
};

export const SAMPLE_SETUPS = [
  { setup: 'Breakout retest', trades: 14, winRate: 57, avgR: 0.4 },
  { setup: 'Range fade', trades: 9, winRate: 44, avgR: 0.1 },
  { setup: 'News spike', trades: 6, winRate: 33, avgR: -0.3 },
];

export function sampleNet(days: SampleDay[] = SAMPLE_DAYS): number {
  return Math.round(days.reduce((sum, d) => sum + d.pnl, 0) * 100) / 100;
}

/** Whole-dollar form for small calendar cells; the full amount stays in the cell's accessible name. */
export function formatSignedShort(value: number): string {
  return `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

export function formatSigned(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value < 0 ? '−' : '+'}$${abs}`;
}
