/**
 * Prerenders every public route listed in dist/_seo/routes.json (written by scripts/seo/manifest.ts from the
 * route registry) into dist/<path>/index.html. The untouched SPA shell is kept as dist/_spa.html for /app/* and 404s.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SITE = 'https://tradequt.com';
const CONCURRENCY = 4;
const distDir = join(process.cwd(), 'dist');
const { routes } = JSON.parse(readFileSync(join(distDir, '_seo', 'routes.json'), 'utf-8'));
const MODULEPRELOAD = /<link rel="modulepreload"[^>]*href="([^"]+)"[^>]*>/g;

// Vite adds a modulepreload link for every chunk the rendered route imported (about 33 for /login). Saved into the
// HTML, they download ahead of the stylesheets and the font and delay the first paint; the app adds them again when
// it starts. Only the shell's own links stay.
function dropRuntimePreloads(html, shellPreloads) {
  return html.replace(MODULEPRELOAD, (tag, href) => (shellPreloads.has(href) ? tag : ''));
}

async function renderRoute(browser, base, path) {
  const page = await browser.newPage();
  try {
    // Pages that show live data (/status) check this flag and keep their loading state in the saved HTML.
    await page.addInitScript(() => {
      window.__PRERENDER__ = true;
    });
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    const canonical = path === '/' ? SITE : `${SITE}${path}`;
    // The route's own <SEO> must have run, not a previous route's or the shell's.
    await page.waitForFunction(
      (href) => document.querySelector('link[rel="canonical"]')?.getAttribute('href') === href,
      canonical,
      { timeout: 30000 },
    );
    return await page.content();
  } finally {
    await page.close();
  }
}

async function prerender() {
  console.log('Starting pre-render...');
  copyFileSync(join(distDir, 'index.html'), join(distDir, '_spa.html'));
  const shellPreloads = new Set([...readFileSync(join(distDir, '_spa.html'), 'utf-8').matchAll(MODULEPRELOAD)].map((m) => m[1]));

  const server = await preview({ preview: { port: 4173, strictPort: false } });
  const base = (server.resolvedUrls?.local?.[0] ?? 'http://localhost:4173').replace(/\/$/, '');
  const browser = await chromium.launch();
  const results = new Map();
  const queue = routes.map((r) => r.path);

  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      results.set(path, await renderRoute(browser, base, path));
      console.log(`  Pre-rendered ${path}`);
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    await browser.close();
    server.httpServer.close();
  }

  // Written only after every route rendered: the preview server keeps serving the untouched shell meanwhile.
  for (const [path, rendered] of results) {
    const html = dropRuntimePreloads(rendered, shellPreloads);
    if (path === '/') {
      writeFileSync(join(distDir, 'index.html'), html, 'utf-8');
      continue;
    }
    const dir = join(distDir, path.slice(1));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html, 'utf-8');
  }
  console.log(`\nPre-rendered ${results.size} routes.`);
}

prerender().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
