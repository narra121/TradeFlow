import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import JournalPricingPage from '../seo/JournalPricingPage';
import { COMPETITORS } from '@/content/alternatives';
import { JOURNAL_PRICING, money } from '@/content/journal-pricing';
import { PRO_PRICES, TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getPublicRoutes } from '@/content/route-registry';

const BANNED = /\bbest\b|\bcheapest\b|#1\b|\bbetter than\b|\bleading\b|\btop[- ]rated\b|\bworst\b|\bsuperior\b|\bunbeatable\b|\bnumber one\b|\bthe only\b/i;
const MONEY = /[$₹]\d[\d,]*(?:\.\d+)?/g;
const tokens = (text: string) => new Set(text.match(MONEY) ?? []);

function listPrices(id: string): string[] {
  const p = JOURNAL_PRICING.find((x) => x.id === id)!;
  return p.plans.flatMap((pl) =>
    [pl.monthly || undefined, pl.yearlyTotal, pl.yearlyPerMonth].filter((n): n is number => n !== undefined).map((n) => money(p.currency, n)),
  );
}

describe('/trading-journal-pricing', () => {
  it('renders one h1 and one table with a row per product, TradeQut last', () => {
    renderWithProviders(<JournalPricingPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const table = screen.getByRole('table');
    expect(screen.getAllByRole('table')).toHaveLength(1);
    const rowNames = within(table)
      .getAllByRole('rowheader')
      .map((th) => th.firstChild?.textContent);
    expect(rowNames).toEqual([...JOURNAL_PRICING.map((p) => p.name), 'TradeQut']);
  });

  it('gives every vendor row an https source on its own domain and the date it was read', () => {
    renderWithProviders(<JournalPricingPage />);
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    for (const p of JOURNAL_PRICING) {
      const row = rows.find((r) => within(r).queryByRole('rowheader')?.firstChild?.textContent === p.name)!;
      const links = within(row).getAllByRole('link');
      expect(links.length, p.name).toBeGreaterThan(0);
      for (const a of links) {
        const url = new URL(a.getAttribute('href')!);
        expect(url.protocol, p.name).toBe('https:');
        expect(url.hostname === p.domain || url.hostname.endsWith(`.${p.domain}`), `${p.name} ${url.href}`).toBe(true);
      }
      expect(p.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.checked <= new Date().toISOString().slice(0, 10)).toBe(true);
      expect(row.textContent).toMatch(/Prices read on \d{1,2} [A-Z][a-z]{2} 20\d\d; check the vendor's page\./);
      for (const s of [...p.extraSources, ...p.promotions.map((x) => ({ url: x.url }))]) {
        expect(new URL(s.url).hostname.endsWith(p.domain), s.url).toBe(true);
      }
    }
  });

  it("shows TradeQut's row from product-facts.ts", () => {
    renderWithProviders(<JournalPricingPage />);
    const row = within(screen.getByRole('table'))
      .getAllByRole('row')
      .find((r) => within(r).queryByRole('rowheader')?.firstChild?.textContent === 'TradeQut')!;
    expect(PRO_PRICES).toHaveLength(4);
    for (const [c, i] of [['USD', 'month'], ['USD', 'year'], ['INR', 'month'], ['INR', 'year']] as const) {
      expect(row.textContent).toContain(proPrice(c, i).display);
    }
    expect(row.textContent).toContain(`${TRIAL_DAYS}-day free trial`);
  });

  it('keeps promotional prices out of the table', () => {
    renderWithProviders(<JournalPricingPage />);
    const table = tokens(screen.getByRole('table').textContent ?? '');
    for (const p of JOURNAL_PRICING) {
      const list = new Set(listPrices(p.id));
      for (const promo of p.promotions) for (const t of tokens(promo.text)) if (!list.has(t)) expect(table.has(t), `${p.name} ${t}`).toBe(false);
    }
  });

  it('answers first with the range of monthly list prices, and uses no ranking words', () => {
    const { container } = renderWithProviders(<JournalPricingPage />);
    const usd = JOURNAL_PRICING.filter((p) => p.currency === 'USD').flatMap((p) => p.plans.map((pl) => pl.monthly ?? 0).filter((m) => m > 0));
    const answer = screen.getByRole('complementary', { name: 'Short answer' }).textContent ?? '';
    expect(answer).toContain(`from ${money('USD', Math.min(...usd))} a month`);
    expect(answer).toContain(`to ${money('USD', Math.max(...usd))} a month`);
    expect(answer).toContain(proPrice('USD', 'month').display);
    expect(container.textContent).not.toMatch(BANNED);
  });

  it('has at least four FAQ items, the same in the page and in its JSON-LD', async () => {
    renderWithProviders(<JournalPricingPage />);
    const faq = document.getElementById('faq')!.closest('section')!;
    const questions = [...faq.querySelectorAll('h3')].map((h) => h.textContent);
    expect(questions.length).toBeGreaterThanOrEqual(4);
    let graph: { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    const entries = graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!;
    expect(entries.map((e) => e.name)).toEqual(questions);
    expect(entries.map((e) => e.acceptedAnswer.text)).toEqual([...faq.querySelectorAll('h3 + p')].map((p) => p.textContent));
  });

  it('links only to registered pages and to each /alternatives comparison', () => {
    const { container } = renderWithProviders(<JournalPricingPage />);
    const paths = new Set(getPublicRoutes().map((r) => r.path));
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => a.getAttribute('href')!);
    for (const href of internal) expect(paths.has(href) || href === '/signup', href).toBe(true);
    for (const c of COMPETITORS) expect(internal).toContain(`/alternatives/${c.id}`);
  });
});

describe('alternatives.ts and journal-pricing.ts agree on every price', () => {
  for (const c of COMPETITORS) {
    it(`${c.id}: each list price appears on its comparison page, and every price there is a known one`, () => {
      const prose = [c.table.price, c.table.free, ...c.facts, ...c.faq.map((f) => f.answer)].join(' ');
      for (const price of listPrices(c.id)) expect(tokens(prose).has(price), `${c.id} ${price}`).toBe(true);
      const p = JOURNAL_PRICING.find((x) => x.alternative === c.id)!;
      const known = new Set([...listPrices(c.id), ...p.promotions.flatMap((x) => [...tokens(x.text)]), ...PRO_PRICES.map((x) => x.display)]);
      for (const t of tokens(prose)) expect(known.has(t), `${c.id} states ${t}`).toBe(true);
    });
  }
});
