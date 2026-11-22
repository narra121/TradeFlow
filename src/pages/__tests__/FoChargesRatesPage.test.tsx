import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { EQUITY_STT_ROWS, STT_ROWS } from '@/lib/charges/foRateHistory';
import { FoChargesRatesPage } from '../resources/FoChargesRatesPage';

const FORBIDDEN = [
  /\bbest\b/i,
  /#1\b/,
  /number one/i,
  /top[- ]rated/i,
  /guaranteed/i,
  /free forever/i,
  /auto-?sync/i,
  /mobile app/i,
  /\b\d[\d,]* (active )?(users|customers|traders use)\b/i,
  /Trade Qut|Tradequt|TradeQuest/,
  /you should (buy|sell|hold)/i,
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderPage = () => renderWithProviders(<FoChargesRatesPage />);
const resultPanel = () => screen.getByRole('heading', { level: 2, name: 'Result' }).parentElement!;
const setDate = (value: string) => fireEvent.change(screen.getByLabelText('Trade date'), { target: { value } });
const line = (label: string) => within(resultPanel()).getByText(label).closest('li')!;

async function typeInto(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

describe('F&O charges and STT rates page', () => {
  it('opens with the page title, the checked date and a date field that defaults to today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T06:00:00'));
    const { container } = renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'STT rates 2026: F&O, intraday and delivery, by date' })).toBeInTheDocument();
    expect(screen.getByLabelText('Trade date')).toHaveValue('2026-11-16');
    expect(container.textContent).toContain('Sources checked 21 Nov 2026.');
    expect(screen.getByText('Estimates only: your contract note is authoritative')).toBeInTheDocument();
  });

  it('answers first with STT on delivery, intraday, futures and options, each with its payer and whether 1 April 2026 changed it', () => {
    const { container } = renderPage();
    expect(container.textContent).toContain(
      'From 1 Apr 2026, STT is 0.1% on both the purchase and the sale of an equity share settled by delivery, 0.025% on the sale of an intraday trade, 0.05% of the traded value of a futures contract sold and 0.15% of the premium of an option sold',
    );
    const now = screen.getByRole('table', { name: 'STT in force from 1 Apr 2026, by transaction' });
    const row = (name: RegExp) => within(now).getByRole('row', { name });
    expect(row(/^Equity share bought, settled by delivery/)).toHaveTextContent('0.1%PurchaserNo');
    expect(row(/^Equity share sold, settled by delivery/)).toHaveTextContent('0.1%SellerNo');
    expect(row(/^Equity share sold intraday/)).toHaveTextContent('0.025%SellerNo');
    expect(row(/^Futures sold/)).toHaveTextContent('0.05%SellerYes, from 0.02%');
    expect(row(/^Option sold/)).toHaveTextContent('0.15%SellerYes, from 0.1%');
    expect(row(/^Option exercised/)).toHaveTextContent('0.15%PurchaserYes, from 0.125%');
    expect(container.textContent).toContain('does not take equity trades');
  });

  it('lists equity delivery and intraday STT by effective date with its circular and every circular that restates it', () => {
    renderPage();
    const equity = screen.getByRole('table', { name: /STT on equity shares: delivery and intraday/ });
    expect(within(equity).getAllByRole('row')).toHaveLength(EQUITY_STT_ROWS.length + 1);
    expect(within(equity).getByRole('row', { name: /^1 Jul 2012/ })).toHaveTextContent(/^1 Jul 20120\.1%0\.1%0\.025%/);
    for (const row of EQUITY_STT_ROWS) expect(within(equity).getByRole('link', { name: row.circular })).toHaveAttribute('href', row.source);
    const restated = screen.getByText(/Each later STT circular read lists the same three equity rates:/);
    for (const c of EQUITY_STT_ROWS[EQUITY_STT_ROWS.length - 1].restatedIn) {
      expect(within(restated).getByRole('link', { name: c.circular })).toHaveAttribute('href', c.source);
    }
    expect(
      screen.getByText(/neither did STT on equity delivery and intraday: NSE\/FATAX\/56235, NSE\/FATAX\/63809, NSE\/FATAX\/73524 list it as no change/),
    ).toBeInTheDocument();
  });

  it('works an intraday and delivery example by the NSE/CMTR/5588 method', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'How NSE works out STT on delivery and intraday' })).toHaveAttribute('id', 'equity-method');
    expect(screen.getByRole('link', { name: 'how NSE works out STT on delivery and intraday' })).toHaveAttribute('href', '#equity-method');
    const example = screen.getByRole('table', { name: /^Example: 100 shares bought at ₹500 and 60 sold at ₹510/ });
    const row = (name: RegExp) => within(example).getByRole('row', { name });
    expect(row(/^Average price/)).toHaveTextContent('(₹50,000.00 + ₹30,600.00) ÷ 160₹503.75');
    expect(row(/^Intraday quantity/)).toHaveTextContent('lower of 100 and 6060');
    expect(row(/^Delivery quantity/)).toHaveTextContent('100 − 6040');
    expect(row(/^STT on the intraday sale/)).toHaveTextContent('0.025% × ₹30,225.00₹7.56');
    expect(row(/^STT on the delivery purchase/)).toHaveTextContent('0.1% × ₹20,150.00₹20.15');
    expect(row(/^STT for the day/)).toHaveTextContent("₹27.71, rounded to the nearest rupee if this is the client's only trade that day₹28");
    expect(screen.getByRole('link', { name: 'NSE/CMTR/5588' })).toHaveAttribute('href', 'https://nsearchives.nseindia.com/content/circulars/cmtr5588.htm');
  });

  it('options sold on 15 Nov 2026: every component of the default premium, with the circular and the total', () => {
    renderPage();
    setDate('2026-11-15');
    const panel = within(resultPanel());
    expect(within(line('STT')).getByText('₹300.00')).toBeInTheDocument();
    expect(within(line('NSE transaction charge')).getByText('₹71.06')).toBeInTheDocument();
    expect(within(line('NSE IPFT contribution')).getByText('₹0.00')).toBeInTheDocument();
    expect(within(line('SEBI turnover fee')).getByText('₹0.20')).toBeInTheDocument();
    expect(within(line('Stamp duty')).getByText('₹0.00')).toBeInTheDocument();
    expect(within(line('GST')).getByText('₹12.83')).toBeInTheDocument();
    expect(panel.getByText('Total charges')).toBeInTheDocument();
    expect(panel.getByText('₹384.09')).toBeInTheDocument();
    expect(panel.getByText('0.1920% of the premium value')).toBeInTheDocument();
    expect(within(line('STT')).getByRole('link', { name: 'NSE/FATAX/73524' })).toHaveAttribute(
      'href',
      'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
    );
    expect(within(line('NSE transaction charge')).getByRole('link', { name: 'NSE/FA/73061' })).toBeInTheDocument();
  });

  it('prices a trade with the STT row of its own date: 0.0625% on 30 Sep 2024 and 0.10% on 1 Oct 2024', () => {
    renderPage();
    setDate('2024-09-30');
    expect(within(line('STT')).getByText('₹125.00')).toBeInTheDocument();
    setDate('2024-10-01');
    expect(within(line('STT')).getByText('₹200.00')).toBeInTheDocument();
  });

  it('futures bought: traded value label, stamp duty on the buyer, no STT, brokerage typed by the user', async () => {
    const user = userEvent.setup();
    renderPage();
    setDate('2026-11-15');
    await user.selectOptions(screen.getByLabelText('Leg'), 'futures-buy');
    await typeInto(user, 'Traded value (₹)', '10,00,000');
    await typeInto(user, 'Brokerage for this leg (₹, optional)', '20');
    expect(within(line('STT')).getByText('₹0.00')).toBeInTheDocument();
    expect(within(line('STT')).getByText(/no STT on buying/)).toBeInTheDocument();
    expect(within(line('Stamp duty')).getByText('₹20.00')).toBeInTheDocument();
    expect(within(line('GST')).getByText('₹7.07')).toBeInTheDocument();
    expect(within(line('Brokerage (as typed)')).getByText('₹20.00')).toBeInTheDocument();
    expect(within(resultPanel()).getByText('₹66.37')).toBeInTheDocument();
  });

  it('options sold during the volume-slab period: the exchange charge says not shown and the total is partial', () => {
    renderPage();
    setDate('2024-06-10');
    expect(within(line('NSE transaction charge')).getByText('not shown')).toBeInTheDocument();
    expect(within(line('NSE transaction charge')).getByText(/volume slab of the broker \(NSE\/FA\/61137\)/)).toBeInTheDocument();
    expect(within(line('GST')).getByText('not shown')).toBeInTheDocument();
    expect(within(resultPanel()).getByText('Total of the charges shown (partial)')).toBeInTheDocument();
    expect(within(resultPanel()).getByText('₹126.20')).toBeInTheDocument();
  });

  it('a date before any verified source says the source is not verified instead of inventing a rate', () => {
    renderPage();
    setDate('2020-06-30');
    expect(within(line('SEBI turnover fee')).getByText('₹0.10')).toBeInTheDocument();
    expect(within(line('NSE transaction charge')).getByText('not shown: source not verified for this date')).toBeInTheDocument();
  });

  it('options exercised: STT only on the typed intrinsic value, no brokerage field', async () => {
    const user = userEvent.setup();
    renderPage();
    setDate('2026-04-01');
    await user.selectOptions(screen.getByLabelText('Leg'), 'options-exercised');
    expect(screen.queryByLabelText(/Brokerage/)).not.toBeInTheDocument();
    await typeInto(user, 'Intrinsic value (₹)', '50000');
    expect(within(line('STT')).getByText('₹75.00')).toBeInTheDocument();
    expect(within(line('STT')).getByText(/payable by the purchaser/)).toBeInTheDocument();
    expect(within(resultPanel()).getByText('STT on exercise')).toBeInTheDocument();
    expect(within(resultPanel()).queryByText('NSE transaction charge')).not.toBeInTheDocument();
    expect(within(resultPanel()).getByText(/only STT is calculated here/)).toBeInTheDocument();
  });

  it('a zero or empty value gives zero charges and no percentage; an empty date asks for a date', async () => {
    const user = userEvent.setup();
    renderPage();
    setDate('2026-11-15');
    await typeInto(user, 'Premium value (₹)', '0');
    expect(within(resultPanel()).getByText('₹0.00', { selector: 'p.text-2xl' })).toBeInTheDocument();
    expect(within(resultPanel()).queryByText(/% of the/)).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Premium value (₹)'));
    expect(within(resultPanel()).getByText('₹0.00', { selector: 'p.text-2xl' })).toBeInTheDocument();
    setDate('');
    expect(within(resultPanel()).getByText('Enter a trade date to see the charges.')).toBeInTheDocument();
    expect(within(resultPanel()).queryByText('Total charges')).not.toBeInTheDocument();
  });

  it('warns when the date is after the day the sources were checked', () => {
    renderPage();
    setDate('2027-01-05');
    expect(within(resultPanel()).getByText(/after 21 Nov 2026, when the sources were last checked/)).toBeInTheDocument();
  });

  it('uses text inputs with the decimal keypad, never spinner number inputs', () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
    for (const input of Array.from(container.querySelectorAll('input[type="text"]'))) expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('lists every rate row with its circular, and the changes since 2023', () => {
    const { container } = renderPage();
    const stt = screen.getByRole('table', { name: /Securities transaction tax/ });
    expect(within(stt).getAllByRole('row')).toHaveLength(STT_ROWS.length + 1);
    for (const row of STT_ROWS) expect(within(stt).getByRole('link', { name: row.circular })).toHaveAttribute('href', row.source);

    const changes = screen.getByRole('table', { name: /Every change to a rate on this page from 1 January 2023 to 21 Nov 2026/ });
    expect(within(changes).getAllByRole('row')).toHaveLength(7 + 1);
    expect(within(changes).getByText('futures sale 0.05%, options sale 0.15%, options exercised 0.15%')).toBeInTheDocument();
    expect(container.textContent).toContain('0.03503%');
    expect(container.textContent).toContain('0.03553%');
    expect(container.textContent).toContain('0.0355299%');
  });

  it('does not claim TradeQut estimates use these exact rates, and says what it leaves out', () => {
    const { container } = renderPage();
    expect(container.textContent).toContain("It does not claim that TradeQut's estimates use exactly the rates listed here");
    expect(container.textContent).toContain('What this page does not cover');
    expect(container.textContent).toContain('source not verified');
  });

  it('has no wording from the never-write list', () => {
    const { container } = renderPage();
    for (const re of FORBIDDEN) expect(container.textContent ?? '', String(re)).not.toMatch(re);
  });

  it('shows the FAQ, emits the same questions and answers as FAQPage JSON-LD, and keeps title and description short', async () => {
    const { container } = renderPage();
    const faq = container.querySelector('#faq')!.closest('section')!;
    const questions = [...faq.querySelectorAll('h3')].map((h) => h.textContent ?? '');
    expect(questions.length).toBeGreaterThanOrEqual(6);
    for (const q of questions) expect(q.endsWith('?'), q).toBe(true);
    expect(questions).toContain('Which is right for NSE options, 0.03503% or 0.03553%?');
    expect(questions).toContain('What is the STT rate on delivery and intraday trades in 2026?');

    let graph: { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[]; url?: string }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    const entries = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!;
    expect(entries.map((e) => e.name)).toEqual(questions);
    expect(entries.map((e) => e.acceptedAnswer.text)).toEqual([...faq.querySelectorAll('h3 + p')].map((p) => p.textContent));
    expect(graph.find((n) => n['@type'] === 'WebApplication')!.url).toBe('https://tradequt.com/resources/fo-charges-rates');

    await waitFor(() => expect(document.title).not.toBe(''));
    expect(document.title.length).toBeLessThanOrEqual(60);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')!.length).toBeLessThanOrEqual(160);
  });

  it('links only to pages that exist and cites the circulars it reads', () => {
    const { container } = renderPage();
    const paths = new Set(getPublicRoutes().map((r) => r.path));
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
    for (const href of internal) expect(paths.has(href) || href === '/signup', `links to ${href}`).toBe(true);
    for (const href of ['/fo-trading-journal', '/blog/fo-trading-charges-india', '/resources/fo-turnover-calculator']) {
      expect(internal, href).toContain(href);
    }
    const external = [...container.querySelectorAll('article a[href^="http"]')].map((a) => a.getAttribute('href'));
    for (const url of [
      'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
      'https://nsearchives.nseindia.com/content/circulars/FA73061.pdf',
      'https://nsearchives.nseindia.com/content/circulars/FA64232.pdf',
      'https://dor.gov.in/files/inline-documents/Indian_Stamp_Act_1899.pdf',
      'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf',
    ]) {
      expect(external, url).toContain(url);
    }
  });
});
