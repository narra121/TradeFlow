import type { ComponentType } from 'react';
import { lazyPage, type LazyPage } from './lazyPage';

type Loader = () => Promise<{ default: ComponentType }>;

/** Loaders for the stand-alone SEO pages; shared by the router (below) and the first-paint preloader. */
export const SEO_PAGE_LOADERS: Record<string, Loader> = {
  '/pricing': () => import('@/pages/seo/PricingPage'),
  '/forex-trading-journal': () => import('@/pages/seo/ForexTradingJournalPage'),
  '/mt5-trading-journal': () => import('@/pages/seo/Mt5TradingJournalPage'),
  '/mt4-trading-journal': () => import('@/pages/seo/Mt4TradingJournalPage'),
  '/prop-firm-trading-journal': () => import('@/pages/seo/PropFirmTradingJournalPage'),
  '/trading-journal-india': () => import('@/pages/seo/TradingJournalIndiaPage'),
  '/fo-trading-journal': () => import('@/pages/seo/FoTradingJournalPage'),
  '/sebi-fo-study': () => import('@/pages/seo/SebiFoStudyPage'),
  '/zerodha-trading-journal': () => import('@/pages/seo/ZerodhaTradingJournalPage'),
  '/upstox-trading-journal': () => import('@/pages/seo/UpstoxTradingJournalPage'),
  '/groww-trading-journal': () => import('@/pages/seo/GrowwTradingJournalPage'),
  '/angel-one-trading-journal': () => import('@/pages/seo/AngelOneTradingJournalPage'),
  '/dhan-trading-journal': () => import('@/pages/seo/DhanTradingJournalPage'),
  '/import-trades-from-screenshot': () => import('@/pages/seo/ScreenshotImportPage'),
  '/alternatives': () => import('@/pages/seo/AlternativesIndexPage'),
  '/alternatives/tradezella': () => import('@/pages/seo/TradeZellaAlternativePage'),
  '/alternatives/tradersync': () => import('@/pages/seo/TraderSyncAlternativePage'),
  '/alternatives/tradesviz': () => import('@/pages/seo/TradesVizAlternativePage'),
  '/alternatives/tradervue': () => import('@/pages/seo/TradervueAlternativePage'),
  '/alternatives/edgewonk': () => import('@/pages/seo/EdgewonkAlternativePage'),
  '/alternatives/myfxbook': () => import('@/pages/seo/MyfxbookAlternativePage'),
  '/alternatives/fxblue': () => import('@/pages/seo/FxBlueAlternativePage'),
  '/trading-journal-pricing': () => import('@/pages/seo/JournalPricingPage'),
};

/** Utility pages: in the route registry (prerendered) but never in SEO_PAGES or the sitemap. */
export const UTILITY_PAGE_LOADERS: Record<string, Loader> = {
  '/goodbye': () => import('@/pages/seo/GoodbyePage'),
  '/security': () => import('@/pages/seo/SecurityPage'),
  '/status': () => import('@/pages/seo/StatusPage'),
};

/** Routes for the SEO and utility pages. SEO paths must match SEO_PAGES in ./seo-pages (enforced by route-registry.test.ts). */
export const CONTENT_ROUTES: { path: string; Component: LazyPage }[] = Object.entries({
  ...SEO_PAGE_LOADERS,
  ...UTILITY_PAGE_LOADERS,
}).map(([path, load]) => ({ path, Component: lazyPage(load) }));
