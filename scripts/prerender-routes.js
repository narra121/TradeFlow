import { chromium } from 'playwright';
import { preview } from 'vite';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
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

  // Preserve the original SPA shell — it's the fallback for all non-pre-rendered routes.
  // Without this, /app/* routes flash the pre-rendered landing page before React hydrates.
  const indexFile = join(distDir, 'index.html');
  const spaShell = readFileSync(indexFile, 'utf-8');

  // Pre-seed route directories with index.html so the preview server can serve them
  for (const route of ROUTES) {
    if (route === '/') continue;
    const routeDir = join(distDir, route.slice(1));
    if (!existsSync(routeDir)) {
      mkdirSync(routeDir, { recursive: true });
    }
    const dest = join(routeDir, 'index.html');
    if (!existsSync(dest)) {
      writeFileSync(dest, readFileSync(indexFile, 'utf-8'), 'utf-8');
    }
  }

  const server = await preview({
    preview: { port: 4173, strictPort: false },
  });

  const address = server.resolvedUrls?.local?.[0] ?? 'http://localhost:4173';
  console.log(`Preview server at ${address}`);

  const browser = await chromium.launch();

  for (const route of ROUTES) {
    const page = await browser.newPage();
    const url = `${address.replace(/\/$/, '')}${route}`;

    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait for SEO component to set the robots meta tag (indicates page fully rendered)
    await page.waitForFunction(
      () => document.querySelector('meta[name="robots"]') !== null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(2000);

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

  // Save the SPA shell as _spa.html — CloudFront error responses use this as the
  // fallback for non-pre-rendered routes, preventing /app/* from flashing the landing page.
  writeFileSync(join(distDir, '_spa.html'), spaShell, 'utf-8');

  console.log(`\nPre-rendered ${ROUTES.length} routes.`);
}

prerender().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
