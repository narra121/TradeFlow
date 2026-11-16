import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { ForexMarketHoursPage } from '../resources/ForexMarketHoursPage';
import { PropFirmDrawdownCalculatorPage } from '../resources/PropFirmDrawdownCalculatorPage';
import { MarginCalculatorPage } from '../resources/MarginCalculatorPage';
import { RiskOfRuinCalculatorPage } from '../resources/RiskOfRuinCalculatorPage';
import { CompoundingCalculatorPage } from '../resources/CompoundingCalculatorPage';
import { PipCalculatorPage } from '../resources/PipCalculatorPage';
import { PositionSizeCalculatorPage } from '../resources/PositionSizeCalculatorPage';

const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const PAGES = [ForexMarketHoursPage, PropFirmDrawdownCalculatorPage, MarginCalculatorPage, RiskOfRuinCalculatorPage, CompoundingCalculatorPage];
const ADVICE = [/guaranteed/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /\b(best|#1|number one|top[- ]rated)\b/i];

async function fill(label: RegExp | string, value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

describe('forex tool pages', () => {
  it('each has one h1, an FAQ, no advice wording, decimal text inputs and only links that exist', () => {
    for (const Page of PAGES) {
      const { container, unmount } = renderWithProviders(<Page />);
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelector('#faq')).not.toBeNull();
      const text = container.textContent ?? '';
      for (const re of ADVICE) expect(text, `${Page.name} ${re}`).not.toMatch(re);
      expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
      for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
      const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
      expect(internal.length).toBeGreaterThanOrEqual(5);
      for (const href of internal) expect(PATHS.has(href) || href === '/signup', `${Page.name} links to ${href}`).toBe(true);
      unmount();
    }
  });
});

describe('forex market hours', () => {
  it('shows the live clock, the session tables in UTC and the year\'s London-New York overlap periods', () => {
    const { container } = renderWithProviders(<ForexMarketHoursPage />);
    const text = container.textContent ?? '';
    expect(screen.getByRole('heading', { level: 1, name: 'Forex market hours and sessions clock' })).toBeInTheDocument();
    expect(text).toMatch(/The forex market is (open|closed for the weekend)/);
    expect(text).toContain('07:00 - 16:00'); // London in mid-July, UTC
    expect(text).toContain('08:00 - 17:00'); // London in mid-January, UTC
    expect(text).toContain('12:00 - 17:00'); // the five-hour overlap weeks
    expect(text).toMatch(/Clocks forward: UTC\+0 to UTC\+1/);
  });

  it('switches the day table to another time zone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForexMarketHoursPage />);
    await user.selectOptions(screen.getByLabelText('Your time zone'), 'Asia/Kolkata');
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-07-15' } });
    const table = screen.getByRole('table', { name: /Session times on Wednesday,? 15 July 2026, Kolkata time/ });
    expect(table.textContent).toContain('12:30'); // London opens 07:00 UTC = 12:30 IST
    const overlaps = screen.getByRole('table', { name: /Overlaps/ });
    expect(overlaps.textContent).toMatch(/London and New York17:3021:304 h/);
  });
});

describe('prop firm drawdown calculator', () => {
  it('defaults: $4,200.00 of room before the daily limit and 16.80 lots at a 25-pip EUR/USD stop', () => {
    renderWithProviders(<PropFirmDrawdownCalculatorPage />);
    expect(screen.getByText('$4,200.00')).toBeInTheDocument();
    expect(screen.getByText('$96,200.00')).toBeInTheDocument();
    expect(screen.getByText('$90,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('16.80').length).toBeGreaterThan(0);
  });

  it('trailing limit: the floor follows the highest balance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PropFirmDrawdownCalculatorPage />);
    await user.click(screen.getByLabelText('Trailing'));
    expect(screen.getByText('$91,800.00')).toBeInTheDocument();
    await fill('Equity now (balance plus open P&L)', '96000');
    expect(screen.getByText('Limit reached')).toBeInTheDocument();
  });
});

describe('margin calculator', () => {
  it('EUR/USD 1 lot at 1:30 needs $3,616.67; gold 1 lot at $4,200 needs $14,000.00', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MarginCalculatorPage />);
    expect(screen.getAllByText('$3,616.67').length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Pair'), 'XAU/USD (gold)');
    expect(screen.getByLabelText(/Price now/)).toHaveValue('4200');
    expect(screen.getAllByText('$14,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('100 oz')).toBeInTheDocument();
  });
});

describe('risk of ruin calculator', () => {
  it('defaults: 45% at 1:2, 1% risk, 10% ruin level = 3.41%, 10 losses in a row', () => {
    renderWithProviders(<RiskOfRuinCalculatorPage />);
    expect(screen.getByText('3.41%')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByText('+0.35R')).toBeInTheDocument();
  });

  it('no edge means certain ruin', async () => {
    renderWithProviders(<RiskOfRuinCalculatorPage />);
    await fill('Win rate (%)', '30');
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});

describe('compounding calculator', () => {
  it('defaults: $10,000 at 2% a month for 12 months is $12,682.42, +26.8% a year', () => {
    renderWithProviders(<CompoundingCalculatorPage />);
    expect(screen.getAllByText(/^12,682\.42$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('+26.8%').length).toBeGreaterThan(0);
    expect(screen.getByText('+5.95% a month')).toBeInTheDocument();
  });
});

describe('gold in the existing calculators', () => {
  it('pip value: one lot of XAU/USD is $10.00 a pip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PipCalculatorPage />);
    await user.selectOptions(screen.getByLabelText('Currency pair'), 'XAU/USD (gold)');
    expect(screen.getAllByText('$10.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: /1 lot = 100 oz/ })).toBeInTheDocument();
  });

  it('position size: $10,000, 1% risk, 50-pip stop on gold is 0.20 lots', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await user.selectOptions(screen.getByLabelText('Pair'), 'XAU/USD (gold)');
    expect(screen.getByText('0.20 lots')).toBeInTheDocument();
  });
});
