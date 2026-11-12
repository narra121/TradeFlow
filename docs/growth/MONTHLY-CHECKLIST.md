# Monthly SEO and content checklist

Run in the first week of each month (about 2-3 hours). Date each run at the bottom of the log.

## 1. Measure (Search Console and GA4)
- [ ] Search Console: queries, impressions, clicks, average position for the last 28 days vs the month before.
- [ ] Pages with impressions but low click-through: rewrite the title or description.
- [ ] Pages that dropped: check for a template change, a redirect, or a competitor refresh.
- [ ] Coverage: any "Crawled - currently not indexed" or "Duplicate" for pages that should be indexed?
- [ ] GA4 funnel (only users who consented): sign_up, first_trade, import_completed, begin_checkout, purchase.

## 2. Keep facts true
- [ ] Re-read the primary sources of every page with prices or rates: `fo-trading-charges-india`, `best-free-trading-journal`,
      `/alternatives/*`, the broker export guides. Update the text, the `Sources` date and `updatedAt`.
- [ ] `src/content/product-facts.ts` still matches the shipped product and `/pricing` (limits, prices, brokers, trial).
- [ ] `src/content/changelog/entries.ts` lists only shipped, user-facing changes.
- [ ] Legal pages still name the services actually in use (Stripe, AWS, Google); update "Last updated" when changed.

## 3. Publish
- [ ] Pick the month's rows from `CONTENT-CALENDAR.md`; re-rank against Search Console.
- [ ] Write from `ARTICLE-TEMPLATE.md`; add the registry entry; `bun run test`; `bun run build` ends with `verify-dist OK`.
- [ ] Add 2-3 internal links from older articles to each new one.
- [ ] After deploy: open each new URL, confirm 200, own title, FAQ visible, `Sources` present.
- [ ] Request indexing for new URLs in Search Console; confirm the IndexNow step ran (production deploy log).

## 4. Technical health
- [ ] `bun run build` clean; no console errors on three public pages and one article.
- [ ] `/definitely-missing` returns 404 and `/app/dashboard` returns 200 on production.
- [ ] `sitemap.xml` lastmod values changed only for pages that changed.
- [ ] Core Web Vitals report in Search Console: any URL group "Poor"?
- [ ] Dependency and Playwright updates applied if the prerender step needs them.

## 5. Off-site (when time allows)
- [ ] One genuine mention: a directory listing, a community answer, a post. No paid links, no fake reviews.
- [ ] Reply to any support or feedback email about a page.

## Log

| Month | Run on | Notes |
|---|---|---|
| 2026-12 | | |
