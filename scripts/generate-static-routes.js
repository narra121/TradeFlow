/**
 * Post-build script: copies index.html to each SPA route folder
 * so that direct URL access works on GitHub Pages without JS redirects.
 * This is critical for PayU's website validator and SEO crawlers.
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');

// All public routes that need to be directly accessible
const routes = [
  'about',
  'privacy',
  'terms',
  'refund',
  'contact',
  'login',
  'signup',
];

const indexFile = join(distDir, 'index.html');

if (!existsSync(indexFile)) {
  console.error('dist/index.html not found. Run "bun run build" first.');
  process.exit(1);
}

for (const route of routes) {
  const routeDir = join(distDir, route);
  if (!existsSync(routeDir)) {
    mkdirSync(routeDir, { recursive: true });
  }
  cpSync(indexFile, join(routeDir, 'index.html'));
  console.log(`  Created ${route}/index.html`);
}

console.log(`\nGenerated ${routes.length} static route pages.`);
