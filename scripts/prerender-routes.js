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
const STYLESHEET = /<link rel="stylesheet"[^>]*\shref="(\/[^"]+\.css)"[^>]*>/g;
const FONT_PRELOAD = /<link rel="preload"[^>]*\shref="(\/[^"]+\.woff2)"[^>]*>/g;
const ENTRY_SCRIPT = /<script type="module"[^>]*\ssrc="[^"]+"[^>]*><\/script>/g;
const MODULEPRELOAD = /<link rel="modulepreload"[^>]*>/g;

// Faces declared `font-display: block` in fonts.css hold their text back until the file arrives.
const textBlockingFonts = new Set(
  (readFileSync(join(distDir, 'fonts', 'fonts.css'), 'utf-8').match(/@font-face \{[^}]*\}/g) ?? [])
    .filter((face) => face.includes('font-display: block'))
    .map((face) => /url\('([^']+)'\)/.exec(face)?.[1]),
);

function withTextFontsInline(css) {
  return [...textBlockingFonts].reduce(
    (out, url) => out.replace(`url('${url}')`, () => `url(data:font/woff2;base64,${readFileSync(join(distDir, url)).toString('base64')})`),
    css,
  );
}

/**
 * Lets the saved page paint from its first response, with nothing else on the wire before it:
 * - every stylesheet is written into the page, so no CSS request blocks rendering (the router's CSP allows inline
 *   styles). A build stylesheet also leaves a link that is never fetched (`disabled` stops the parser, `media="not all"`
 *   stops the preload scanner, which ignores `disabled`); Vite finds it when the app starts and so does not download
 *   the same file again.
 * - a font that blocks text is written into that CSS as a data: URL, so it is there for the first layout and the text
 *   paints in the first frame (the router's CSP lists `data:` under font-src for this);
 * - the entry script, every modulepreload (the shell's, and the one Vite added for each chunk the rendered route
 *   imported, about 33 for /login) and the other font preloads move to the end of <body>. The browser finds them when
 *   the page's own bytes have arrived, then downloads them as one batch.
 */
function paintBeforeScripts(html) {
  const tail = [];
  const keepForTail = (tag) => {
    tail.push(tag);
    return '';
  };
  return html
    .replace(STYLESHEET, (tag, href) => {
      const placeholder = href.startsWith('/assets/') ? tag.replace(/>$/, ' media="not all" disabled>') : '';
      return `<style>${withTextFontsInline(readFileSync(join(distDir, href), 'utf-8'))}</style>${placeholder}`;
    })
    .replace(FONT_PRELOAD, (tag, href) => (textBlockingFonts.has(href) ? '' : keepForTail(tag)))
    .replace(ENTRY_SCRIPT, keepForTail)
    .replace(MODULEPRELOAD, keepForTail)
    .replace('</body>', () => `${tail.join('')}</body>`);
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
    const html = paintBeforeScripts(rendered);
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
