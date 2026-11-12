import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

/** Loaders for the stand-alone SEO pages; shared by the router (below) and the first-paint preloader. */
export const SEO_PAGE_LOADERS: Record<string, Loader> = {
  '/pricing': () => import('@/pages/seo/PricingPage'),
  '/trading-journal-india': () => import('@/pages/seo/TradingJournalIndiaPage'),
  '/alternatives': () => import('@/pages/seo/AlternativesIndexPage'),
  '/alternatives/tradezella': () => import('@/pages/seo/TradeZellaAlternativePage'),
  '/alternatives/tradersync': () => import('@/pages/seo/TraderSyncAlternativePage'),
  '/alternatives/tradesviz': () => import('@/pages/seo/TradesVizAlternativePage'),
};

/** Utility pages: in the route registry (prerendered) but never in SEO_PAGES or the sitemap. */
export const UTILITY_PAGE_LOADERS: Record<string, Loader> = {
  '/goodbye': () => import('@/pages/seo/GoodbyePage'),
  '/security': () => import('@/pages/seo/SecurityPage'),
  '/status': () => import('@/pages/seo/StatusPage'),
};

/** Routes for the SEO and utility pages. SEO paths must match SEO_PAGES in ./seo-pages (enforced by route-registry.test.ts). */
export const CONTENT_ROUTES: { path: string; Component: LazyExoticComponent<ComponentType> }[] = Object.entries({
  ...SEO_PAGE_LOADERS,
  ...UTILITY_PAGE_LOADERS,
}).map(([path, load]) => ({ path, Component: lazy(load) }));
