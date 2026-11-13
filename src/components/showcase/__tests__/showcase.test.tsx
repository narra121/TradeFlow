import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SAMPLE_DAYS, SAMPLE_RECENT, SAMPLE_TRADES, SAMPLE_WINS } from '@/components/public/tourFixture';
import { DashboardWindow } from '../DashboardWindow';
import { SampleDataChip } from '../SampleDataChip';
import { HEADLINE, HEADLINE_PARTS } from '../copy';
import { DASHBOARD_ALT, dayTintStep, equitySeries, money, sampleStats } from '../sampleJournal';

describe('sample journal figures (computed from the one fixture)', () => {
  it('matches the figures DESIGN-SHARED S8.2 publishes', () => {
    const s = sampleStats();
    expect(money(s.net)).toBe('+$370.50');
    expect(s.trades).toBe(29);
    expect(s.days).toBe(11);
    expect(s.winRate.toFixed(1)).toBe('58.6');
    expect(`${s.wins} W · ${s.losses} L`).toBe('17 W · 12 L');
    expect(money(s.bestDay.pnl)).toBe('+$140.00');
    expect(s.bestDay.day).toBe(9);
    expect(money(s.brokenRules)).toBe('−$118.25');
    expect([s.brokenTrades, s.brokenDays]).toEqual([6, 2]);
  });

  it('adds a trade marked as broken after the fact on a new day', () => {
    const s = sampleStats([{ pnl: -21.8, day: 16 }]);
    expect(money(s.brokenRules)).toBe('−$140.05');
    expect([s.brokenTrades, s.brokenDays]).toEqual([7, 3]);
  });

  it('keeps the fixture consistent: wins per day, recent trades summing to their day', () => {
    expect(SAMPLE_WINS).toHaveLength(SAMPLE_DAYS.length);
    SAMPLE_WINS.forEach((w, i) => expect(w).toBeLessThanOrEqual(SAMPLE_DAYS[i].trades));
    // FE-070: the wins are the winning trades of the list, so the win rate cannot drift from it.
    SAMPLE_WINS.forEach((w, i) => expect(w).toBe(SAMPLE_TRADES.filter((t) => t.day === SAMPLE_DAYS[i].day && t.pnl > 0).length));
    for (const day of new Set(SAMPLE_RECENT.map((t) => t.day))) {
      const rows = SAMPLE_RECENT.filter((t) => t.day === day);
      const fixture = SAMPLE_DAYS.find((d) => d.day === day)!;
      if (rows.length === fixture.trades) expect(Math.round(rows.reduce((a, t) => a + t.pnl, 0) * 100) / 100).toBe(fixture.pnl);
    }
  });

  it('lists every trade of the month: each day sums to its fixture day and the last six are the recent trades', () => {
    expect(SAMPLE_TRADES).toHaveLength(SAMPLE_DAYS.reduce((n, d) => n + d.trades, 0));
    for (const d of SAMPLE_DAYS) {
      const rows = SAMPLE_TRADES.filter((t) => t.day === d.day);
      expect(rows).toHaveLength(d.trades);
      expect(Math.round(rows.reduce((a, t) => a + t.pnl, 0) * 100) / 100).toBe(d.pnl);
    }
    const pick = (t: { day: number; symbol: string; pnl: number }) => [t.day, t.symbol, t.pnl];
    expect(SAMPLE_TRADES.slice(-SAMPLE_RECENT.length).map(pick)).toEqual([...SAMPLE_RECENT].reverse().map(pick));
  });

  it('ends the equity series at the month net and tints by thirds of the largest day', () => {
    expect(equitySeries().at(-1)!.value).toBe(370.5);
    expect(dayTintStep(140)).toBe(3);
    expect(dayTintStep(-42)).toBe(1);
    expect(dayTintStep(-76.25)).toBe(2);
  });
});

describe('shared showcase pieces', () => {
  it('splits the headline into two parts that rebuild it exactly', () => {
    expect(HEADLINE_PARTS.join(' ')).toBe(HEADLINE);
  });

  it('labels sample data', () => {
    const { getByText } = render(<SampleDataChip />);
    expect(getByText('Sample data')).toBeInTheDocument();
  });

  it('renders the still dashboard with computed figures, no headings and nothing focusable', () => {
    const { container, getByText } = render(<DashboardWindow />);
    expect(getByText('+$370.50', { selector: '.tq-stat__value' })).toBeInTheDocument();
    expect(getByText('58.6%')).toBeInTheDocument();
    expect(getByText('−$118.25')).toBeInTheDocument();
    expect(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(0);
    expect(container.querySelectorAll('a,button,input,select,textarea,[tabindex]')).toHaveLength(0);
    expect(DASHBOARD_ALT).toContain('+$370.50');
    expect(DASHBOARD_ALT).toContain('−$118.25');
  });
});

describe('derived sample sets', () => {
  it('computes the India charges with the 2026-04-01 rates and nets them', async () => {
    const { SAMPLE_INDIA_TRADES, inr } = await import('../sampleJournal');
    const [nifty, bank] = SAMPLE_INDIA_TRADES;
    expect(inr(nifty.gross)).toBe('+₹2,400.00');
    expect(nifty.charges.map((c) => c.value)).toEqual([40, 17.1, 7.15, 0.02, 0.27, 8.49]);
    expect(inr(nifty.totalCharges, false)).toBe('₹73.03');
    expect(inr(nifty.net)).toBe('+₹2,326.97');
    expect(inr(bank.net)).toBe('−₹885.46');
    for (const t of SAMPLE_INDIA_TRADES) expect(Math.round(t.charges.reduce((a, c) => a + c.value, 0) * 100) / 100).toBe(t.totalCharges);
  });

  it('splits the month by session and the rule cost by rule without changing the totals', async () => {
    const { SAMPLE_SESSIONS, SAMPLE_BROKEN_RULES } = await import('../sampleJournal');
    const s = sampleStats();
    expect(SAMPLE_SESSIONS.reduce((a, x) => a + x.trades, 0)).toBe(s.trades);
    expect(Math.round(SAMPLE_SESSIONS.reduce((a, x) => a + x.pnl, 0) * 100) / 100).toBe(s.net);
    expect(SAMPLE_BROKEN_RULES.reduce((a, x) => a + x.trades, 0)).toBe(s.brokenTrades);
    expect(Math.round(SAMPLE_BROKEN_RULES.reduce((a, x) => a + x.pnl, 0) * 100) / 100).toBe(s.brokenRules);
  });
});
