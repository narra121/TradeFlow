import { describe, expect, it } from 'vitest';
import { attentionLink, chartSeries, currentWeek, equitySeries, needsAttention, netByCurrency, previousPeriod, todaySummary, weekGoals } from '../dashboard';
import type { Trade, TradingAccount } from '@/types/trade';

const accounts = new Map(
  [
    { id: 'a', currency: 'USD' },
    { id: 'b', currency: 'INR' },
  ].map((a) => [a.id, a as TradingAccount]),
);

const t = (id: string, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol: 'X', pnl: 10, accountId: 'a', exitDate: '2026-11-11T10:00:00', entryDate: '2026-11-11T09:00:00', ...over }) as Trade;

describe('needsAttention', () => {
  it('counts the four tallies and drops empty ones', () => {
    const rows = needsAttention([
      t('1', { strategy: 'S', images: [{ id: 'i', timeframe: '1H', description: '' }], accountId: undefined }),
      t('2', { pnl: -5 }),
      t('3', { pnl: -5, keyLesson: 'x', strategy: 'S' }),
    ]);
    expect(Object.fromEntries(rows.map((r) => [r.key, r.count]))).toEqual({ 'no-account': 1, 'no-strategy': 1, 'no-screenshot': 2, 'no-lesson': 1 });
    expect(rows.find((r) => r.key === 'no-account')?.label).toBe('1 trade has no account');
  });

  it('is empty when the journal is complete', () => {
    expect(needsAttention([t('1', { strategy: 'S', images: [{ id: 'i', timeframe: '', description: '' }] })])).toEqual([]);
  });
});

describe('todaySummary / netByCurrency', () => {
  const now = new Date(2026, 10, 11, 18, 0);

  it("sums today's trades per currency", () => {
    const s = todaySummary([t('1', { pnl: 100 }), t('2', { pnl: -20 }), t('3', { pnl: 5000, accountId: 'b' }), t('4', { exitDate: '2026-11-10T10:00:00' })], accounts, now);
    expect(s.count).toBe(3);
    expect(s.byCurrency).toEqual([{ currency: 'USD', net: 80 }, { currency: 'INR', net: 5000 }]);
  });

  it('orders currencies by trade count and ignores trades with no account', () => {
    const rows = netByCurrency([t('1'), t('2'), t('3', { accountId: 'b', pnl: 7 }), t('4', { accountId: undefined })], accounts);
    expect(rows).toEqual([{ currency: 'USD', net: 20, trades: 2 }, { currency: 'INR', net: 7, trades: 1 }]);
  });
});

describe('equitySeries', () => {
  it('maps the daily series with labels', () => {
    expect(equitySeries([{ date: '2026-11-04', pnl: 5, cumulativePnl: 12 }], (d) => `L${d}`)).toEqual([{ date: '2026-11-04', label: 'L2026-11-04', day: 5, cumulative: 12 }]);
    expect(equitySeries(undefined, (d) => d)).toEqual([]);
  });
});

describe('previousPeriod', () => {
  it('compares a month with the whole previous month, named by month', () => {
    expect(previousPeriod('thisMonth', '2026-11-01', '2026-11-11')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31', name: 'Oct', spokenName: 'October' });
  });

  it('shifts a week by seven days and a rolling range by its own length', () => {
    expect(previousPeriod('thisWeek', '2026-11-09', '2026-11-11')).toMatchObject({ startDate: '2026-11-02', endDate: '2026-11-04', name: 'last week' });
    expect(previousPeriod(30, '2026-10-12', '2026-11-11')).toMatchObject({ startDate: '2026-09-11', endDate: '2026-10-11', name: 'previous period' });
  });

  it('has nothing before All time', () => {
    expect(previousPeriod('all', '2000-01-01', '2026-11-11')).toBeNull();
  });
});

describe('chartSeries', () => {
  const day = (date: string, pnl: number, cumulative: number) => ({ date, label: date, day: pnl, cumulative });

  it('keeps daily rows up to 92 days and tracks the running peak from zero', () => {
    const { points, bucket } = chartSeries([day('2026-11-02', -10, -10), day('2026-11-03', 30, 20), day('2026-11-04', -5, 15)], (d) => d);
    expect(bucket).toBe('day');
    expect(points.map((p) => p.peak)).toEqual([0, 20, 20]);
  });

  it('sums into Monday weeks beyond 92 days', () => {
    const { points, bucket } = chartSeries([day('2026-01-01', 10, 10), day('2026-01-02', 5, 15), day('2026-05-01', 20, 35)], (d) => d);
    expect(bucket).toBe('week');
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ date: '2025-12-29', day: 15, cumulative: 15 });
  });
});

describe('weekGoals', () => {
  const progress = {
    profit: { current: 380, target: 500 },
    winRate: { current: 58, target: 65 },
    maxDrawdown: { current: 1.2, target: 3 },
    tradeCount: { current: 5, target: 8 },
  };

  it('returns nothing when the user set no goals', () => {
    expect(weekGoals(progress, [])).toEqual([]);
  });

  it('judges only the goals the user set', () => {
    const rows = weekGoals(progress, ['profit', 'maxTrades']);
    expect(rows.map((r) => [r.label, r.statusText])).toEqual([['Profit', 'On pace'], ['Trades', '3 left']]);
  });

  it('marks a limit that is exceeded', () => {
    expect(weekGoals({ ...progress, maxDrawdown: { current: 4, target: 3 } }, ['maxDrawdown'])[0]).toMatchObject({ over: true, statusText: 'Over' });
  });
});

describe('currentWeek / attentionLink', () => {
  it('uses Monday as the week start', () => {
    expect(currentWeek(new Date(2026, 10, 11))).toEqual({ start: '2026-11-09', end: '2026-11-15', periodKey: 'week#2026-11-09' });
    expect(currentWeek(new Date(2026, 10, 15)).start).toBe('2026-11-09');
  });

  it('links to Trades with the missing filter', () => {
    expect(attentionLink('no-strategy')).toBe('/app/tradelog?missing=strategy&src=dashboard');
  });
});
