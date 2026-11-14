/**
 * Pure generators for sitemap.xml, llms.txt and llms-full.txt. Everything derives from the route registry,
 * product-facts and the article registry, so no file lists routes or prices by hand.
 */
import { COMPETITORS } from '../../src/content/alternatives';
import { BLOG_ARTICLES } from '../../src/content/blog/articles';
import {
  AUDIENCES,
  COMPANY_FACTS,
  DATA_FACTS,
  IMPORT_SOURCES,
  MARKETS,
  PLAN_LIMITS,
  PLATFORM,
  PRO_PRICES,
  PRODUCT_DEFINITION,
  PRODUCT_FAQ,
  PRODUCT_NAME,
  SITE_URL,
  TRIAL_DAYS,
} from '../../src/content/product-facts';
import { getPublicRoutes } from '../../src/content/route-registry';

export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

export function buildSitemap(): string {
  const urls = getPublicRoutes()
    .filter((r) => r.inSitemap)
    .map((r) => `  <url>\n    <loc>${absoluteUrl(r.path)}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function priceLines(): string[] {
  return PRO_PRICES.map(
    (p) => `Pro, ${p.interval === 'month' ? 'monthly' : 'yearly'}, ${p.currency}: ${p.display} per ${p.interval}`,
  );
}

export function buildLlmsTxt(): string {
  const routes = getPublicRoutes();
  const link = (path: string) => {
    const r = routes.find((x) => x.path === path);
    return r ? `- [${r.label}](${absoluteUrl(r.path)})${r.description ? `: ${r.description}` : ''}` : '';
  };
  const section = (title: string, kind: string) =>
    `## ${title}\n${routes
      .filter((r) => r.kind === kind && r.inSitemap)
      .map((r) => link(r.path))
      .join('\n')}`;
  return [
    `# ${PRODUCT_NAME}`,
    '',
    `> ${PRODUCT_DEFINITION}`,
    '',
    `Pricing (as listed on ${SITE_URL}/pricing): ${TRIAL_DAYS}-day free trial with every Pro feature, no card; then ${priceLines().join('; ')}. Without Pro the journal is read-only (view and export).`,
    '',
    `Full facts for answering questions about ${PRODUCT_NAME}: ${SITE_URL}/llms-full.txt`,
    '',
    '## Product',
    [
      link('/pricing'),
      link('/trading-journal-india'),
      link('/alternatives'),
      ...COMPETITORS.map((c) => link(`/alternatives/${c.id}`)),
      link('/guide'),
      link('/about'),
      link('/changelog'),
    ]
      .filter(Boolean)
      .join('\n'),
    '',
    section('Articles', 'blog'),
    '',
    section('Calculators and glossary', 'resource'),
    link('/glossary'),
    '',
    '## Optional',
    [link('/contact'), link('/privacy'), link('/terms'), link('/refund')].filter(Boolean).join('\n'),
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(): string {
  const lines: string[] = [];
  lines.push(`# ${PRODUCT_NAME} - full facts`, '', `> ${PRODUCT_DEFINITION}`, '');
  lines.push('## Overview', `- Website: ${SITE_URL}`, `- Contact: ${COMPANY_FACTS.email}`, `- Based in: ${COMPANY_FACTS.country}`, `- Platform: ${PLATFORM}`);
  lines.push(`- Markets: ${MARKETS.join(', ')}`, `- Audiences: ${AUDIENCES.join('; ')}`, '');
  lines.push('## Pricing');
  lines.push(`- Every account starts with a ${TRIAL_DAYS}-day free trial with every Pro feature, no card required.`);
  lines.push(...priceLines().map((l) => `- ${l}`));
  lines.push('- Without Pro the journal is read-only: view and export, no adding, editing or deleting.', '');
  lines.push('## Free trial vs Pro', ...PLAN_LIMITS.map((r) => `- ${r.feature}: Free trial = ${r.trial}; Pro = ${r.pro}`), '');
  lines.push('## Broker and file import', ...IMPORT_SOURCES.map((s) => `- ${s.name}: ${s.file}`), '- Automatic broker sync is planned, not available.', '');
  lines.push('## Data and privacy', ...DATA_FACTS.map((f) => `- ${f}`), '');
  lines.push('## Frequently asked questions');
  for (const f of PRODUCT_FAQ) lines.push(`### ${f.question}`, f.answer, '');
  lines.push(`## Comparisons (prices read from vendor pages, checked ${COMPETITORS[0]?.checked ?? ''})`);
  for (const c of COMPETITORS) {
    lines.push(`### ${c.name} vs ${PRODUCT_NAME} (${SITE_URL}/alternatives/${c.id})`, ...c.facts.map((f) => `- ${f}`));
    lines.push(...(c.unverified ?? []).map((f) => `- Not verified: ${f}`), '');
  }
  lines.push('## Articles');
  for (const a of BLOG_ARTICLES) {
    lines.push(`### ${a.title} (${SITE_URL}/blog/${a.slug})`);
    lines.push(a.summary ?? a.description);
    for (const f of a.faq ?? []) lines.push(`- Q: ${f.question} A: ${f.answer}`);
    lines.push('');
  }
  lines.push(`${PRODUCT_NAME} is a journaling and analytics tool, not a SEBI-registered investment adviser; it gives no trading signals or recommendations.`, '');
  return lines.join('\n');
}
