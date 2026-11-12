#!/usr/bin/env node
/**
 * Performance budgets for the public site (DESIGN-ENTERPRISE D.10, E-088). Serves dist/ with `vite preview` and measures,
 * per route: gzip JS and CSS transferred, font bytes and files, LCP and CLS (lab, no throttling). Also checks every
 * built chunk against the per-chunk budget.
 *
 *   bun run build && node scripts/perf/budget.mjs [--out <dir>] [--record-baseline]
 *
 * Ratchet: a metric fails when it exceeds max(target, baseline * 1.05) if it is over target today, else its target.
 * So the first run records where we are, nothing regresses, and the baseline is lowered toward the target over time.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = resolve(opt('out', 'perf-report'));
const record = args.includes('--record-baseline');
const budgetsPath = resolve('scripts/perf/budgets.json');
const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8'));
const ROUTES = ['/', '/pricing', '/blog/fo-trading-charges-india', '/glossary'];
mkdirSync(out, { recursive: true });

const kb = (n) => Math.round((n / 1024) * 10) / 10;

/* Built chunks: gzip size of each file in dist/assets. */
function chunkSizes() {
  const dir = join('dist', 'assets');
  return readdirSync(dir)
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => ({ file: f, gz: gzipSync(readFileSync(join(dir, f))).length }));
}

async function measure(browser, base, route) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const bytes = { js: 0, css: 0, font: 0, fontFiles: new Set(), other: 0 };
  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (!url.startsWith(base)) return;
      const body = await res.body();
      if (/\.js(\?|$)/.test(url)) bytes.js += gzipSync(body).length;
      else if (/\.css(\?|$)/.test(url)) bytes.css += gzipSync(body).length;
      else if (/\.woff2(\?|$)/.test(url)) {
        bytes.font += body.length;
        bytes.fontFiles.add(url);
      } else bytes.other += body.length;
    } catch {
      /* a response without a body (redirect, aborted) does not count */
    }
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const vitals = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
  await ctx.close();
  return {
    route,
    jsGz: bytes.js,
    cssGz: bytes.css,
    fontBytes: bytes.font,
    fontFiles: bytes.fontFiles.size,
    lcpMs: Math.round(vitals.lcp),
    cls: Math.round(vitals.cls * 1000) / 1000,
  };
}

const server = await preview({ preview: { port: 4180, strictPort: false } });
const base = (server.resolvedUrls?.local?.[0] ?? 'http://localhost:4180').replace(/\/$/, '');
const browser = await chromium.launch();
const rows = [];
try {
  for (const r of ROUTES) rows.push(await measure(browser, base, r));
} finally {
  await browser.close();
  server.httpServer.close();
}

const chunks = chunkSizes();
const biggestChunk = chunks.reduce((a, b) => (b.gz > a.gz ? b : a), { file: '', gz: 0 });
const css = chunks.filter((c) => c.file.endsWith('.css')).reduce((s, c) => s + c.gz, 0);
const current = {
  jsGzKb: Math.max(...rows.map((r) => kb(r.jsGz))),
  cssGzKb: Math.max(kb(css), ...rows.map((r) => kb(r.cssGz))),
  biggestChunkGzKb: kb(biggestChunk.gz),
  fontKb: Math.max(...rows.map((r) => kb(r.fontBytes))),
  fontFiles: Math.max(...rows.map((r) => r.fontFiles)),
  lcpMs: Math.max(...rows.map((r) => r.lcpMs)),
  cls: Math.max(...rows.map((r) => r.cls)),
};

const failures = [];
const warnings = [];
for (const [key, target] of Object.entries(budgets.targets)) {
  const value = current[key];
  const baseline = budgets.baseline?.[key];
  const allowed = baseline !== undefined && baseline > target ? Math.max(target, baseline * 1.05) : target;
  const line = `${key}: ${value} (target ${target}${baseline !== undefined ? `, baseline ${baseline}` : ''})`;
  if (value > allowed) failures.push(`${line} exceeds ${Math.round(allowed * 100) / 100}`);
  else if (value > target) warnings.push(`${line} is over target but within the baseline ratchet`);
}

const report = { date: new Date().toISOString(), current, rows, biggestChunk, failures, warnings };
writeFileSync(join(out, 'perf.json'), JSON.stringify(report, null, 2));
if (record) {
  budgets.baseline = current;
  writeFileSync(budgetsPath, JSON.stringify(budgets, null, 2) + '\n');
  console.log('baseline recorded in scripts/perf/budgets.json');
}
console.table(rows);
console.log('current', JSON.stringify(current));
for (const w of warnings) console.log('WARN', w);
for (const f of failures) console.log('FAIL', f);
console.log(failures.length ? `BUDGET FAILED (${failures.length})` : 'BUDGET OK');
process.exit(failures.length ? 1 : 0);
