import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://tradequt.com';
const distDir = join(process.cwd(), 'dist');

// Use real content-change dates, not build date
const routes = [
  { path: '/', lastmod: '2026-04-18' },
  { path: '/guide', lastmod: '2026-04-18' },
  { path: '/about', lastmod: '2026-04-18' },
  { path: '/contact', lastmod: '2026-04-09' },
  { path: '/privacy', lastmod: '2026-04-09' },
  { path: '/terms', lastmod: '2026-04-09' },
  { path: '/refund', lastmod: '2026-04-09' },
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
