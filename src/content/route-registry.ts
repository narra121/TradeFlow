/**
 * The one list of public routes. Prerender, sitemap, llms.txt, the CloudFront router and the
 * dist verifier all read it (scripts/seo/*). Pure data: no React imports, so Bun scripts can load it.
 */
import { BLOG_ARTICLES } from './blog/articles';
import { CASE_STUDIES } from './case-studies/studies';
import { SEO_PAGES } from './seo-pages';

export type RouteKind =
  | 'home'
  | 'static'
  | 'legal'
  | 'auth'
  | 'hub'
  | 'blog'
  | 'guide'
  | 'seo'
  | 'resource';

export interface PublicRoute {
  path: string;
  kind: RouteKind;
  /** Short human label (breadcrumbs, llms.txt). */
  label: string;
  /** YYYY-MM-DD of the last meaningful content change. */
  lastmod: string;
  /** false = prerendered but left out of sitemap.xml (thin auth pages). */
  inSitemap: boolean;
  /** true = the page must emit `noindex` (utility pages). */
  noindex?: boolean;
  description?: string;
}

/** Paths served by the SPA shell (`/_spa.html`); never prerendered, never in the sitemap. */
export const SPA_PREFIXES = ['/app', '/auth'] as const;

export const CANONICAL_HOST = 'tradequt.com';
/** Hosts that 301 to the canonical host. */
export const REDIRECT_HOSTS = ['www.tradequt.com'] as const;

const STATIC_ROUTES: PublicRoute[] = [
  { path: '/', kind: 'home', label: 'Home', lastmod: '2026-11-15', inSitemap: true },
  { path: '/guide', kind: 'static', label: 'User guide', lastmod: '2026-11-15', inSitemap: true },
  { path: '/about', kind: 'static', label: 'About', lastmod: '2026-11-15', inSitemap: true },
  { path: '/contact', kind: 'static', label: 'Contact', lastmod: '2026-11-11', inSitemap: true },
  { path: '/privacy', kind: 'legal', label: 'Privacy policy', lastmod: '2026-11-11', inSitemap: true },
  { path: '/terms', kind: 'legal', label: 'Terms of service', lastmod: '2026-11-11', inSitemap: true },
  { path: '/refund', kind: 'legal', label: 'Refund policy', lastmod: '2026-11-11', inSitemap: true },
  { path: '/login', kind: 'auth', label: 'Log in', lastmod: '2026-11-11', inSitemap: false },
  { path: '/signup', kind: 'auth', label: 'Sign up', lastmod: '2026-11-11', inSitemap: false },
  { path: '/blog', kind: 'hub', label: 'Blog', lastmod: '2026-11-15', inSitemap: true },
  { path: '/glossary', kind: 'hub', label: 'Trading glossary', lastmod: '2026-11-11', inSitemap: true },
  { path: '/resources', kind: 'hub', label: 'Trading calculators', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/position-size', kind: 'resource', label: 'Position size calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/risk-reward', kind: 'resource', label: 'Risk-reward calculator', lastmod: '2026-11-11', inSitemap: true },
  { path: '/resources/pip-calculator', kind: 'resource', label: 'Pip value calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/forex-market-hours', kind: 'resource', label: 'Forex market hours and sessions clock', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/prop-firm-drawdown-calculator', kind: 'resource', label: 'Prop firm drawdown calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/margin-calculator', kind: 'resource', label: 'Forex margin and leverage calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/risk-of-ruin-calculator', kind: 'resource', label: 'Risk of ruin calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/compounding-calculator', kind: 'resource', label: 'Forex compounding calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/expectancy-calculator', kind: 'resource', label: 'Expectancy and break-even win rate calculator', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/fo-turnover-calculator', kind: 'resource', label: 'F&O turnover calculator for tax audit', lastmod: '2026-11-15', inSitemap: true },
  { path: '/resources/fo-charges-rates', kind: 'resource', label: 'F&O charges and STT rate history', lastmod: '2026-11-15', inSitemap: true },
  // /resources/nse-lot-size (NseLotSizePage) stays unregistered until NSE permits linking to or republishing its lot file.
  { path: '/case-studies', kind: 'hub', label: 'Journaling scenarios', lastmod: '2026-11-11', inSitemap: true },
  { path: '/changelog', kind: 'static', label: 'Changelog', lastmod: '2026-11-11', inSitemap: true },
  { path: '/goodbye', kind: 'static', label: 'Account deleted', lastmod: '2026-11-11', inSitemap: false, noindex: true },
  { path: '/status', kind: 'static', label: 'Service status', lastmod: '2026-11-11', inSitemap: false, noindex: true },
  { path: '/security', kind: 'static', label: 'Security and privacy', lastmod: '2026-11-11', inSitemap: false, noindex: true },
];

export function getPublicRoutes(): PublicRoute[] {
  const blog: PublicRoute[] = BLOG_ARTICLES.map((a) => ({
    path: `/blog/${a.slug}`,
    kind: 'blog',
    label: a.title,
    lastmod: a.updatedAt ?? a.publishedAt,
    inSitemap: true,
    description: a.description,
  }));
  const guides: PublicRoute[] = CASE_STUDIES.map((s) => ({
    path: `/case-studies/${s.slug}`,
    kind: 'guide',
    label: s.title,
    lastmod: s.updatedAt ?? s.publishedAt,
    inSitemap: true,
    description: s.description,
  }));
  const seo: PublicRoute[] = SEO_PAGES.map((p) => ({
    path: p.path,
    kind: 'seo',
    label: p.label,
    lastmod: p.updatedAt,
    inSitemap: true,
    description: p.description,
  }));
  return [...STATIC_ROUTES, ...seo, ...blog, ...guides];
}

export function isSpaPath(path: string): boolean {
  return SPA_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
