import { SEO_PAGE_LOADERS, UTILITY_PAGE_LOADERS } from './routes';

/** Module loaders for public routes that App.tsx lazy-loads; the same modules, so the chunk is already cached at render. */
const PAGE_LOADERS: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/LandingPage'),
  '/about': () => import('@/pages/AboutPage'),
  '/contact': () => import('@/pages/ContactPage'),
  '/privacy': () => import('@/pages/PrivacyPolicyPage'),
  '/terms': () => import('@/pages/TermsOfServicePage'),
  '/refund': () => import('@/pages/RefundPolicyPage'),
  '/guide': () => import('@/pages/GuidePage'),
  '/blog': () => import('@/pages/blog/BlogIndexPage'),
  '/glossary': () => import('@/pages/glossary/GlossaryPage'),
  '/resources': () => import('@/pages/resources/ResourcesPage'),
  '/resources/position-size': () => import('@/pages/resources/PositionSizeCalculatorPage'),
  '/resources/risk-reward': () => import('@/pages/resources/RiskRewardCalculatorPage'),
  '/resources/pip-calculator': () => import('@/pages/resources/PipCalculatorPage'),
  '/resources/forex-market-hours': () => import('@/pages/resources/ForexMarketHoursPage'),
  '/resources/prop-firm-drawdown-calculator': () => import('@/pages/resources/PropFirmDrawdownCalculatorPage'),
  '/resources/margin-calculator': () => import('@/pages/resources/MarginCalculatorPage'),
  '/resources/risk-of-ruin-calculator': () => import('@/pages/resources/RiskOfRuinCalculatorPage'),
  '/resources/compounding-calculator': () => import('@/pages/resources/CompoundingCalculatorPage'),
  '/resources/expectancy-calculator': () => import('@/pages/resources/ExpectancyCalculatorPage'),
  '/resources/fo-turnover-calculator': () => import('@/pages/resources/FoTurnoverCalculatorPage'),
  '/resources/fo-charges-rates': () => import('@/pages/resources/FoChargesRatesPage'),
  '/case-studies': () => import('@/pages/case-studies/CaseStudiesIndexPage'),
  '/changelog': () => import('@/pages/changelog/ChangelogPage'),
  ...SEO_PAGE_LOADERS,
  ...UTILITY_PAGE_LOADERS,
};

/** Loaders for the page and, for articles and scenarios, their content chunk. Empty for any other path. The registries load lazily so they stay out of the entry chunk. */
export function routeLoaders(pathname: string): (() => Promise<unknown>)[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const blog = /^\/blog\/([^/]+)$/.exec(path);
  if (blog) {
    return [
      async () => {
        const { BLOG_ARTICLES } = await import('./blog/articles');
        await Promise.all([import('@/pages/blog/BlogArticlePage'), BLOG_ARTICLES.find((a) => a.slug === blog[1])?.content()]);
      },
    ];
  }
  const study = /^\/case-studies\/([^/]+)$/.exec(path);
  if (study) {
    return [
      async () => {
        const { CASE_STUDIES } = await import('./case-studies/studies');
        await Promise.all([import('@/pages/case-studies/CaseStudyPage'), CASE_STUDIES.find((c) => c.slug === study[1])?.content()]);
      },
    ];
  }
  const page = PAGE_LOADERS[path];
  return page ? [page] : [];
}

/**
 * Loads the chunk(s) of the page being opened so the prerendered HTML is replaced by the real page without a spinner.
 * Always resolves: a failed or slow load (over `timeoutMs`) must never keep the app from starting.
 */
export function preloadRoute(pathname: string, timeoutMs = 2500): Promise<void> {
  const loaders = routeLoaders(pathname);
  if (loaders.length === 0) return Promise.resolve();
  const loading = Promise.all(loaders.map((load) => load())).then(
    () => undefined,
    () => undefined,
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([loading, timeout]);
}
