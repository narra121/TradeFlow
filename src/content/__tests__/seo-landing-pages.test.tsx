import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { GUIDE_ARTICLE_SCHEMA, pageTitle, seoPageSchema } from '@/config/seo';
import { BLOG_ARTICLES } from '../blog/articles';
import { SEE_ALSO } from '../blog/see-also';
import { BROKER_PAGES } from '../brokers';
import { IMPORT_SOURCES } from '../product-facts';
import { getPublicRoutes } from '../route-registry';
import { SEO_PAGE_LOADERS } from '../routes';
import { SEO_PAGES, getSeoPage } from '../seo-pages';

const PATHS = new Set(getPublicRoutes().map((r) => r.path));
const ADVICE = [/guaranteed/i, /can'?t lose/i, /risk[- ]free/i, /you will (make|earn|profit)/i, /sure[- ]shot/i, /we recommend (buying|selling)/i];
const UNSUPPORTED = [/(hundreds|thousands|millions) of (trading )?(journals|traders|users)/i, /studies (show|have shown|find)|research (shows|has shown|finds)/i, /\b(#1|number one|top[- ]rated|unbeatable)\b/i];

const LANDING = [
  '/forex-trading-journal',
  '/mt4-trading-journal',
  '/mt5-trading-journal',
  '/prop-firm-trading-journal',
  '/trading-journal-india',
  '/fo-trading-journal',
  '/import-trades-from-screenshot',
  ...BROKER_PAGES.map((b) => b.path),
];

async function renderPage(path: string) {
  const Page = (await SEO_PAGE_LOADERS[path]()).default;
  return renderWithProviders(<Page />);
}

describe('landing pages for search', () => {
  for (const path of LANDING) {
    it(`${path}: one h1, an FAQ, no advice or unsupported claims, and only links that exist`, async () => {
      const { container, unmount } = await renderPage(path);
      const text = container.textContent ?? '';
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelector('#faq')).not.toBeNull();
      expect(text.length).toBeGreaterThan(3000);
      for (const re of [...ADVICE, ...UNSUPPORTED]) expect(text, `${path} ${re}`).not.toMatch(re);
      // The page body only: the shared header and footer have their own tests.
      const internal = [...container.querySelectorAll('article a[href^="/"]')].map((a) => (a.getAttribute('href') ?? '').split('#')[0]);
      expect(internal.length).toBeGreaterThanOrEqual(5);
      for (const href of internal) expect(PATHS.has(href) || href === '/signup', `${path} links to ${href}`).toBe(true);
      unmount();
    });
  }

  it('never present automatic broker sync as available', async () => {
    for (const path of LANDING) {
      const { container, unmount } = await renderPage(path);
      const text = container.textContent ?? '';
      for (const m of text.matchAll(/automatic (broker )?sync[^.]*\./gi)) expect(m[0], path).toMatch(/planned|not available|does not have/i);
      unmount();
    }
  });
});

describe('broker pages', () => {
  it('cover every Indian import source with its own steps, columns and questions', () => {
    const indian = IMPORT_SOURCES.filter((s) => !['mt4', 'mt5', 'generic_csv'].includes(s.id)).map((s) => s.id);
    expect(BROKER_PAGES.map((b) => b.importId).sort()).toEqual([...indian].sort());
    for (const b of BROKER_PAGES) {
      expect(b.exportSteps.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.columns.length, b.id).toBeGreaterThanOrEqual(8);
      expect(b.faq.length, b.id).toBeGreaterThanOrEqual(3);
      for (const f of b.faq) expect(f.question.endsWith('?'), f.question).toBe(true);
      for (const s of b.sources) expect(s.checked <= new Date().toISOString().slice(0, 10), `${b.id} ${s.url}`).toBe(true);
    }
    expect(new Set(BROKER_PAGES.map((b) => b.shortAnswer)).size).toBe(BROKER_PAGES.length);
  });
});

describe('breadcrumb trails', () => {
  it('name a parent that is itself an SEO page, and reach the JSON-LD', () => {
    for (const p of SEO_PAGES.filter((x) => x.parent)) {
      const parent = getSeoPage(p.parent!.path);
      expect(p.parent!.label, p.path).toBe(parent.label);
      const graph = (seoPageSchema(p) as { '@graph': { '@type': string; itemListElement?: { item: string }[] }[] })['@graph'];
      const trail = graph.find((n) => n['@type'] === 'BreadcrumbList')!.itemListElement!;
      expect(trail.map((i) => i.item), p.path).toEqual(['https://tradequt.com', `https://tradequt.com${parent.path}`, `https://tradequt.com${p.path}`]);
    }
    expect(SEO_PAGES.filter((x) => x.path.startsWith('/alternatives/')).every((x) => x.parent?.path === '/alternatives')).toBe(true);
  });
});

describe('article see-also links', () => {
  it('belong to real articles and point at registry paths', () => {
    const slugs = new Set(BLOG_ARTICLES.map((a) => a.slug));
    for (const [slug, links] of Object.entries(SEE_ALSO)) {
      expect(slugs.has(slug), slug).toBe(true);
      for (const l of links) expect(PATHS.has(l.to), `${slug} -> ${l.to}`).toBe(true);
    }
  });

  it('give every calculator and comparison hub an inbound link from an article', () => {
    const targets = new Set(Object.values(SEE_ALSO).flatMap((links) => links.map((l) => l.to)));
    for (const path of ['/resources/position-size', '/resources/risk-reward', '/resources/pip-calculator', '/alternatives']) {
      expect(targets.has(path), path).toBe(true);
    }
  });
});

describe('titles and dates', () => {
  it('keeps the brand suffix only while the title fits a results page', () => {
    expect(pageTitle('Short title', ' - TradeQut Blog')).toBe('Short title - TradeQut Blog');
    expect(pageTitle('x'.repeat(50), ' - TradeQut Blog')).toBe('x'.repeat(50));
    for (const p of SEO_PAGES) expect(p.title.length, p.path).toBeLessThanOrEqual(60);
    for (const a of BLOG_ARTICLES) expect(pageTitle(a.title, ' - TradeQut Blog').length, a.slug).toBeLessThanOrEqual(60);
  });

  it('gives /guide the same date in the sitemap and in its Article markup', () => {
    const article = GUIDE_ARTICLE_SCHEMA['@graph'][0] as { dateModified: string };
    expect(getPublicRoutes().find((r) => r.path === '/guide')!.lastmod).toBe(article.dateModified);
  });
});
