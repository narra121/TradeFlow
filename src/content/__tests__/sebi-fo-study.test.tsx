import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { getPublicRoutes } from '../route-registry';
import { SEO_PAGE_LOADERS } from '../routes';
import { getSeoPage } from '../seo-pages';
import {
  SEBI_CHECKED,
  SEBI_DOCUMENTS,
  SEBI_FIGURES,
  SEBI_GROUPS,
  SEBI_METHOD,
  SEBI_YEARS,
  sebiDoc,
  sebiPdfPageUrl,
} from '../sebi-fo-study';

const PATH = '/sebi-fo-study';
const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const HEAD = ['Figure', 'Value', 'Period', 'SEBI document and date', 'Page / section'];

const FORBIDDEN = [
  /\bbest\b/i,
  /#1\b/,
  /number one/i,
  /top[- ]rated/i,
  /guaranteed/i,
  /risk[- ]free/i,
  /you will (make|earn|profit)/i,
  /we recommend (buying|selling)/i,
  /you should (buy|sell|trade)/i,
  /studies (show|have shown|find)|research (shows|has shown|finds)/i,
  /\b\d[\d,]* (active )?(users|customers|traders use)\b/i,
  /Trade Qut|Tradequt|TradeQuest/,
];

// Numbers SEBI prints in a caveat that no figures row carries: PR No. 22/2024 headline, FY23 as printed in the September 2024 text, the 20% drop in active traders.
const CAVEAT_NUMBERS = ['93%', '91.5%', '20%'];

async function renderPage() {
  const Page = (await SEO_PAGE_LOADERS[PATH]()).default;
  return renderWithProviders(<Page />);
}

afterEach(cleanup);

describe('SEBI F&O study page: data', () => {
  it('is registered under the India hub with a title that fits a results page', () => {
    const page = getSeoPage(PATH);
    expect(page.parent?.path).toBe('/trading-journal-india');
    expect(page.title.length).toBeLessThanOrEqual(60);
    expect(page.description.length).toBeLessThanOrEqual(160);
    expect(page.publishedAt <= page.updatedAt).toBe(true);
    expect(getPublicRoutes().find((r) => r.path === PATH)?.kind).toBe('seo');
  });

  it('points every figure at an existing page of a PDF on sebi.gov.in', () => {
    for (const d of SEBI_DOCUMENTS) {
      expect(d.pdfUrl, d.id).toMatch(/^https:\/\/www\.sebi\.gov\.in\/sebi_data\/attachdocs\/[a-z]{3}-\d{4}\/\d+\.pdf$/);
      expect(d.pageUrl, d.id).toMatch(/^https:\/\/www\.sebi\.gov\.in\/(reports-and-statistics|media-and-notifications)\//);
      expect(d.date <= SEBI_CHECKED, d.id).toBe(true);
    }
    const ids = SEBI_FIGURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of SEBI_FIGURES) {
      expect(SEBI_GROUPS.some((g) => g.id === f.group), f.id).toBe(true);
      expect(f.pdfPage, f.id).toBeGreaterThanOrEqual(1);
      expect(f.pdfPage, f.id).toBeLessThanOrEqual(sebiDoc(f.doc).pdfPages);
      expect(f.value.length, f.id).toBeGreaterThan(0);
    }
    for (const m of SEBI_METHOD) for (const p of m.pdfPages) expect(p <= sebiDoc(m.doc).pdfPages, `${m.doc} p. ${p}`).toBe(true);
  });

  it('keeps the year table in step with the figures that quote the same years', () => {
    const fy26 = SEBI_YEARS.find((y) => y.year === 'FY26')!;
    expect(fy26.lossMakersPct).toBe('87.7%');
    expect(SEBI_FIGURES.find((f) => f.id === 'loss-fy26')!.value).toBe(`₹${fy26.netLossCrore} crore`);
    const fy25 = SEBI_YEARS.find((y) => y.year === 'FY25')!;
    expect(SEBI_FIGURES.find((f) => f.id === 'loss-fy25-revised')!.value).toBe(`₹${fy25.netLossCrore} crore`);
  });
});

describe('SEBI F&O study page: rendering', () => {
  it('shows one h1, the figures tables with their columns and a link to the PDF page of every figure', async () => {
    const { container } = await renderPage();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    for (const g of SEBI_GROUPS) {
      const caption = [...container.querySelectorAll('caption')].find((c) => c.textContent === g.caption);
      expect(caption, g.caption).toBeDefined();
      const table = caption!.closest('table')!;
      expect([...table.querySelectorAll('th')].map((th) => th.textContent)).toEqual(HEAD);
      const figures = SEBI_FIGURES.filter((f) => f.group === g.id);
      expect(table.querySelectorAll('tbody tr')).toHaveLength(figures.length);
      figures.forEach((f, i) => {
        const row = table.querySelectorAll('tbody tr')[i] as HTMLElement;
        const cells = row.querySelectorAll('td');
        expect(cells[0].textContent, f.id).toBe(f.figure);
        expect(cells[1].textContent, f.id).toBe(f.value);
        expect(cells[2].textContent, f.id).toBe(f.period);
        expect(cells[3].textContent, f.id).toContain(sebiDoc(f.doc).label);
        const link = within(row).getByRole('link', { name: `PDF p. ${f.pdfPage}` });
        expect(link.getAttribute('href'), f.id).toBe(sebiPdfPageUrl(f.doc, f.pdfPage));
        expect(link.getAttribute('rel'), f.id).toContain('noopener');
      });
    }
  });

  it('shows the year-by-year table and the methodology of every study', async () => {
    const { container } = await renderPage();
    const year = [...container.querySelectorAll('caption')].find((c) => c.textContent?.startsWith('Individual traders in equity derivatives, sample of the top 15 brokers'));
    expect(year).toBeDefined();
    expect(year!.closest('table')!.querySelectorAll('tbody tr')).toHaveLength(SEBI_YEARS.length);
    const method = [...container.querySelectorAll('caption')].find((c) => c.textContent?.startsWith('Who is counted'))!.closest('table')!;
    expect(method.querySelectorAll('tbody tr')).toHaveLength(SEBI_METHOD.length);
    expect(container.querySelector('#studies')).not.toBeNull();
    expect(container.querySelector('#methodology')).not.toBeNull();
    expect(container.textContent).toMatch(/What the studies say/);
    expect(container.textContent).toMatch(/What the studies do not say/);
    expect(container.textContent).toMatch(/How a journal helps you see your own costs/);
  });

  it('lists every SEBI document in the sources with its PDF link and the date the page was checked', async () => {
    const { container } = await renderPage();
    const sources = container.querySelector('#sources')!.closest('section')!;
    expect(within(sources).getAllByRole('listitem')).toHaveLength(SEBI_DOCUMENTS.length);
    for (const d of SEBI_DOCUMENTS) {
      const link = sources.querySelector(`a[href="${d.pdfUrl}"]`);
      expect(link, d.id).not.toBeNull();
      expect(link!.textContent, d.id).toContain(d.title);
    }
    expect(sources.textContent).toContain(`checked ${SEBI_CHECKED}`);
    expect(container.textContent).toContain('Last checked against sebi.gov.in: 15 November 2026');
  });

  it('links to the F&O journal and the charges and options articles, and only to pages that exist', async () => {
    const { container } = await renderPage();
    const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
    for (const href of ['/fo-trading-journal', '/blog/fo-trading-charges-india', '/blog/options-trading-journal-india', '/trading-journal-india']) {
      expect(internal, href).toContain(href);
    }
    for (const href of internal) expect(PATHS.has(href) || href === '/signup', `links to ${href}`).toBe(true);
    for (const a of container.querySelectorAll('article a[href^="http"]')) expect(a.getAttribute('href')).toMatch(/^https:\/\/www\.sebi\.gov\.in\//);
  });

  it('has an FAQ that reaches the FAQPage JSON-LD, plus the breadcrumb trail', async () => {
    const { container } = await renderPage();
    const questions = [...container.querySelector('#faq')!.closest('section')!.querySelectorAll('h3')].map((h) => h.textContent ?? '');
    expect(questions.length).toBeGreaterThanOrEqual(5);
    for (const q of questions) expect(q.endsWith('?'), q).toBe(true);
    let graph: { '@type': string; mainEntity?: { name: string }[]; itemListElement?: { item: string }[] }[] = [];
    await waitFor(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      graph = JSON.parse(script!.textContent!)['@graph'];
    });
    expect(graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity!.map((e) => e.name)).toEqual(questions);
    expect(graph.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement!.map((i) => i.item)).toEqual([
      'https://tradequt.com',
      'https://tradequt.com/trading-journal-india',
      `https://tradequt.com${PATH}`,
    ]);
  });

  it('makes no ranking, advice or user-base claims and spells the brand TradeQut', async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? '';
    for (const re of FORBIDDEN) expect(text, String(re)).not.toMatch(re);
    expect(text).toContain('TradeQut');
    expect(text).toMatch(/not a SEBI-registered investment adviser/);
    expect(text).toMatch(/not affiliated with or endorsed by SEBI/);
  });

  it('prints only percentages and rupee amounts that appear in the figures data', async () => {
    const { container } = await renderPage();
    const known = [
      ...SEBI_FIGURES.flatMap((f) => [f.figure, f.value, f.period]),
      ...SEBI_YEARS.flatMap((y) => [y.lossMakersPct, `₹${y.netLossCrore}`]),
      ...SEBI_METHOD.flatMap((m) => [m.years, m.who, m.basis, m.data]),
      ...CAVEAT_NUMBERS,
    ].join(' | ');
    const walker = document.createTreeWalker(container.querySelector('article')!, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode.textContent ?? '');
    const numbers = texts.join(' | ').match(/₹[\d,]+(?:\.\d+)?|\d[\d,]*(?:\.\d+)?%/g) ?? [];
    expect(numbers.length).toBeGreaterThan(60);
    for (const n of new Set(numbers)) expect(known, `${n} is not in the figures data`).toContain(n);
  });
});
