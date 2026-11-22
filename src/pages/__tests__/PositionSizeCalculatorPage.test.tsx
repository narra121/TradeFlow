import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { PositionSizeCalculatorPage } from '../resources/PositionSizeCalculatorPage';

const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const FORBIDDEN = [/\bbest\b/i, /#1\b/, /guarantee/i, /risk[- ]free/i, /free forever/i, /auto-?sync/i, /you will (make|earn|profit)/i, /\bwe recommend\b/i];

afterEach(cleanup);

const resultPanel = () => screen.getByRole('heading', { level: 2, name: 'Result' }).parentElement!;

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  return input;
}

describe('position size calculator page', () => {
  it('renders one h1 for both modes, the formula, the examples and no advice wording', () => {
    const { container } = renderWithProviders(<PositionSizeCalculatorPage />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Position size calculator for forex, stocks and F&O' })).toBeInTheDocument();
    for (const name of ['The formula', 'Worked examples: forex and gold', 'Worked examples: stocks and F&O', 'Lot size: read it from the contract', 'What this calculator does not do']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    const text = container.textContent ?? '';
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
    expect(text).toContain('rounded down to 178');
    expect(text).toContain('rounded down to 0.33');
    expect(text).toContain('No whole lot fits: one lot would risk 1.10% of the capital');
  });

  it('forex: $10,000 at 1% with a 50-pip EUR/USD stop is 0.20 lots, 20,000 EUR; a fixed $250 is 0.50 lots', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    const panel = within(resultPanel());
    expect(panel.getByText('0.20 lots')).toBeInTheDocument();
    expect(panel.getByText('20,000 EUR')).toBeInTheDocument();
    await user.click(screen.getAllByLabelText('Fixed amount')[0]);
    await typeInto(user, 'Risk per trade (USD)', '250');
    expect(panel.getByText('0.50 lots')).toBeInTheDocument();
    expect(panel.getByText('$250.00')).toBeInTheDocument();
  });

  it('forex: says so when even 0.01 lot is over the budget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await typeInto(user, 'Account balance (USD)', '500');
    await typeInto(user, 'Stop loss distance (pips)', '100');
    expect(within(resultPanel()).getByText(/Even 0\.01 lot loses \$10\.00 at this stop, more than the \$5\.00 budget/)).toBeInTheDocument();
  });

  it('stocks: the default ₹5,00,000, 1%, ₹1,240 to ₹1,212 is 178 shares with ₹4,984.00 at risk', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await user.click(screen.getByLabelText('Stocks and F&O'));
    const panel = within(resultPanel());
    expect(panel.getByText('178 shares')).toBeInTheDocument();
    expect(panel.getByText('₹4,984.00')).toBeInTheDocument();
    expect(panel.getByText('₹2,20,720.00')).toBeInTheDocument();
    expect(panel.getByText('44.1% of capital')).toBeInTheDocument();
  });

  it('stocks: a stop on the wrong side or at the entry marks the stop field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await user.click(screen.getByLabelText('Stocks and F&O'));
    const stop = await typeInto(user, 'Stop loss price', '1250');
    expect(stop).toHaveAccessibleDescription('For a long trade the stop must be below the entry.');
    await typeInto(user, 'Stop loss price', '1240');
    expect(stop).toHaveAccessibleDescription('The stop is at the entry price, so there is no distance to size from.');
  });

  it('futures: asks for the lot size, then rounds down to whole lots and flags one lot over the budget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await user.click(screen.getByLabelText('Stocks and F&O'));
    await user.click(screen.getByLabelText('Futures'));
    expect(screen.getByLabelText('Lot size (units in one lot)')).toHaveAccessibleDescription('Enter the lot size of your contract, above 0.');
    await typeInto(user, 'Capital (INR)', '1000000');
    await user.click(screen.getByLabelText('Short'));
    await typeInto(user, 'Entry price', '2480');
    await typeInto(user, 'Stop loss price', '2502');
    await typeInto(user, 'Lot size (units in one lot)', '500');
    const panel = within(resultPanel());
    expect(panel.getByText('0 lots')).toBeInTheDocument();
    expect(panel.getByText(/One lot loses ₹11,000\.00 at this stop, ₹1,000\.00 more than the ₹10,000\.00 budget, so no whole lot fits/)).toBeInTheDocument();
    await typeInto(user, 'Risk per trade (%)', '1.5');
    expect(panel.getByText('1 lot')).toBeInTheDocument();
    expect(panel.getByText('₹4,000.00')).toBeInTheDocument();
    expect(panel.getByText('₹12,40,000.00')).toBeInTheDocument();
  });

  it('options: ₹120 premium, ₹80 stop, lot 100 at 2% of ₹3,00,000 is 1 lot, ₹2,000 unused', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PositionSizeCalculatorPage />);
    await user.click(screen.getByLabelText('Stocks and F&O'));
    await user.click(screen.getByLabelText('Options'));
    await typeInto(user, 'Capital (INR)', '300000');
    await typeInto(user, 'Risk per trade (%)', '2');
    await typeInto(user, 'Premium at entry', '120');
    await typeInto(user, 'Stop on the premium', '80');
    await typeInto(user, 'Lot size (units in one lot)', '100');
    const panel = within(resultPanel());
    expect(panel.getByText('1 lot')).toBeInTheDocument();
    expect(panel.getAllByText('₹4,000.00').length).toBeGreaterThan(0);
    expect(panel.getByText('₹2,000.00')).toBeInTheDocument();
    expect(panel.getByText('Premium paid')).toBeInTheDocument();
    const stop = await typeInto(user, 'Stop on the premium', '0');
    expect(stop).toHaveAccessibleDescription('Enter a stop on the premium above 0. With no stop, the whole premium is at risk.');
  });

  it('shows the FAQ and emits the same questions and answers as FAQPage JSON-LD', async () => {
    const { container } = renderWithProviders(<PositionSizeCalculatorPage />);
    const faq = container.querySelector('#faq')!.closest('section')!;
    const questions = [...faq.querySelectorAll('h3')].map((h) => h.textContent ?? '');
    expect(questions.length).toBeGreaterThanOrEqual(4);
    for (const q of questions) expect(q.endsWith('?'), q).toBe(true);
    expect(questions).toContain('What if one lot risks more than my budget?');

    let graph: { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[]; url?: string }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    const entries = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!;
    expect(entries.map((e) => e.name)).toEqual(questions);
    expect(entries.map((e) => e.acceptedAnswer.text)).toEqual([...faq.querySelectorAll('h3 + p')].map((p) => p.textContent));
    expect(graph.find((n) => n['@type'] === 'WebApplication')!.url).toBe('https://tradequt.com/resources/position-size');

    await waitFor(() => expect(document.title).not.toBe(''));
    expect(document.title.length).toBeLessThanOrEqual(60);
    expect(document.title).not.toMatch(/forex traders/i);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')!.length).toBeLessThanOrEqual(160);
  });

  it('links only to pages that exist, including the related calculators and the method article, and cites its sources', () => {
    const { container } = renderWithProviders(<PositionSizeCalculatorPage />);
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
    for (const href of internal) expect(PATHS.has(href) || href === '/signup', href).toBe(true);
    for (const href of ['/resources/risk-reward', '/resources/pip-calculator', '/resources/margin-calculator', '/blog/position-sizing-fixed-risk']) {
      expect(internal, href).toContain(href);
    }
    const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!;
    expect(sources.querySelector('a[href^="https://www.sebi.gov.in/"]')).not.toBeNull();
    expect(sources.textContent).toContain('checked 2026-11-21');
    expect(container.querySelector('a[href*="nseindia.com"]')).toBeNull();
  });
});
