import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { simulateEquity, type EquityInput } from '@/lib/equityCurve';
import { formatPercent } from '@/lib/format';
import { EquityCurveSimulatorPage } from '../resources/EquityCurveSimulatorPage';

const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const ADVICE = [/guaranteed/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /\b(best|#1|number one|top[- ]rated)\b/i, /your strategy will/i];

async function fill(label: RegExp | string, value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  return input;
}

const figure = (label: string) => screen.getByText(label, { selector: 'dt, p' }).nextElementSibling!.textContent;
const median = () => figure('Median final balance');
// With % sizing and no cost the final balance depends only on the number of wins, so a new seed can keep the median; drawdowns depend on the order.
const orderDependent = () => `${figure('Runs reaching a 10% drawdown')} ${figure('Median max drawdown')}`;

afterEach(() => vi.restoreAllMocks());

describe('equity curve simulator page', () => {
  it('renders one h1, the chart, at least four FAQ items, no advice wording and only links that exist', () => {
    const { container } = renderWithProviders(<EquityCurveSimulatorPage />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Equity curve simulator' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Equity curves of 20 of 1,000 simulated runs over 100 trades/ })).toBeInTheDocument();
    expect(container.querySelectorAll('#faq ~ div h3').length).toBeGreaterThanOrEqual(4);
    const text = container.textContent ?? '';
    expect(text).toMatch(/Monte Carlo/);
    for (const re of ADVICE) expect(text, `${re}`).not.toMatch(re);
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
    for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
    for (const href of ['/resources/risk-of-ruin-calculator', '/resources/expectancy-calculator', '/blog/trading-expectancy-formula', '/blog/track-reduce-drawdown']) {
      expect(internal).toContain(href);
    }
    for (const href of internal) expect(PATHS.has(href) || href === '/signup', `links to ${href}`).toBe(true);
  });

  it('the fixed default seed gives a fixed summary', () => {
    renderWithProviders(<EquityCurveSimulatorPage />);
    expect(median()).toBe('14,026');
    expect(screen.getByText('+40.3% from 10,000 after 100 trades')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Half the runs end at or above 14,026 and 1 in 20 ends at or below 10,722; 1.3% finish below the start and 20.5% fall 10% or more from a peak on the way.',
      ),
    ).toBeInTheDocument();
    expect(figure('5th to 95th percentile')).toBe('10,722 to 17,810');
    expect(figure('Runs ending below the start')).toBe('1.3%');
    expect(figure('Runs reaching a 10% drawdown')).toBe('20.5%');
    expect(figure('Median max drawdown')).toBe('7.8%');
    expect(figure('Median longest losing streak')).toBe('7');
    expect(figure('Expectancy per trade')).toBe('+0.35R');
    expect(screen.getByText(/^Seed 20261121: 1,000 runs of 100 trades\./)).toBeInTheDocument();
  });

  it('changing an input or the sizing model changes the result', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EquityCurveSimulatorPage />);
    await fill('Win rate (%)', '55');
    expect(await screen.findByText('+0.65R')).toBeInTheDocument();
    expect(median()).not.toBe('14,026');
    await user.click(screen.getByText('A fixed amount'));
    expect(await screen.findByLabelText('Risk per trade (amount)')).toHaveValue('100');
    expect(screen.queryByLabelText('Risk per trade (% of balance)')).toBeNull();
  });

  it('re-runs with a new seed, shows it, and reproduces the first run when the old seed is typed back', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    renderWithProviders(<EquityCurveSimulatorPage />);
    const first = orderDependent();
    expect(first).toBe('20.5% 7.8%');
    await user.click(screen.getByRole('button', { name: 'Re-run with a new seed' }));
    expect(screen.getByLabelText('Seed')).toHaveValue('2147483648');
    expect(await screen.findByText(/^Seed 2147483648:/)).toBeInTheDocument();
    expect(orderDependent()).not.toBe(first);
    await fill('Seed', '20261121');
    expect(await screen.findByText(/^Seed 20261121:/)).toBeInTheDocument();
    expect(orderDependent()).toBe(first);
    expect(median()).toBe('14,026');
  });

  it('renders the same HTML every time without reading Math.random or the clock', () => {
    // scripts/prerender-routes.js saves a client render's DOM and main.tsx replaces it with a fresh render, so any difference would flash.
    vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random during render');
    });
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Date.now during render');
    });
    const first = renderWithProviders(<EquityCurveSimulatorPage />);
    const html = first.container.innerHTML;
    first.unmount();
    const second = renderWithProviders(<EquityCurveSimulatorPage />);
    expect(second.container.innerHTML).toBe(html);
  });

  it('labels the axis in K and writes huge balances as powers of ten, up to the range a double can hold', async () => {
    const { container } = renderWithProviders(<EquityCurveSimulatorPage />);
    expect([...container.querySelectorAll('figure span.num')].map((s) => s.textContent)).toEqual(['7.5K', '10K', '12.5K', '15K', '17.5K', '20K']);
    await fill('Trades per run (1 to 1,000)', '1000');
    await fill('Win rate (%)', '100');
    await fill('Risk per trade (% of balance)', '50');
    expect(await screen.findAllByText('1.1 × 10³⁰⁵')).not.toHaveLength(0);
    expect(median()).toBe('1.1 × 10³⁰⁵');
    await fill('Risk per trade (% of balance)', '99');
    expect(await screen.findAllByText(/Some runs grow past what the simulator can count/)).not.toHaveLength(0);
  });

  it('marks an out-of-range field and says what the bound is', async () => {
    renderWithProviders(<EquityCurveSimulatorPage />);
    const runs = await fill('Runs (1 to 2,000)', '5000');
    expect(runs).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('Runs must be a whole number from 1 to 2,000.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Median final balance')).toBeNull();
  });
});

describe('worked scenarios quote what the simulator computes', () => {
  const base: EquityInput = {
    startBalance: 10000,
    winRatePct: 45,
    avgWinR: 2,
    avgLossR: 1,
    sizing: 'percent',
    riskPct: 1,
    riskAmount: 100,
    costPerTrade: 0,
    trades: 200,
    runs: 1000,
    drawdownPct: 20,
    seed: 20261121,
  };
  const run = (i: Partial<EquityInput>) => {
    const r = simulateEquity({ ...base, ...i });
    if (r.status !== 'ok') throw new Error(r.error);
    return r;
  };
  const pct = (x: number) => formatPercent(x * 100, 1);
  const rupees = (x: number) => `₹${Math.round(x).toLocaleString('en-IN')}`;

  it('forex: the same edge at four risk sizes', () => {
    renderWithProviders(<EquityCurveSimulatorPage />);
    const [table] = screen.getAllByRole('table', { name: 'Simulated, hypothetical inputs' });
    const rows = within(table).getAllByRole('row').slice(1);
    [0.5, 1, 2, 5].forEach((risk, k) => {
      const r = run({ riskPct: risk });
      const cells = within(rows[k]).getAllByRole('cell').map((c) => c.textContent);
      expect(cells).toEqual([
        `${risk}%`,
        Math.round(r.final.p50).toLocaleString('en-US'),
        Math.round(r.final.p5).toLocaleString('en-US'),
        pct(r.maxDrawdown.p50),
        pct(r.maxDrawdown.p95),
        pct(r.drawdownHitShare),
      ]);
      expect([r.losingStreak.p50, r.losingStreak.p95]).toEqual([8, 12]);
    });
  });

  it('Indian options: a fixed amount with and without charges', () => {
    renderWithProviders(<EquityCurveSimulatorPage />);
    const table = screen.getAllByRole('table', { name: 'Simulated, hypothetical inputs' })[1];
    const rows = within(table).getAllByRole('row').slice(1);
    [0, 80].forEach((cost, k) => {
      const r = run({ startBalance: 200000, sizing: 'amount', riskAmount: 2000, winRatePct: 40, avgWinR: 1.8, costPerTrade: cost, drawdownPct: 10 });
      const cells = within(rows[k]).getAllByRole('cell').map((c) => c.textContent);
      expect(cells.slice(2)).toEqual([rupees(r.final.p50), rupees(r.final.p5), pct(r.belowStartShare), pct(r.drawdownHitShare)]);
    });
  });
});
