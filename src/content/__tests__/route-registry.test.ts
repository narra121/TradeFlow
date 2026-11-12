import { describe, it, expect } from 'vitest';
import { getPublicRoutes, isSpaPath } from '../route-registry';
import { BLOG_ARTICLES } from '../blog/articles';
import { CASE_STUDIES } from '../case-studies/studies';
import { SEO_PAGES } from '../seo-pages';
import { CONTENT_ROUTES } from '../routes';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('route registry', () => {
  const routes = getPublicRoutes();

  it('has unique, canonical-form paths outside the SPA prefixes', () => {
    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(p.startsWith('/')).toBe(true);
      if (p !== '/') expect(p.endsWith('/')).toBe(false);
      expect(isSpaPath(p)).toBe(false);
      expect(p).toBe(p.toLowerCase());
    }
  });

  it('includes every article, scenario and SEO page', () => {
    const paths = new Set(routes.map((r) => r.path));
    for (const a of BLOG_ARTICLES) expect(paths.has(`/blog/${a.slug}`)).toBe(true);
    for (const s of CASE_STUDIES) expect(paths.has(`/case-studies/${s.slug}`)).toBe(true);
    for (const p of SEO_PAGES) expect(paths.has(p.path)).toBe(true);
  });

  it('uses valid, non-future lastmod dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const r of routes) {
      expect(r.lastmod).toMatch(DATE);
      expect(r.lastmod <= today).toBe(true);
    }
  });

  it('keeps article metadata consistent', () => {
    for (const a of BLOG_ARTICLES) {
      expect(a.publishedAt).toMatch(DATE);
      if (a.updatedAt) expect(a.updatedAt >= a.publishedAt).toBe(true);
      expect(a.description.length).toBeLessThanOrEqual(200);
      for (const f of a.faq ?? []) {
        expect(f.question.endsWith('?')).toBe(true);
        expect(f.answer.length).toBeGreaterThan(20);
      }
    }
  });

  it('wires every SEO page to a lazy component', () => {
    expect(CONTENT_ROUTES.map((r) => r.path).sort()).toEqual([...SEO_PAGES.map((p) => p.path), '/goodbye', '/status', '/security'].sort());
  });

  it('classifies SPA paths', () => {
    expect(isSpaPath('/app')).toBe(true);
    expect(isSpaPath('/app/trades')).toBe(true);
    expect(isSpaPath('/auth/callback')).toBe(true);
    expect(isSpaPath('/apple')).toBe(false);
    expect(isSpaPath('/blog')).toBe(false);
  });
});
