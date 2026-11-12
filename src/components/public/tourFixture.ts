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

/** Winning trades per day, aligned with SAMPLE_DAYS (18 of 29). Shared with the auth pane (DESIGN-SHARED S8a). */
export const SAMPLE_WINS: number[] = [2, 0, 3, 2, 1, 3, 1, 2, 1, 0, 3];

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
