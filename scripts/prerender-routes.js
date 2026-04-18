import { chromium } from 'playwright';
import { preview } from 'vite';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROUTES = [
  '/',
  '/about',
  '/guide',
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
  '/login',
  '/signup',
];

const distDir = join(process.cwd(), 'dist');

async function prerender() {
  console.log('Starting pre-render...');

  const server = await preview({
    preview: { port: 4173, strictPort: false },
  });

  const address = server.resolvedUrls?.local?.[0] ?? 'http://localhost:4173';
  console.log(`Preview server at ${address}`);

  const browser = await chromium.launch();

  for (const route of ROUTES) {
    const page = await browser.newPage();
    const url = `${address}${route}`;

    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for React to mount and Helmet to update the <head>
    await page.waitForSelector('#root > *', { timeout: 15000 });
    // Small extra wait for Helmet DOM updates
    await page.waitForTimeout(1500);

    const html = await page.content();

    if (route === '/') {
      writeFileSync(join(distDir, 'index.html'), html, 'utf-8');
    } else {
      const routeDir = join(distDir, route.slice(1));
      if (!existsSync(routeDir)) {
        mkdirSync(routeDir, { recursive: true });
      }
      writeFileSync(join(routeDir, 'index.html'), html, 'utf-8');
    }

    console.log(`  Pre-rendered ${route}`);
    await page.close();
  }

  await browser.close();
  server.httpServer.close();

  console.log(`\nPre-rendered ${ROUTES.length} routes.`);
}

prerender().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
