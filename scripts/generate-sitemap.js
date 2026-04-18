import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://tradequt.com';
const distDir = join(process.cwd(), 'dist');

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/guide', changefreq: 'monthly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/refund', changefreq: 'yearly', priority: '0.4' },
];

const today = new Date().toISOString().split('T')[0];

const urls = routes
  .map(
    (r) => `  <url>
    <loc>${BASE_URL}${r.path === '/' ? '' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
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
