#!/usr/bin/env node
/**
 * Recaptures the screenshots used by /guide (public/guide/*.png) from the running app, signed in as the dev QA user.
 *
 *   node scripts/guide/capture.mjs --qa <dev-qa.json> [--base http://localhost:8095] [--only dashboard,tradelog-table]
 *
 * `--qa` points at a JSON file with { email, passwordFile }; the password is read from that file and never printed.
 * Without --base it starts `vite` on port 8095 (dev API from .env.development.local). Viewport 1440x900, dark theme.
 * Screens that need a state (a trade pane, a menu) do the clicking themselves and skip with a warning if the control is absent.
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const qaPath = opt('qa');
if (!qaPath) throw new Error('--qa <dev-qa.json> is required');
const qa = JSON.parse(readFileSync(resolve(qaPath), 'utf8'));
const password = readFileSync(resolve(dirname(resolve(qaPath)), qa.passwordFile), 'utf8').trim();
const only = opt('only') ? new Set(opt('only').split(',')) : null;
const outDir = resolve('public/guide');
mkdirSync(outDir, { recursive: true });

let server;
let base = opt('base');
if (!base) {
  base = 'http://localhost:8095';
  server = spawn('bunx vite --port 8095 --strictPort', { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 90; i++) {
    const up = await fetch(base).then((r) => r.ok, () => false);
    if (up) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** Selects the FTMO account in the scope bar dialog so single-currency figures and curves are shown. */
async function pickAccount(page) {
  const all = page.locator('button', { hasText: 'All accounts' }).first();
  if (!(await all.isVisible().catch(() => false))) return; // the scope is remembered: an account is already selected
  await all.click({ timeout: 4000 });
  await page.locator('[role=dialog]').getByText(/FTMO/).first().click({ timeout: 4000 });
}

/** [file, route, optional action(page)] */
const SHOTS = [
  ['dashboard', '/app/dashboard', pickAccount],
  ['sidebar', '/app/dashboard'],
  ['tradelog-table', '/app/tradelog'],
  ['column-toggle', '/app/tradelog', async (p) => p.getByRole('button', { name: /columns/i }).first().click({ timeout: 4000 })],
  ['add-trade', '/app/tradelog?trade=new'],
  ['add-trade-context', '/app/tradelog?trade=new', async (p) => p.getByRole('button', { name: /context|more details|notes/i }).first().click({ timeout: 4000 })],
  ['view-trade', '/app/tradelog', async (p) => p.locator('tbody tr').filter({ has: p.locator('[role=checkbox],input[type=checkbox]') }).first().locator('td').nth(3).click({ timeout: 4000 })],
  ['tradelog-calendar', '/app/calendar', pickAccount],
  ['analytics-metrics', '/app/analytics', pickAccount],
  ['analytics-charts', '/app/analytics', async (p) => { await pickAccount(p); await p.evaluate(() => window.scrollBy(0, 600)); }],
  ['analytics-insights', '/app/insights'],
  ['goals-weekly', '/app/goals'],
  ['goals-rules', '/app/goals', async (p) => p.evaluate(() => window.scrollBy(0, 700))],
  ['accounts', '/app/accounts'],
  ['import-trades', '/app/import'],
  ['settings', '/app/settings'],
  ['profile', '/app/settings/profile'],
];

/** Waits until no loading spinner is on screen, then a beat for animations. */
async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('.animate-spin, [aria-busy="true"]'), undefined, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  // The dev API throttles repeated logins, so retry with a pause instead of failing the run.
  let signedIn = false;
  for (let attempt = 1; attempt <= 5 && !signedIn; attempt++) {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', qa.email);
    await page.fill('input[type=password]', password);
    await page.click('button[type=submit]');
    signedIn = await page.waitForURL(/\/app\//, { timeout: 30000 }).then(() => true, () => false);
    if (!signedIn) {
      console.warn(`login attempt ${attempt} failed; waiting before retrying`);
      await page.waitForTimeout(60000);
    }
  }
  if (!signedIn) throw new Error('could not sign in to the dev app');

  let saved = 0;
  for (const [file, route, action] of SHOTS) {
    if (only && !only.has(file)) continue;
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await settle(page);
    if (action) {
      try {
        await action(page);
        await settle(page);
      } catch {
        console.warn(`skip ${file}: control not found`);
        continue;
      }
    }
    await page.screenshot({ path: join(outDir, `${file}.png`), type: 'png' });
    saved++;
    console.log(`saved ${file}.png`);
  }
  console.log(`${saved} screenshots saved to public/guide; page errors: ${errors.length}`);
} finally {
  await browser.close();
  if (server) spawnSync(`taskkill /pid ${server.pid} /T /F`, { shell: true, stdio: 'ignore' });
}
