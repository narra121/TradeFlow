#!/usr/bin/env node
/**
 * Pings IndexNow (Bing and partners) with the URLs from dist/sitemap.xml whose lastmod is within --since-days.
 * Run after a production deploy: node scripts/seo/indexnow.mjs --since-days 14 [--dry-run]
 * The key is the 32-hex file name of the only public/<key>.txt; the same file is served at the site root.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--since-days') + 1] || 14);
const dryRun = args.includes('--dry-run');
const host = 'tradequt.com';

const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('no public/<32-hex>.txt IndexNow key file');
const key = keyFile.replace('.txt', '');
if (readFileSync(join('public', keyFile), 'utf8').trim() !== key) throw new Error('key file content must equal its name');

const sitemap = readFileSync(join('dist', 'sitemap.xml'), 'utf8');
const cutoff = Date.now() - days * 86_400_000;
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
  .filter((m) => new Date(`${m[2]}T00:00:00Z`).getTime() >= cutoff)
  .map((m) => m[1]);

console.log(`IndexNow: ${urls.length} URL(s) changed in the last ${days} days`);
if (dryRun || urls.length === 0) process.exit(0);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: urls.slice(0, 10_000) }),
});
console.log(`IndexNow response: ${res.status}`);
if (res.status >= 400) process.exit(1);
