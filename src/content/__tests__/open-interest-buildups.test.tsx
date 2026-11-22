import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BLOG_ARTICLES } from '../blog/articles';
import { Faq } from '../components/ArticleParts';
import { getPublicRoutes } from '../route-registry';

const SLUG = 'long-buildup-short-covering-long-unwinding';
const article = BLOG_ARTICLES.find((a) => a.slug === SLUG)!;
const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const TODAY = new Date().toISOString().slice(0, 10);

/** Price direction | open interest direction → term, as Zerodha Varsity (Futures Trading ch. 12) and Dhan's help page give it. */
const TERM_BY_MOVE: Record<string, string> = {
  'up|up': 'Long build-up',
  'down|up': 'Short build-up',
  'down|down': 'Long unwinding',
  'up|down': 'Short covering',
};

async function renderArticle() {
  const Content = (await article.content()).default;
  return render(
    <MemoryRouter>
      <Content />
    </MemoryRouter>,
  );
}

const cellText = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => (c.textContent ?? '').trim());
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1).map(cellText);
const num = (s: string) => Number(s.replace(/,/g, '').replace('−', '-'));

/** "+22.40 (+1.81%)" or "−43.50 (−30.63%)" → [amount, percent], signed. */
function parseChange(s: string): [number, number] {
  const m = s.match(/^([+−])([\d,.]+) \(([+−])([\d.]+)%\)$/);
  if (!m) throw new Error(`not a change cell: ${s}`);
  return [num(`${m[1] === '−' ? '−' : ''}${m[2]}`), num(`${m[3] === '−' ? '−' : ''}${m[4]}`)];
}

afterEach(cleanup);

describe('open-interest build-ups article', () => {
  it('has one four-way table that maps each price and open-interest combination to the right term', async () => {
    await renderArticle();
    const table = screen.getByRole('table', { name: 'Price and open interest over the same period, and the term for each combination' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Price', 'Open interest', 'Term', 'How it is commonly read']);
    const rows = bodyRows(table);
    expect(rows).toHaveLength(4);
    const mapping = Object.fromEntries(rows.map(([price, oi, term]) => [`${price.toLowerCase()}|${oi.toLowerCase()}`, term]));
    expect(mapping).toEqual(TERM_BY_MOVE);
    for (const [, , term, reading] of rows) {
      expect(reading, term).toMatch(term === 'Long build-up' || term === 'Short covering' ? /bullish/ : /bearish/);
      expect(reading, term).toMatch(/read as/);
    }
  });

  it('labels each option strike by its own premium and open interest, with call and put writing as short build-ups', async () => {
    await renderArticle();
    const table = screen.getByRole('table', { name: 'One strike’s premium and open interest, the label for that option and its option-chain name' });
    const rows = bodyRows(table);
    expect(rows).toHaveLength(8);
    const byName: Record<string, string> = {};
    for (const [at, labelAndName] of rows) {
      const m = at.match(/^(Call|Put) premium (up|down), (call|put) OI (up|down)$/);
      expect(m, at).not.toBeNull();
      const [label, name] = labelAndName.split(': ');
      expect(label, at).toBe(TERM_BY_MOVE[`${m![2]}|${m![4]}`]);
      expect(name.startsWith(m![3]), at).toBe(true);
      if (/unwinding/.test(name)) expect(m![4], name).toBe('down');
      byName[name] = `${at} → ${label}`;
    }
    expect(byName['call writing']).toBe('Call premium down, call OI up → Short build-up');
    expect(byName['put writing']).toBe('Put premium down, put OI up → Short build-up');
  });

  it('worked examples: the change rows add up and the stated term follows from the signs', async () => {
    const { container } = await renderArticle();
    const text = container.textContent ?? '';

    const fut = bodyRows(screen.getByRole('table', { name: 'Hypothetical stock futures contract, one expiry, close to close' }));
    const [f1, f2, fc] = fut;
    const [fPrice, fPricePct] = parseChange(fc[1]);
    const [fOi, fOiPct] = parseChange(fc[2]);
    expect(fPrice).toBeCloseTo(num(f2[1]) - num(f1[1]), 2);
    expect(fPricePct).toBeCloseTo(((num(f2[1]) - num(f1[1])) / num(f1[1])) * 100, 2);
    expect(fOi).toBe(num(f2[2]) - num(f1[2]));
    expect(fOiPct).toBeCloseTo(((num(f2[2]) - num(f1[2])) / num(f1[2])) * 100, 2);
    const futTerm = TERM_BY_MOVE[`${fPrice > 0 ? 'up' : 'down'}|${fOi > 0 ? 'up' : 'down'}`];
    expect(text).toContain(`Price up, open interest up: a ${futTerm.toLowerCase()}.`);

    const opt = bodyRows(screen.getByRole('table', { name: 'Hypothetical index call option, strike 24,500, close to close' }));
    const [o1, o2, oc] = opt;
    const [oPrem, oPremPct] = parseChange(oc[1]);
    const [oOi, oOiPct] = parseChange(oc[2]);
    expect(oPrem).toBeCloseTo(num(o2[1]) - num(o1[1]), 2);
    expect(oPremPct).toBeCloseTo(((num(o2[1]) - num(o1[1])) / num(o1[1])) * 100, 2);
    expect(oOi).toBe(num(o2[2]) - num(o1[2]));
    expect(oOiPct).toBeCloseTo(((num(o2[2]) - num(o1[2])) / num(o1[2])) * 100, 2);
    const optTerm = TERM_BY_MOVE[`${oPrem > 0 ? 'up' : 'down'}|${oOi > 0 ? 'up' : 'down'}`];
    expect(text).toContain(`Premium down, open interest up: a ${optTerm.toLowerCase()} in the 24,500 call`);
  });

  it('gives every searched term its own heading', async () => {
    await renderArticle();
    const headings = screen.getAllByRole('heading').map((h) => h.textContent ?? '');
    for (const term of ['Long build-up', 'Short build-up', 'Long unwinding', 'Short covering', 'Call writing', 'Call unwinding', 'Put writing', 'Put unwinding']) {
      expect(
        headings.some((h) => h.startsWith(term)),
        term,
      ).toBe(true);
    }
  });

  it('answers the searched questions in an FAQ that renders', () => {
    const faq = article.faq ?? [];
    expect(faq.length).toBeGreaterThanOrEqual(5);
    for (const q of ['Is long build-up bullish or bearish?', 'Is short covering bullish or bearish?', 'Is long unwinding bullish or bearish?', 'What does call unwinding mean in the option chain?']) {
      expect(faq.map((f) => f.question)).toContain(q);
    }
    render(<Faq items={faq} />);
    for (const f of faq) expect(screen.getByRole('heading', { name: f.question })).toBeInTheDocument();
  });

  it('describes what happened instead of giving signals', async () => {
    const { container } = await renderArticle();
    const text = [container.textContent ?? '', article.summary ?? '', ...(article.faq ?? []).map((f) => f.answer)].join(' ');
    for (const re of [/\b(buy|sell) when\b/i, /means the market will/i, /\b(will|is going to) (rise|fall|go up|go down)\b/i, /sure[- ]shot/i, /\bsignal to (buy|sell)\b/i]) {
      expect(text).not.toMatch(re);
    }
  });

  it('links to existing pages, cites the two mapping sources and links NSE only through circular archives', async () => {
    const { container } = await renderArticle();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    const internal = hrefs.filter((h) => h.startsWith('/'));
    for (const h of internal) expect(PATHS.has(h), h).toBe(true);
    for (const h of ['/blog/options-trading-journal-india', '/blog/fo-trading-charges-india', '/blog/mtm-vs-realised-pnl-futures-options', '/fo-trading-journal', '/glossary']) {
      expect(internal).toContain(h);
    }
    expect(hrefs.filter((h) => /nseindia\.com/.test(h) && !h.startsWith('https://nsearchives.nseindia.com/content/circulars/'))).toEqual([]);

    const sources = screen.getByRole('heading', { name: 'Sources' }).closest('section')!;
    for (const url of [
      'https://zerodha.com/varsity/chapter/open-interest/',
      'https://dhan.co/support/platforms/options-trader/what-do-long-buildup-short-buildup-long-unwinding-and-short-covering-mean/',
    ]) {
      expect(sources.querySelector(`a[href="${url}"]`), url).not.toBeNull();
    }
    for (const m of (sources.textContent ?? '').matchAll(/checked (\d{4}-\d{2}-\d{2})/g)) expect(m[1] <= TODAY, m[1]).toBe(true);
  });

  it('has a registry entry within the length and date limits', () => {
    expect(article.title.length).toBeLessThanOrEqual(60);
    expect(article.description.length).toBeLessThanOrEqual(200);
    expect(article.summary?.length ?? 0).toBeGreaterThan(80);
    expect(article.publishedAt <= TODAY).toBe(true);
    expect((article.updatedAt ?? article.publishedAt) <= TODAY).toBe(true);
  });
});
