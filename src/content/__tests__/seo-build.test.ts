import { describe, it, expect } from 'vitest';
import { absoluteUrl, buildLlmsFullTxt, buildLlmsTxt, buildSitemap } from '../../../scripts/seo/generators';
import { verifyHtml } from '../../../scripts/seo/postbuild';
import { getPublicRoutes } from '../route-registry';
import { PRO_PRICES, PRODUCT_DEFINITION } from '../product-facts';
import { BLOG_ARTICLES } from '../blog/articles';

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

describe('sitemap', () => {
  const xml = buildSitemap();

  it('lists every indexable route exactly once and at least 40 URLs', () => {
    const urls = locs(xml);
    expect(urls.length).toBeGreaterThanOrEqual(40);
    expect(new Set(urls).size).toBe(urls.length);
    for (const r of getPublicRoutes().filter((x) => x.inSitemap)) expect(urls).toContain(absoluteUrl(r.path));
  });

  it('leaves out the thin auth pages and the app', () => {
    const urls = locs(xml);
    expect(urls).not.toContain('https://tradequt.com/login');
    expect(urls).not.toContain('https://tradequt.com/signup');
    expect(urls.some((u) => u.includes('/app'))).toBe(false);
  });

  it('uses the content date for lastmod', () => {
    for (const a of BLOG_ARTICLES) {
      const block = xml.split('<url>').find((b) => b.includes(`/blog/${a.slug}</loc>`));
      expect(block, a.slug).toContain(`<lastmod>${a.updatedAt ?? a.publishedAt}</lastmod>`);
    }
  });
});

describe('llms.txt', () => {
  it('opens with the product name and definition and lists every price', () => {
    const txt = buildLlmsTxt();
    expect(txt.startsWith('# TradeQut')).toBe(true);
    expect(txt).toContain(PRODUCT_DEFINITION);
    for (const p of PRO_PRICES) expect(txt).toContain(p.display);
    expect(txt).toContain('14-day');
  });

  it('links every article', () => {
    const txt = buildLlmsTxt();
    for (const a of BLOG_ARTICLES) expect(txt).toContain(`https://tradequt.com/blog/${a.slug}`);
  });

  it('llms-full carries the plan limits, FAQ, comparisons and article answers', () => {
    const txt = buildLlmsFullTxt();
    expect(txt).toContain('## Free trial vs Pro');
    expect(txt).toContain('Is TradeQut free?');
    expect(txt).toContain('TradeZella vs TradeQut');
    expect(txt).toContain('Not verified:');
    for (const a of BLOG_ARTICLES.filter((x) => x.summary)) expect(txt).toContain(a.summary as string);
    expect(txt).not.toMatch(/aggregateRating|testimonial/i);
  });
});

describe('verifyHtml', () => {
  const good = (path: string, title: string) =>
    `<html><head><title>${title}</title><link rel="canonical" href="${absoluteUrl(path)}"/>` +
    `<meta name="description" content="A description that is long enough to count."/>` +
    `<meta name="robots" content="index, follow"/><script type="application/ld+json">{"@type":"WebPage"}</script></head><body></body></html>`;

  it('accepts a complete production page', () => {
    expect(verifyHtml('/pricing', good('/pricing', 'Pricing'), new Map(), true)).toEqual([]);
  });

  it('rejects a duplicate title', () => {
    const titles = new Map<string, string>();
    verifyHtml('/a', good('/a', 'Same'), titles, true);
    expect(verifyHtml('/b', good('/b', 'Same'), titles, true).join()).toContain('duplicates');
  });

  it('rejects a canonical that is not self-referencing', () => {
    expect(verifyHtml('/pricing', good('/about', 'X'), new Map(), true).join()).toContain('canonical');
  });

  it('rejects missing or unparseable JSON-LD', () => {
    const noLd = good('/x', 'X').replace(/<script[\s\S]*<\/script>/, '');
    expect(verifyHtml('/x', noLd, new Map(), true).join()).toContain('no JSON-LD');
    const bad = good('/y', 'Y').replace('{"@type":"WebPage"}', '{oops');
    expect(verifyHtml('/y', bad, new Map(), true).join()).toContain('unparseable');
  });

  it('requires noindex in a development build and index in production', () => {
    expect(verifyHtml('/p', good('/p', 'P'), new Map(), false).join()).toContain('noindex');
    const noindex = good('/q', 'Q').replace('index, follow', 'noindex, nofollow');
    expect(verifyHtml('/q', noindex, new Map(), true).join()).toContain('production build');
  });

  it('does not require JSON-LD on the thin auth pages', () => {
    const login = good('/login', 'Log in').replace(/<script[\s\S]*<\/script>/, '');
    expect(verifyHtml('/login', login, new Map(), true)).toEqual([]);
  });
});
