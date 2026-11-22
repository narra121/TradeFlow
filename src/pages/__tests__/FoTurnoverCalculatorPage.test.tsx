import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { FoTurnoverCalculatorPage } from '../resources/FoTurnoverCalculatorPage';

const FORBIDDEN = [
  /\bbest\b/i,
  /#1\b/,
  /number one/i,
  /top[- ]rated/i,
  /guaranteed/i,
  /free forever/i,
  /auto-?sync/i,
  /\b\d[\d,]* (active )?(users|customers|traders use)\b/i,
  /Trade Qut|Tradequt|TradeQuest/,
  /you (must|need to|have to) (get|have) (your )?(accounts )?audited/i,
  /you do not need an audit/i,
  /audit is (not )?(required|mandatory|applicable) for you/i,
  /Zerodha[^.]*\b(wrong|incorrect|mistake)/i,
];

afterEach(cleanup);

const renderPage = () => renderWithProviders(<FoTurnoverCalculatorPage />);

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

const resultPanel = () => screen.getByRole('heading', { level: 2, name: 'Result' }).parentElement!;
const group = (name: RegExp) => screen.getByRole('group', { name });
const reading = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('section')!;

describe('F&O turnover calculator page', () => {
  it('opens with the not-tax-advice notice, the method line and no figures calculated', () => {
    const { container } = renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'F&O turnover calculator for tax audit (ICAI method)' })).toBeInTheDocument();
    expect(screen.getByText('Explains a method; not tax advice')).toBeInTheDocument();
    expect(container.textContent).toContain('Method: ICAI Guidance Note on Tax Audit under section 44AB, 11th edition (Revised 2026), paras 3.1 and 5.11. Read 15 Nov 2026.');
    expect(within(resultPanel()).getByText('Enter your figures to see the turnover.')).toBeInTheDocument();
    expect(screen.queryByText('Total F&O turnover')).not.toBeInTheDocument();
  });

  it('uses text inputs with the decimal keypad, never spinner number inputs', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
    for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('does not net a profit against a loss', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of profits', '1,00,000');
    await typeInto(user, 'Futures: total of losses', '₹1,00,000');
    const panel = within(resultPanel());
    expect(panel.getAllByText('₹2,00,000.00').length).toBeGreaterThan(0);
    expect(panel.getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹2,00,000.00');
  });

  it('shows both premium readings, and an answer only marks one of them', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of profits', '10000');
    await typeInto(user, 'Options: total of profits', '40000');
    await typeInto(user, 'Options: total of losses', '20000');
    await typeInto(user, 'Premium received on options sold (₹)', '500000');

    const added = within(reading('Premium added to the differences'));
    const notAdded = within(reading('Premium not added separately'));
    expect(added.getByText('Total').nextElementSibling).toHaveTextContent('₹5,70,000.00');
    expect(added.getByText('Options turnover').nextElementSibling).toHaveTextContent('₹5,60,000.00');
    expect(notAdded.getByText('Total').nextElementSibling).toHaveTextContent('₹70,000.00');
    expect(notAdded.getByText('Options: premium received on sale').nextElementSibling).toHaveTextContent('not added separately');
    expect(screen.queryByText(/Your answer:/)).not.toBeInTheDocument();

    await user.click(within(group(/Is that premium already inside/)).getByLabelText('Yes'));
    expect(notAdded.getByText('Your answer: the premium is already in the figures above')).toBeInTheDocument();
    expect(added.queryByText(/Your answer:/)).not.toBeInTheDocument();
    expect(added.getByText('Total').nextElementSibling).toHaveTextContent('₹5,70,000.00');

    await user.click(within(group(/Is that premium already inside/)).getByLabelText('No'));
    expect(added.getByText('Your answer: the premium is not in the figures above')).toBeInTheDocument();
  });

  it('gives the total in crore only from one lakh, never "0.00 crore"', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Options: total of profits', '7500.50');
    expect(within(reading('Turnover')).queryByText(/crore/)).not.toBeInTheDocument();
    await typeInto(user, 'Options: total of profits', '30,00,000');
    expect(within(reading('Turnover')).getByText('0.30 crore')).toBeInTheDocument();
  });

  it('shows a single total when no premium is entered', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Options: total of profits', '5000');
    expect(screen.queryByRole('heading', { level: 3, name: 'Premium added to the differences' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Turnover' })).toBeInTheDocument();
  });

  it('shows zero for a typed zero and keeps the limit table', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of profits', '0');
    const panel = within(resultPanel());
    expect(panel.getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹0.00');
    expect(panel.getByRole('row', { name: /^₹1,00,00,000\.00/ })).toHaveTextContent('₹1,00,00,000.00 below the limit');
  });

  it('withholds the result for a negative or non-numeric figure and says what to fix', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of losses', '-5000');
    expect(screen.getByText('Type it as a positive number: a loss of ₹5,000 is 5000.')).toBeInTheDocument();
    expect(within(resultPanel()).getByText('Fix the figures marked in the inputs to see the turnover.')).toBeInTheDocument();
    expect(screen.queryByText('Total F&O turnover')).not.toBeInTheDocument();

    await typeInto(user, 'Futures: total of losses', 'abc');
    expect(screen.getByText('This is not a number.')).toBeInTheDocument();

    await typeInto(user, 'Futures: total of losses', '5000');
    expect(screen.queryByText('This is not a number.')).not.toBeInTheDocument();
    expect(within(resultPanel()).getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹5,000.00');
  });

  it('compares the total with both limits, and an answer on the cash conditions marks which one applies', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of profits', '6000000');
    await typeInto(user, 'Futures: total of losses', '5000000');
    const panel = within(resultPanel());
    const one = panel.getByRole('row', { name: /^₹1,00,00,000\.00/ });
    const ten = panel.getByRole('row', { name: /^₹10,00,00,000\.00/ });
    expect(one).toHaveTextContent('₹10,00,000.00 above the limit');
    expect(ten).toHaveTextContent('₹8,90,00,000.00 below the limit');
    expect(one).toHaveTextContent('Applies if they do not both hold');
    expect(ten).toHaveTextContent('Applies if both cash conditions hold');

    await user.click(within(group(/Cash receipts are 5% or less/)).getByLabelText('Yes'));
    expect(ten).toHaveTextContent('Applies, by your answer');
    expect(one).toHaveTextContent('Does not apply, by your answer');
    expect(panel.getByText(/If the total is above the limit that applies to you, section 44AB audit provisions are relevant\./)).toBeInTheDocument();
  });

  it('adds other business turnover to the total', async () => {
    const user = userEvent.setup();
    renderPage();
    await typeInto(user, 'Futures: total of profits', '1000');
    await typeInto(user, 'Other business turnover to add (₹, optional)', '2,50,000');
    const panel = within(resultPanel());
    expect(panel.getByText('Other business turnover').nextElementSibling).toHaveTextContent('₹2,50,000.00');
    expect(panel.getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹2,51,000.00');
  });

  it('reads a pasted list with blank lines, commas, the rupee sign, brackets and a header line', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText('Paste a list'));
    fireEvent.change(screen.getByLabelText('Futures: one realised profit or loss per line'), {
      target: { value: '₹1,25,000\n\n-₹40,000.25\n₹ 2,500\nRealised P&L\n(500)\n' },
    });
    expect(screen.getByText(/4 lines read: profits ₹1,27,500\.00, losses ₹40,500\.25\./)).toBeInTheDocument();
    expect(screen.getByText(/1 line is not a single number and was left out: "Realised P&L"/)).toBeInTheDocument();
    expect(within(resultPanel()).getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹1,68,000.25');

    fireEvent.change(screen.getByLabelText('Options: one realised profit or loss per line'), { target: { value: '1000\n-1000' } });
    expect(within(resultPanel()).getByText('Total F&O turnover').nextElementSibling).toHaveTextContent('₹1,70,000.25');
  });

  it('quotes only the ICAI sentences it needs, each with its paragraph number', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    for (const sentence of [
      'The total of favourable and unfavourable differences in case of squared off transactions shall be taken as turnover.',
      'Each transaction resulting into whether a positive or negative difference is an independent transaction.',
      'However, where the premium received is included for determining net profit for transactions, then such net profit should not be separately included.',
    ]) {
      expect(text).toContain(`"${sentence}"`);
    }
    expect(text).toMatch(/Para 5\.11\(b\)\(i\): "The total of favourable/);
    expect(text).toMatch(/Para 5\.11\(a\), written for speculative transactions, says: "Each transaction/);
    expect(text).toMatch(/Para 5\.11\(b\)\(ii\) says premium received on sale of options is also included/);
  });

  it('gives numbered steps to calculate F&O turnover by hand, with a per-trade example that the paste mode reproduces', async () => {
    const user = userEvent.setup();
    renderPage();
    const heading = screen.getByRole('heading', { level: 2, name: 'How to calculate F&O turnover' });
    const steps = heading.parentElement!.querySelector('ol')!;
    expect(within(steps).getAllByRole('listitem')).toHaveLength(5);
    expect(steps).toHaveTextContent(/Write every loss as a positive amount/);
    expect(steps).toHaveTextContent(/5\.11\(b\)\(ii\)/);

    const example = screen.getByRole('table', { name: /Step-by-step example/ });
    const row = (name: RegExp) => within(example).getByRole('row', { name });
    expect(row(/^1\. Futures trades/)).toHaveTextContent('+₹12,000, −₹8,000');
    expect(row(/^2 and 3\. Futures turnover/)).toHaveTextContent('₹12,000 + ₹8,000₹20,000.00');
    expect(row(/^2 and 3\. Options profits and losses/)).toHaveTextContent('₹4,500 + ₹2,500 + ₹1,000₹8,000.00');
    expect(row(/^4\. Total, premium added/)).toHaveTextContent('₹58,000.00');
    expect(row(/^4\. Total, premium not added separately/)).toHaveTextContent('₹28,000.00');
    expect(screen.getByText(/The five trades net to ₹5,000\.00, but the turnover is ₹28,000\.00 or ₹58,000\.00/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Paste a list'));
    fireEvent.change(screen.getByLabelText('Futures: one realised profit or loss per line'), { target: { value: '12000\n-8000' } });
    fireEvent.change(screen.getByLabelText('Options: one realised profit or loss per line'), { target: { value: '4500\n-2500\n-1000' } });
    await typeInto(user, 'Premium received on options sold (₹)', '30000');
    expect(within(reading('Premium added to the differences')).getByText('Total').nextElementSibling).toHaveTextContent('₹58,000.00');
    expect(within(reading('Premium not added separately')).getByText('Total').nextElementSibling).toHaveTextContent('₹28,000.00');
  });

  it('states that TradeQut\'s tax report computes turnover differently instead of claiming a match', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    expect(text).toContain('It is not the same computation as this page.');
    expect(text).toContain('with no choice for a premium that is already in the profit');
    expect(text).toContain('fixed ₹10 crore and does not ask about the cash conditions');
  });

  it('makes no ranking, advice or user-base claims and spells the brand TradeQut', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    for (const re of FORBIDDEN) expect(text, String(re)).not.toMatch(re);
    expect(text).toContain('TradeQut');
    expect(text).toMatch(/not tax advice/);
    expect(text).toMatch(/not a SEBI-registered investment adviser/);
    expect(text).toMatch(/chartered accountant/);
  });

  it('shows the FAQ it sends as FAQPage JSON-LD, with a title and description that fit a results page', async () => {
    const { container } = renderPage();
    const questions = [...container.querySelector('#faq')!.closest('section')!.querySelectorAll('h3')].map((h) => h.textContent ?? '');
    expect(questions.length).toBeGreaterThanOrEqual(8);
    for (const q of questions) expect(q.endsWith('?'), q).toBe(true);

    let graph: { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[]; description?: string; url?: string }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!;
    expect(faq.map((e) => e.name)).toEqual(questions);
    const visibleAnswers = [...container.querySelector('#faq')!.closest('section')!.querySelectorAll('h3 + p')].map((p) => p.textContent);
    expect(faq.map((e) => e.acceptedAnswer.text)).toEqual(visibleAnswers);
    expect(graph.find((n) => n['@type'] === 'WebApplication')!.url).toBe('https://tradequt.com/resources/fo-turnover-calculator');

    await waitFor(() => expect(document.title).not.toBe(''));
    expect(document.title.length).toBeLessThanOrEqual(60);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')!.length).toBeLessThanOrEqual(160);
  });

  it('links only to pages that exist and cites the ICAI publication page', () => {
    const { container } = renderPage();
    const paths = new Set(getPublicRoutes().map((r) => r.path));
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
    for (const href of internal) expect(paths.has(href) || href === '/signup', `links to ${href}`).toBe(true);
    for (const href of ['/fo-trading-journal', '/resources/fo-charges-rates', '/blog/zerodha-tradebook-pnl']) expect(internal, href).toContain(href);
    const external = [...container.querySelectorAll('article a[href^="http"]')].map((a) => a.getAttribute('href'));
    expect(external).toContain('https://publication.icai.org/publication/968');
  });
});
