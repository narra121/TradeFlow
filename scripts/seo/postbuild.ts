/**
 * Runs after prerender: writes sitemap.xml, llms.txt and llms-full.txt into dist, verifies every prerendered
 * route (own title, self-canonical, description, JSON-LD, robots) and fails the build on any violation.
 * Usage: bun scripts/seo/postbuild.ts [--mode development]
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPublicRoutes } from '../../src/content/route-registry';
import { absoluteUrl, buildLlmsFullTxt, buildLlmsTxt, buildSitemap } from './generators';

const dist = resolve(process.cwd(), 'dist');
const development = process.argv.includes('--mode') && process.argv[process.argv.indexOf('--mode') + 1] === 'development';

export function verifyHtml(path: string, html: string, titles: Map<string, string>, expectIndex: boolean, allowNoindex = false): string[] {
  const errors: string[] = [];
  const where = path || '/';
  const titleTags = html.match(/<title[^>]*>[^<]*<\/title>/g) ?? [];
  if (titleTags.length !== 1) errors.push(`${where}: ${titleTags.length} <title> tags`);
  const title = (titleTags[0] ?? '').replace(/<[^>]+>/g, '').trim();
  if (!title) errors.push(`${where}: empty title`);
  else if (titles.has(title)) errors.push(`${where}: title duplicates ${titles.get(title)}`);
  else titles.set(title, where);

  const canonical = absoluteUrl(path);
  const canonicalOk = new RegExp(`<link[^>]+rel="canonical"[^>]+href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html);
  if (!canonicalOk) errors.push(`${where}: canonical is not ${canonical}`);
  if (!/<meta[^>]+name="description"[^>]+content="[^"]{20,}"/.test(html)) errors.push(`${where}: missing or short meta description`);

  const authPage = path === '/login' || path === '/signup';
  const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0 && !authPage) errors.push(`${where}: no JSON-LD`);
  for (const b of blocks) {
    try {
      JSON.parse(b[1]);
    } catch {
      errors.push(`${where}: unparseable JSON-LD`);
    }
  }
  const robots = /<meta[^>]+name="robots"[^>]+content="([^"]*)"/.exec(html)?.[1] ?? '';
  const noindex = /noindex/.test(robots);
  if (expectIndex && !authPage && !allowNoindex && noindex) errors.push(`${where}: robots is "${robots}" in a production build`);
  if (!expectIndex && !noindex) errors.push(`${where}: development build must be noindex, got "${robots}"`);
  return errors;
}

function main() {
  const routes = getPublicRoutes();
  writeFileSync(resolve(dist, 'sitemap.xml'), buildSitemap(), 'utf8');
  writeFileSync(resolve(dist, 'llms.txt'), buildLlmsTxt(), 'utf8');
  writeFileSync(resolve(dist, 'llms-full.txt'), buildLlmsFullTxt(), 'utf8');

  const errors: string[] = [];
  const titles = new Map<string, string>();
  for (const r of routes) {
    const file = resolve(dist, r.path === '/' ? 'index.html' : `.${r.path}/index.html`);
    if (!existsSync(file)) {
      errors.push(`${r.path}: no prerendered HTML at ${file}`);
      continue;
    }
    errors.push(...verifyHtml(r.path, readFileSync(file, 'utf8'), titles, !development, r.noindex === true));
  }
  if (!existsSync(resolve(dist, '_spa.html'))) errors.push('dist/_spa.html missing (SPA shell for /app and 404s)');
  const robotsFile = resolve(dist, 'robots.txt');
  const robotsTxt = existsSync(robotsFile) ? readFileSync(robotsFile, 'utf8') : '';
  if (!/Sitemap:\s*https:\/\/tradequt\.com\/sitemap\.xml/.test(robotsTxt) || !/Disallow:\s*\/app/.test(robotsTxt)) {
    errors.push('robots.txt lacks the Sitemap line or Disallow: /app/');
  }

  rmSync(resolve(dist, '_seo'), { recursive: true, force: true });
  if (errors.length) {
    console.error(`verify-dist FAILED (${errors.length}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    process.exit(1);
  }
  const indexed = routes.filter((r) => r.inSitemap).length;
  console.log(`verify-dist OK: ${routes.length} routes prerendered, ${indexed} in sitemap, mode=${development ? 'development' : 'production'}`);
}

// Run only when executed as a script, not when the tests import verifyHtml.
if (/postbuild\.[cm]?[tj]s$/.test((process.argv[1] ?? '').replace(/\\/g, '/'))) main();
