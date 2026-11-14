import { describe, expect, it } from 'vitest';
import type { QueryResult } from '@/types/analysis';
import { reviewInsight } from '@/components/insights/__tests__/reviewFixtures';
import { chatTableText, chatTableView } from '../chatTable';
import { reportAsText } from '../insightFormat';
import { checkAgainText, historyText, isWeekPeriod, measureValue, rText } from '../reviewFormat';

describe('findings history wording (report §5.6)', () => {
  it('third week in a row, down from 7, new this week, and nothing outside a week', () => {
    expect(historyText({ weeksInRow: 3, lastWeekCount: 2, status: 'same' }, true)).toBe('Third week in a row · as many trades as last week (2)');
    expect(historyText({ weeksInRow: 1, lastWeekCount: 7, status: 'down' }, true)).toBe('Down from 7 trades last week');
    expect(historyText({ weeksInRow: 2, lastWeekCount: 1, status: 'up' }, true)).toBe('Second week in a row · up from 1 trade last week');
    expect(historyText({ weeksInRow: 1, lastWeekCount: null, status: 'new' }, true)).toBe('New this week');
    expect(historyText({ weeksInRow: 12, lastWeekCount: null, status: 'new' }, true)).toBe('12th week in a row');
    expect(historyText({ weeksInRow: 3, lastWeekCount: 2, status: 'same' }, false)).toBeNull();
  });
  it('a 7-day period is a week', () => {
    expect(isWeekPeriod('2026-11-03', '2026-11-09')).toBe(true);
    expect(isWeekPeriod('2026-10-01', '2026-10-31')).toBe(false);
  });
  it('check again after the trades the evidence rule still needs', () => {
    expect(checkAgainText(7)).toBe('Check again after 23 more trades');
    expect(checkAgainText(29)).toBe('Check again after 1 more trade');
    expect(checkAgainText(41)).toBe('No clear difference after 41 trades');
  });
  it('units: R with a true minus and zero as 0.00R, money in the review currency, rates as percent', () => {
    expect(rText(-1.3795)).toBe('−1.38R');
    expect(rText(0)).toBe('0.00R');
    expect(measureValue('riskPerTrade', 2500, 'INR')).toBe('₹2,500.00');
    expect(measureValue('winRate', 0.4167, 'INR')).toBe('41.7%');
    expect(measureValue('tradesPerDay', 4.25, 'INR')).toBe('4.3');
  });
  it('Copy summary of a weekly review lists the verdict, the one thing with its rule, and the patterns', () => {
    const text = reportAsText(reviewInsight(), 'Week of 03 Nov · Zerodha F&O');
    expect(text).toContain('Verdict: A losing period, partly self-inflicted.');
    expect(text).toContain('The one thing: Losses beyond the stop (11 trades, cost ₹26,382.89)');
    expect(text).toContain('Rule: If price reaches my stop, I exit.');
    expect(text).toContain('Pattern to watch: Fridays: 7 trades, all lost, −₹51,006.18');
    expect(text.trim().endsWith('Not investment advice.')).toBe(true);
  });
});

describe('chat tables from the done frame (leaf 2.2 shapes)', () => {
  const stats: QueryResult = {
    columns: ['setup', 'trades', 'wins', 'winRate', 'net', 'avgR', 'avgRLow', 'avgRHigh', 'verdict', 'label'],
    rows: [['Breakout', 3, 2, 0.6667, 120, 0.4, null, null, 'watch', 'too-few'], ['Reversal', 31, 20, 0.6452, -350, -0.2, -0.5, 0.1, 'leak', 'provisional']],
    label: 'too-few',
    tradeIds: ['b1', 'b2', 'r3'],
  };

  it('a stats table: labelled columns, units, the R range merged, evidence in words, wins and per-row labels left out', () => {
    const v = chatTableView(stats, 'USD');
    expect(v.headers.map((h) => h.label)).toEqual(['Setup', 'Trades', 'Win rate', 'Net P&L', 'Avg R', 'Avg R, 95% range', 'Evidence']);
    expect(v.rows[0].cells.map((c) => c.text)).toEqual(['Breakout', '3', '66.7%', '+$120.00', '+0.40R', '—', 'Too early to tell']);
    expect(v.rows[1].cells.map((c) => c.text)).toEqual(['Reversal', '31', '64.5%', '−$350.00', '−0.20R', '−0.50R to +0.10R', 'Leak']);
    expect(v.rows[1].cells[3].tone).toBe('loss');
    expect(v.sample).toBe('Too few trades: numbers will move a lot');
    expect(v.perTrade).toBe(false);
  });

  it('a what-if table has one unit per row; an unknown currency prints no symbol', () => {
    const v = chatTableView({ columns: ['measure', 'actual', 'replay'], rows: [['Net P&L', -480, 120], ['Average R', -0.3, 0.1], ['Trades', 20, 16]], label: 'early', note: 'The replay only removes trades that happened, so it predicts nothing.', tradeIds: ['x1'] }, null);
    expect(v.headers.map((h) => h.label)).toEqual(['Measure', 'Actual', 'With the rule']);
    expect(v.rows.map((r) => r.cells.map((c) => c.text))).toEqual([['Net P&L', '−480.00', '+120.00'], ['Average R', '−0.30R', '+0.10R'], ['Trades', '20', '16']]);
    expect(v.sample).toBe('Early: numbers will move a lot');
  });

  it('a compare table names its periods and its verdict row', () => {
    const v = chatTableView({ columns: ['measure', '2026-10-01 to 2026-10-31', '2026-11-01 to 2026-11-13'], rows: [['Win rate', 0.5, 0.25], ['Verdict (first against second)', 'watch', null]], label: 'established', tradeIds: [] }, 'INR');
    expect(v.headers.map((h) => h.label)).toEqual(['Measure', '01 Oct – 31 Oct 2026', '01 Nov – 13 Nov 2026']);
    expect(v.rows[1].cells.map((c) => c.text)).toEqual(['Verdict (first against second)', 'No clear difference', '—']);
    expect(v.sample).toBeNull();
  });

  it('a trades table links each row to its trade', () => {
    const v = chatTableView({ columns: ['date', 'symbol', 'direction', 'setup', 'net', 'r'], rows: [['2026-11-03', 'NIFTY', 'Long', 'Breakout', -994.42, -1.2]], label: 'too-few', tradeIds: ['t7'] }, 'INR');
    expect(v.perTrade).toBe(true);
    expect(v.rows[0].tradeId).toBe('t7');
    expect(v.rows[0].cells.map((c) => c.text)).toEqual(['03 Nov 2026', 'NIFTY', 'Long', 'Breakout', '−₹994.42', '−1.20R']);
    expect(chatTableText(v, 1)).toBe('Table 1\nDate | Symbol | Direction | Setup | Net P&L | R\n03 Nov 2026 | NIFTY | Long | Breakout | −₹994.42 | −1.20R\nToo few trades: numbers will move a lot');
  });
});
