import { describe, expect, it } from 'vitest';
import { BLOG_ARTICLES, getRelatedArticles } from '../blog/articles';

describe('getRelatedArticles (FE-083)', () => {
  const slug = 'trading-drawdown-calculation';
  const current = BLOG_ARTICLES.find((a) => a.slug === slug)!;
  const shared = (a: (typeof BLOG_ARTICLES)[number]) => a.tags.filter((t) => current.tags.includes(t)).length;

  it('never lists the article itself or one with no tag in common', () => {
    const related = getRelatedArticles(slug, 50);
    expect(related.map((a) => a.slug)).not.toContain(slug);
    for (const a of related) expect(shared(a)).toBeGreaterThan(0);
  });

  it('ranks by shared tags, then the newest first', () => {
    const related = getRelatedArticles(slug, 50);
    for (let i = 1; i < related.length; i++) {
      const [a, b] = [related[i - 1], related[i]];
      expect(shared(a)).toBeGreaterThanOrEqual(shared(b));
      if (shared(a) === shared(b)) expect(a.publishedAt >= b.publishedAt).toBe(true);
    }
  });

  it('honours the limit and answers an unknown slug with nothing', () => {
    expect(getRelatedArticles(slug, 2).length).toBeLessThanOrEqual(2);
    expect(getRelatedArticles('nope')).toEqual([]);
  });
});
