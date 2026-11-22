import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/test-utils';
import { BlogArticlePage } from '@/pages/blog/BlogArticlePage';
import { BLOG_ARTICLES } from '../blog/articles';
import { GTT_BROKERS, GTT_FIELDS, NOT_STATED } from '../gtt-charges';

const SLUG = 'gtt-order-charges';
const REQUIRED = ['zerodha', 'groww', 'upstox', 'angel-one', 'kotak-neo', 'icici-direct', 'fyers', 'mstock', 'dhan', '5paisa'];
const article = BLOG_ARTICLES.find((a) => a.slug === SLUG)!;

afterEach(cleanup);

describe('GTT charges data', () => {
  it('has a row for every broker people search for', () => {
    expect(GTT_BROKERS.map((b) => b.id)).toEqual(expect.arrayContaining(REQUIRED));
    expect(new Set(GTT_BROKERS.map((b) => b.id)).size).toBe(GTT_BROKERS.length);
  });

  it('reads every source from the broker’s own site, over https, on a date no later than today', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const b of GTT_BROKERS) {
      expect(b.sources.length, b.id).toBeGreaterThan(0);
      for (const s of b.sources) {
        const { protocol, hostname } = new URL(s.url);
        expect(protocol, s.url).toBe('https:');
        expect(hostname === b.domain || hostname.endsWith(`.${b.domain}`), `${b.id}: ${s.url}`).toBe(true);
        expect(s.checked, s.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(s.checked <= today, s.url).toBe(true);
      }
    }
  });

  it('ties every stated cell to a source of its own row and leaves unanswered cells as not stated', () => {
    for (const b of GTT_BROKERS) {
      const ids = new Set(b.sources.map((s) => s.id));
      for (const c of [...GTT_FIELDS.map((f) => b[f]), ...(b.note ? [b.note] : [])]) {
        if (c.text === NOT_STATED) {
          expect(c.from, `${b.id}: ${c.text}`).toEqual([]);
          continue;
        }
        expect(c.from.length, `${b.id}: ${c.text}`).toBeGreaterThan(0);
        for (const id of c.from) expect(ids.has(id), `${b.id}: ${id}`).toBe(true);
      }
    }
  });
});

describe('GTT order charges article', () => {
  it('has a results-page title and description and at least four FAQ items', () => {
    expect(article.title.length).toBeLessThanOrEqual(60);
    expect(article.title).toMatch(/^GTT order charges/);
    expect(article.description.length).toBeLessThanOrEqual(200);
    expect(article.faq?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('renders one broker table row per broker, with its source links and read date, and the FAQ questions', async () => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
      </Routes>,
      { route: `/blog/${SLUG}` },
    );
    const caption = await screen.findByText(/^GTT charges, validity and availability by broker/, { selector: 'caption' });
    const rows = within(caption.closest('table')!).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(GTT_BROKERS.length);
    GTT_BROKERS.forEach((b, i) => {
      expect(rows[i]).toHaveTextContent(b.broker);
      expect(rows[i]).toHaveTextContent('Read 21 Nov 2026');
      const hrefs = [...rows[i].querySelectorAll('a')].map((a) => a.getAttribute('href'));
      for (const s of b.sources) expect(hrefs, s.url).toContain(s.url);
    });
    for (const f of article.faq ?? []) expect(screen.getByRole('heading', { name: f.question })).toBeInTheDocument();
    expect(container.querySelector('a[href="/blog/fo-trading-charges-india"]')).not.toBeNull();
    expect(container.querySelector('a[href="/resources/fo-charges-rates"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
  });
});
