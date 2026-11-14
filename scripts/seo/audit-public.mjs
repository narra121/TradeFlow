#!/usr/bin/env node
/**
 * Browser audit of the built public site (dist/ via `vite preview`). Per route and width it checks console errors,
 * horizontal overflow, h1 count, unnamed controls, unlabelled inputs, images without alt, text under 11px, (375px) targets
 * under 24px, and the anti-slop rules of DESIGN-ENTERPRISE 0.8 that apply to public pages: no blur or glass, no gradients,
 * radii in {0,2,4,6,pill}, at most 6 type sizes. Extra passes: keyboard focus never hidden under the sticky header
 * (WCAG 2.4.11) and a forced-colors smoke test.
 *   bun run build && node scripts/seo/audit-public.mjs --out <dir> [--routes /,/pricing] [--shots 8] [--metrics] [--report-only /login,/signup]
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { prerenderedRoutes } from './previewRouting.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const out = resolve(opt('out', 'audit-shots'));
const maxShots = Number(opt('shots', 8));
const showMetrics = args.includes('--metrics');
// Routes whose problems are printed but do not fail the run (pages owned by another worker, tracked in REQUESTS.md).
const REPORT_ONLY = new Set(opt('report-only', '').split(',').filter(Boolean));
mkdirSync(out, { recursive: true });

const sitemap = readFileSync(join('dist', 'sitemap.xml'), 'utf8');
const all = [...sitemap.matchAll(/<loc>https:\/\/tradequt\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const routes = opt('routes')
  ? opt('routes').split(',')
  : [...new Set([...all, '/login', '/signup', '/goodbye', '/status', '/security', '/no-such-page'])];
const SHOT_ROUTES = new Set(['/', '/pricing', '/trading-journal-india', '/alternatives/tradezella', '/blog/fo-trading-charges-india', '/glossary', '/resources/position-size', '/privacy', '/guide', '/no-such-page'].slice(0, maxShots));
const MAX_SIZES = 6;
const RADII_OK = new Set([0, 2, 4, 6]);
// Auth pages belong to fe-app (A.15); they are still reported but their type and radius counts do not fail the audit.
const LENIENT = new Set(['/login', '/signup']);

/* Runs in the page. */
function inspect({ narrow }) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || el.querySelector('img[alt]')?.getAttribute('alt') || '').trim();
  const problems = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > window.innerWidth + 1) problems.push(`horizontal overflow ${doc.scrollWidth}>${window.innerWidth}`);
  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) problems.push(`${h1} h1 elements`);
  for (const el of document.querySelectorAll('a[href],button,[role=tab],[role=button]')) {
    if (visible(el) && !name(el)) problems.push(`unnamed control <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 80)}`);
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
    if (!visible(el) && !el.matches('.sr-only')) continue;
    const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
    if (!labelled) problems.push(`unlabelled input ${el.outerHTML.slice(0, 80)}`);
  }
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) problems.push(`img without alt ${img.src.slice(-40)}`);

  const sizes = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let small = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || !visible(el) || el.closest('.sr-only')) continue;
    const px = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
    sizes.set(px, (sizes.get(px) ?? 0) + 1);
    if (px < 11) small++;
  }
  if (small) problems.push(`${small} text nodes under 11px`);

  let blur = 0;
  let gradient = 0;
  let pills = 0;
  const radii = new Map();
  // A computed radius can stay a percentage (Chromium 159's UA style gives radios `border-radius: 50%`): resolve it
  // against the box, so 50% of a square is the full round (a pill) and not 50 px.
  const radiusPx = (value, rect) => (value.endsWith('%') ? (parseFloat(value) / 100) * Math.min(rect.width, rect.height) : parseFloat(value));
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const round = (value) => (value.endsWith('%') && parseFloat(value) >= 50) || parseFloat(value) >= 500;
    if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.filter && /blur/.test(cs.filter))) blur++;
    if (/gradient/.test(cs.backgroundImage)) gradient++;
    // AS-3: pill shapes only for avatars, switches and status dots; a wide pill is a chip or button dressed as one.
    if (round(cs.borderTopLeftRadius) && rect.width > 40) pills++;
    for (const corner of [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius]) {
      const v = radiusPx(corner, rect);
      if (!v) continue;
      const key = v >= 999 || round(corner) ? 9999 : Math.round(v * 10) / 10;
      radii.set(key, (radii.get(key) ?? 0) + 1);
    }
  }
  if (pills) problems.push(`${pills} wide pill-shaped elements (fully round, width > 40px)`);
  if (blur) problems.push(`${blur} elements with blur or backdrop-filter`);
  if (gradient) problems.push(`${gradient} elements with a gradient background`);

  if (narrow) {
    let tiny = 0;
    for (const el of document.querySelectorAll('a[href],button,[role=tab],input:not([type=hidden]),select,textarea')) {
      if (!visible(el) || el.closest('.sr-only') || el.matches('.sr-only')) continue;
      const r = el.getBoundingClientRect();
      const inline = getComputedStyle(el).display === 'inline';
      if (!inline && (r.width < 24 || r.height < 24)) tiny++;
    }
    if (tiny) problems.push(`${tiny} targets under 24px`);
  }
  return { problems, sizes: [...sizes.keys()].sort((a, b) => a - b), radii: [...radii.keys()].sort((a, b) => a - b) };
}

/* Tab through the page; a focused element must not sit under the sticky header (WCAG 2.4.11 Focus Not Obscured: fails only when the element is entirely covered). */
async function focusObscured(page) {
  const headerBottom = await page.evaluate(() => document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
  let bad = 0;
  // Smooth scrolling would still be animating when the position is read; the rule concerns where focus ends up.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const bottom = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.closest('header') || el.matches('a[href="#main-content"]')) return null;
      return el.getBoundingClientRect().bottom;
    });
    if (bottom !== null && bottom <= headerBottom) bad++;
  }
  return bad;
}

const server = await preview({ preview: { port: 4174, strictPort: false }, plugins: [prerenderedRoutes()] });
const base = (server.resolvedUrls?.local?.[0] ?? 'http://localhost:4174').replace(/\/$/, '');
const browser = await chromium.launch();
let failures = 0;
const metrics = {};
try {
  for (const width of [1280, 375]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 } });
    for (const route of routes) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && errors.push(`console ${m.text().slice(0, 140)}`));
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
      const res = await page.evaluate(inspect, { narrow: width === 375 });
      const problems = [...errors, ...res.problems];
      const lenient = LENIENT.has(route);
      if (!lenient && res.sizes.length > MAX_SIZES) problems.push(`${res.sizes.length} type sizes (max ${MAX_SIZES}): ${res.sizes.join(', ')}`);
      const badRadii = res.radii.filter((r) => r !== 9999 && !RADII_OK.has(r));
      if (!lenient && badRadii.length) problems.push(`radii outside {0,2,4,6,pill}: ${badRadii.join(', ')}`);
      if (width === 1280 && !lenient) {
        const obscured = await focusObscured(page);
        if (obscured) problems.push(`${obscured} focus stops hidden under the sticky header`);
      }
      metrics[`${width} ${route}`] = { sizes: res.sizes, radii: res.radii };
      if (SHOT_ROUTES.has(route)) await page.screenshot({ path: join(out, `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}-${width}.png`), fullPage: true });
      if (problems.length) {
        const counted = !REPORT_ONLY.has(route);
        if (counted) failures += problems.length;
        console.log(`${width} ${route}${counted ? '' : ' (report only)'}\n  - ${problems.slice(0, 8).join('\n  - ')}`);
      }
      await page.close();
    }
    await ctx.close();
  }

  // Forced-colors smoke: the page must still render its content and controls with the OS palette.
  const fc = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: 'active', colorScheme: 'dark' });
  for (const route of routes.filter((r) => ['/', '/pricing', '/glossary'].includes(r))) {
    const page = await fc.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    const ok = await page.evaluate(() => ({ h1: !!document.querySelector('h1')?.textContent?.trim(), controls: document.querySelectorAll('a[href],button').length > 5, forced: matchMedia('(forced-colors: active)').matches }));
    if (!ok.forced || !ok.h1 || !ok.controls || errors.length) {
      failures++;
      console.log(`forced-colors ${route}: ${JSON.stringify(ok)} ${errors.join(' ')}`);
    }
    await page.close();
  }
  await fc.close();
} finally {
  await browser.close();
  server.httpServer.close();
}
if (showMetrics) writeFileSync(join(out, 'metrics.json'), JSON.stringify(metrics, null, 1));
console.log(failures ? `AUDIT FAILED: ${failures} problem(s)` : `AUDIT OK: ${routes.length} routes x 2 widths + focus + forced-colors`);
process.exit(failures ? 1 : 0);
