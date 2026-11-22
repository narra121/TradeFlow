import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, within } from '@/test/test-utils';
import { getPublicRoutes } from '@/content/route-registry';
import { CLOCK_PATH, SESSION_PAGES, SESSION_PATHS, SESSION_ZONES, cellText, makeCtx, zoneTable, type SessionPageId } from '@/content/forex-sessions';
import { NewYorkSessionPage } from '../resources/sessions/NewYorkSessionPage';
import { LondonSessionPage } from '../resources/sessions/LondonSessionPage';
import { AsianSessionPage } from '../resources/sessions/AsianSessionPage';
import { LondonNewYorkOverlapPage } from '../resources/sessions/LondonNewYorkOverlapPage';
import { sessionSchema } from '../resources/sessions/SessionPage';
import { ForexMarketHoursPage } from '../resources/ForexMarketHoursPage';

const PAGES: [SessionPageId, ComponentType][] = [
  ['newYork', NewYorkSessionPage],
  ['london', LondonSessionPage],
  ['asian', AsianSessionPage],
  ['overlap', LondonNewYorkOverlapPage],
];
const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const ADVICE = [/guaranteed/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /sure[- ]shot/i, /\b(best|#1|number one|top[- ]rated)\b/i];
const WINTER = '2026-01-14';
const SUMMER = '2026-07-15';
const US_ONLY = '2026-03-18';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const todayText = () => screen.getByTestId('session-today').textContent ?? '';

/** Headings, paragraphs and list items of the article, without tables and the visitor's own line. */
function prose(container: HTMLElement): string {
  const article = container.querySelector('article')!;
  return [...article.querySelectorAll('h1, h2, h3, p, li')]
    .filter((el) => !el.closest('table') && !el.closest('[data-testid="session-today"]') && !el.closest('nav'))
    .map((el) => el.textContent ?? '')
    .join(' ');
}

function shingles(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9:–]+/g, ' ').split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

const jaccard = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length / new Set([...a, ...b]).size;

describe('forex session pages', () => {
  it('each has one h1, a breadcrumb to the clock, four or more FAQ items, short metadata, no advice and only links that exist', () => {
    for (const [id, Page] of PAGES) {
      const p = SESSION_PAGES[id];
      const { container, unmount } = renderWithProviders(<Page />);
      expect(container.querySelectorAll('h1'), id).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(p.h1);
      const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
      expect(crumbs.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources');
      expect(crumbs.getByRole('link', { name: 'Forex market hours' })).toHaveAttribute('href', CLOCK_PATH);
      expect(crumbs.getByText(p.crumb)).toBeInTheDocument();
      expect(container.querySelectorAll('#faq ~ div h3, section[aria-labelledby="faq"] h3').length, id).toBeGreaterThanOrEqual(4);
      expect(p.title.length, id).toBeLessThanOrEqual(60);
      expect(p.description.length, id).toBeLessThanOrEqual(160);
      const text = container.textContent ?? '';
      for (const re of ADVICE) expect(text, `${id} ${re}`).not.toMatch(re);
      expect(text).toMatch(/Session hours are a convention/);
      const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
      for (const href of internal) expect(PATHS.has(href) || href === '/signup', `${id} links to ${href}`).toBe(true);
      for (const other of Object.values(SESSION_PATHS).filter((x) => x !== p.path)) expect(internal, `${id} links to ${other}`).toContain(other);
      expect(internal).toContain(CLOCK_PATH);
      unmount();
    }
  });

  it('publish a breadcrumb Home › Resources › Forex market hours › page and the FAQ they show', () => {
    for (const [id] of PAGES) {
      const p = SESSION_PAGES[id];
      const faq = p.faq(makeCtx(2026));
      const graph = sessionSchema(p, faq)['@graph'] as { '@type': string; itemListElement?: { name: string; item: string }[]; mainEntity?: unknown[] }[];
      const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement!;
      expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Resources', 'Forex market hours', p.crumb]);
      expect(crumbs[3].item).toBe(`https://tradequt.com${p.path}`);
      expect(graph.find((n) => n['@type'] === 'FAQPage')!.mainEntity).toHaveLength(faq.length);
    }
  });
});

describe('zone tables', () => {
  it('cells for fixed days in winter, summer and the US-only weeks', () => {
    expect([WINTER, SUMMER, US_ONLY].map((d) => cellText('newYork', 'Asia/Kolkata', d))).toEqual(['18:30–03:30 next day', '17:30–02:30 next day', '17:30–02:30 next day']);
    expect([WINTER, SUMMER, US_ONLY].map((d) => cellText('newYork', 'Europe/London', d))).toEqual(['13:00–22:00', '13:00–22:00', '12:00–21:00']);
    expect([WINTER, SUMMER].map((d) => cellText('newYork', 'America/Los_Angeles', d))).toEqual(['05:00–14:00', '05:00–14:00']);
    expect([WINTER, SUMMER, US_ONLY].map((d) => cellText('london', 'America/New_York', d))).toEqual(['03:00–12:00', '03:00–12:00', '04:00–13:00']);
    expect([WINTER, SUMMER].map((d) => cellText('london', 'Asia/Kolkata', d))).toEqual(['13:30–22:30', '12:30–21:30']);
    expect([WINTER, SUMMER].map((d) => cellText('tokyo', 'America/New_York', d))).toEqual(['19:00–04:00 next day', '20:00–05:00 next day']);
    expect([WINTER, SUMMER].map((d) => cellText('tokyo', 'Europe/London', d))).toEqual(['00:00–09:00', '01:00–10:00']);
    expect([WINTER, SUMMER].map((d) => cellText('tokyo', 'UTC', d))).toEqual(['00:00–09:00', '00:00–09:00']);
    expect([WINTER, SUMMER, US_ONLY].map((d) => cellText('overlap', 'Asia/Kolkata', d))).toEqual(['18:30–22:30 (4 h)', '17:30–21:30 (4 h)', '17:30–22:30 (5 h)']);
    expect(cellText('sydney', 'America/New_York', WINTER)).toBe('15:00–00:00 next day');
  });

  it('cover the zones people search, with 2026 column dates; Sydney gets a note or, for its own session, a column', () => {
    const names = SESSION_ZONES.map((z) => z.zone);
    for (const z of ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'UTC', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Manila', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney']) {
      expect(names).toContain(z);
    }
    // The registry descriptions of the four routes say "16 time zones".
    expect(SESSION_ZONES).toHaveLength(16);
    const c = makeCtx(2026);
    const ny = zoneTable('newYork', c);
    expect(ny.columns.map((x) => x.dates)).toEqual(['1 Jan–7 Mar and 1 Nov–31 Dec', '8–28 Mar and 25–31 Oct', '29 Mar–24 Oct']);
    expect(ny.notes).toEqual([expect.stringMatching(/^Sydney: 23:00–08:00 next day from 29 Mar–4 Apr and 4–24 Oct 2026/)]);
    expect(zoneTable('sydney', c).columns.map((x) => x.dates)).toEqual(['1 Jan–7 Mar and 1 Nov–31 Dec', '8–28 Mar and 25–31 Oct', '29 Mar–4 Apr and 4–24 Oct', '5 Apr–3 Oct']);
  });

  it('are rendered with every zone row and the expected winter and summer cells', () => {
    const expected: Record<SessionPageId, { caption: RegExp; row: string; cells: string[] }> = {
      newYork: { caption: /^New York session times by time zone, 2026$/, row: 'India (IST)', cells: ['18:30–03:30next day', '17:30–02:30next day', '17:30–02:30next day'] },
      london: { caption: /^London session times by time zone, 2026$/, row: 'New York (ET)', cells: ['03:00–12:00', '04:00–13:00', '03:00–12:00'] },
      asian: { caption: /^Asian \(Tokyo\) session times by time zone, 2026$/, row: 'London (UK time)', cells: ['00:00–09:00', '00:00–09:00', '01:00–10:00'] },
      overlap: { caption: /^London–New York overlap by time zone, 2026$/, row: 'UTC', cells: ['13:00–17:00(4 h)', '12:00–17:00(5 h)', '12:00–16:00(4 h)'] },
    };
    for (const [id, Page] of PAGES) {
      const { unmount } = renderWithProviders(<Page />);
      const table = screen.getByRole('table', { name: expected[id].caption });
      const rows = within(table).getAllByRole('row').slice(1);
      expect(rows.map((r) => r.querySelector('td span')?.textContent), id).toEqual(SESSION_ZONES.map((z) => z.name));
      const row = rows.find((r) => r.querySelector('td span')?.textContent === expected[id].row)!;
      expect([...row.querySelectorAll('td')].slice(1).map((td) => td.textContent), id).toEqual(expected[id].cells);
      unmount();
    }
  });

  it('are in the prerendered HTML, while the visitor\'s own line waits for the browser', () => {
    (window as { __PRERENDER__?: boolean }).__PRERENDER__ = true;
    try {
      for (const [, Page] of PAGES) {
        const { unmount } = renderWithProviders(<Page />);
        expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
        expect(todayText()).toMatch(/appear here once the page has loaded/);
        expect(todayText()).not.toMatch(/in your time zone \(/i);
        unmount();
      }
    } finally {
      delete (window as { __PRERENDER__?: boolean }).__PRERENDER__;
    }
  });
});

describe('today in the visitor\'s time zone', () => {
  it('says the New York session is open, with its open and close on the visitor\'s clock', () => {
    vi.setSystemTime(new Date('2026-07-15T13:00:00Z'));
    renderWithProviders(<NewYorkSessionPage />);
    expect(todayText()).toMatch(/^The New York session is open now in your time zone \(.+, UTC[+−]\d+(:\d\d)?\): it opened at \d\d:\d\d (today|yesterday) and closes at \d\d:\d\d (today|tomorrow)\.$/);
  });

  it('on Saturday says the market is closed and when London next opens', () => {
    vi.setSystemTime(new Date('2026-07-18T12:00:00Z'));
    renderWithProviders(<LondonSessionPage />);
    expect(todayText()).toMatch(/^The forex market is closed for the weekend\. In your time zone \(.+\) the London session next opens at \d\d:\d\d (tomorrow|on \w+day \d+ Jul) and closes/);
  });

  it('before the Sunday open, Sydney starts with the weekly market', () => {
    vi.setSystemTime(new Date('2026-01-11T20:30:00Z'));
    renderWithProviders(<AsianSessionPage />);
    expect(todayText()).toMatch(/Asian \(Tokyo\) session/);
    expect(todayText()).toMatch(/Sydney session (next )?opens at \d\d:\d\d .+, starting when the weekly market opens\./);
  });

  it('reports the London–New York overlap', () => {
    vi.setSystemTime(new Date('2026-03-18T12:30:00Z'));
    renderWithProviders(<LondonNewYorkOverlapPage />);
    expect(todayText()).toMatch(/^The London–New York overlap is open now/);
  });
});

describe('the four pages are not copies of each other', () => {
  it('main text shares few five-word phrases, and no FAQ question repeats', () => {
    const texts = PAGES.map(([id, Page]) => {
      const { container, unmount } = renderWithProviders(<Page />);
      const t = prose(container);
      unmount();
      return { id, shingles: shingles(t), words: t.split(/\s+/).length };
    });
    for (const t of texts) expect(t.words, t.id).toBeGreaterThan(900);
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        expect(jaccard(texts[i].shingles, texts[j].shingles), `${texts[i].id} vs ${texts[j].id}`).toBeLessThan(0.25);
      }
    }
    const questions = PAGES.flatMap(([id]) => SESSION_PAGES[id].faq(makeCtx(2026)).map((f) => f.question));
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('each page\'s own answer, sections and FAQ (without the shared legend, sources and journal line) are almost entirely its own', () => {
    const c = makeCtx(2026);
    const flat = (parts: (string | { text: string })[]) => parts.map((x) => (typeof x === 'string' ? x : x.text)).join('');
    const body = PAGES.map(([id]) => {
      const p = SESSION_PAGES[id];
      const sections = p.sections(c).flatMap((s) => [s.heading, ...s.paragraphs.map(flat)]);
      return { id, shingles: shingles([p.h1, p.lede, p.shortAnswer(c), ...sections, ...p.faq(c).flatMap((f) => [f.question, f.answer])].join(' ')) };
    });
    for (let i = 0; i < body.length; i++) {
      for (let j = i + 1; j < body.length; j++) expect(jaccard(body[i].shingles, body[j].shingles), `${body[i].id} vs ${body[j].id}`).toBeLessThan(0.1);
    }
  });
});

describe('forex market hours clock', () => {
  it('links to the four session pages', () => {
    const { container } = renderWithProviders(<ForexMarketHoursPage />);
    const hrefs = [...container.querySelectorAll('article a[href^="/"]')].map((a) => a.getAttribute('href'));
    for (const path of Object.values(SESSION_PATHS)) expect(hrefs).toContain(path);
  });
});
