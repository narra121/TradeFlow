import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://tradequt.com';
const distDir = join(process.cwd(), 'dist');

// Use real content-change dates, not build date
const routes = [
  { path: '/', lastmod: '2026-05-03' },
  { path: '/guide', lastmod: '2026-04-18' },
  { path: '/about', lastmod: '2026-04-18' },
  { path: '/contact', lastmod: '2026-04-09' },
  { path: '/privacy', lastmod: '2026-04-09' },
  { path: '/terms', lastmod: '2026-04-09' },
  { path: '/refund', lastmod: '2026-04-09' },
  { path: '/blog', lastmod: '2026-05-03' },
  { path: '/blog/how-to-keep-trading-journal', lastmod: '2026-04-20' },
  { path: '/blog/trading-journal-template', lastmod: '2026-04-21' },
  { path: '/blog/mistakes-new-traders-make', lastmod: '2026-04-22' },
  { path: '/blog/how-to-review-trades', lastmod: '2026-04-23' },
  { path: '/blog/getting-started-tradequt', lastmod: '2026-04-24' },
  { path: '/blog/win-rate-vs-profit-factor', lastmod: '2026-04-25' },
  { path: '/blog/risk-reward-ratio-guide', lastmod: '2026-04-26' },
  { path: '/blog/track-reduce-drawdown', lastmod: '2026-04-27' },
  { path: '/blog/trading-metrics-that-matter', lastmod: '2026-04-28' },
  { path: '/blog/build-trading-plan', lastmod: '2026-04-29' },
  { path: '/blog/trading-psychology-managing-emotions', lastmod: '2026-04-30' },
  { path: '/blog/why-trading-rules-matter', lastmod: '2026-05-01' },
  { path: '/blog/forex-trading-journal', lastmod: '2026-05-02' },
  { path: '/blog/day-trading-journal', lastmod: '2026-05-03' },
  { path: '/blog/prop-trading-challenges', lastmod: '2026-05-04' },
  { path: '/blog/trading-analytics-find-edge', lastmod: '2026-05-05' },
  { path: '/blog/importing-trades-from-broker', lastmod: '2026-05-06' },
  { path: '/glossary', lastmod: '2026-05-03' },
  { path: '/resources', lastmod: '2026-05-03' },
  { path: '/resources/position-size', lastmod: '2026-05-03' },
  { path: '/resources/risk-reward', lastmod: '2026-05-03' },
  { path: '/resources/pip-calculator', lastmod: '2026-05-03' },
  { path: '/case-studies', lastmod: '2026-05-03' },
  { path: '/case-studies/day-trader-win-rate', lastmod: '2026-04-25' },
  { path: '/case-studies/ftmo-challenge-journal', lastmod: '2026-04-26' },
  { path: '/case-studies/revenge-trading-to-discipline', lastmod: '2026-04-27' },
  { path: '/case-studies/multi-account-management', lastmod: '2026-04-28' },
  { path: '/case-studies/forex-session-edge', lastmod: '2026-04-29' },
  { path: '/changelog', lastmod: '2026-05-03' },
];

const urls = routes
  .map(
    (r) => `  <url>
    <loc>${BASE_URL}${r.path === '/' ? '' : r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
  </url>`
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`Generated sitemap.xml with ${routes.length} URLs`);
