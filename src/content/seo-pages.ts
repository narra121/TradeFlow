/** Metadata for the stand-alone SEO pages rendered from src/pages/seo (routes wired via src/content/routes.ts). */
export interface SeoPageMeta {
  path: string;
  title: string;
  description: string;
  /** Breadcrumb / llms.txt label. */
  label: string;
  publishedAt: string;
  updatedAt: string;
}

export const SEO_PAGES: SeoPageMeta[] = [
  {
    path: '/pricing',
    title: 'TradeQut Pricing: Free Plan, Pro at $9.99 or ₹199 a Month',
    description:
      'Free trading journal plan and Pro at $9.99/month or $79/year (₹199/month or ₹1,499/year in India). 14-day Pro trial, no card. Trial, currency and cancel FAQ.',
    label: 'Pricing',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
  {
    path: '/trading-journal-india',
    title: 'F&O Trading Journal for India: Zerodha, Dhan, Upstox | TradeQut',
    description:
      'Import Zerodha, Dhan, Upstox, Angel One and Groww trade files, get estimated charges per trade at the rates of the trade date, and see what broken rules cost.',
    label: 'Trading journal for India',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
  {
    path: '/alternatives',
    title: 'Trading Journal Alternatives: TradeZella, TraderSync, TradesViz',
    description:
      'Sourced comparisons of TradeZella, TraderSync and TradesViz with TradeQut: prices read from vendor pages on 12 Nov 2026 and where each one is stronger.',
    label: 'Alternatives',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
  {
    path: '/alternatives/tradezella',
    title: 'TradeZella Alternative: Pricing and Features Compared | TradeQut',
    description:
      'TradeZella vs TradeQut: prices read from the vendor page on 12 Nov 2026, where TradeZella is stronger, and where TradeQut may fit better.',
    label: 'TradeZella alternative',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
  {
    path: '/alternatives/tradersync',
    title: 'TraderSync Alternative: Verified Facts Compared | TradeQut',
    description:
      'TraderSync vs TradeQut: a fair comparison that states which TraderSync facts we verified, where it is stronger, and where TradeQut may fit better.',
    label: 'TraderSync alternative',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
  {
    path: '/alternatives/tradesviz',
    title: 'TradesViz Alternative for Indian Traders: Compared | TradeQut',
    description:
      'TradesViz vs TradeQut for Indian traders: free plans, INR prices and the current promotion, Zerodha import, and where each is stronger. Checked 12 Nov 2026.',
    label: 'TradesViz alternative',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-12',
  },
];

export function getSeoPage(path: string): SeoPageMeta {
  const page = SEO_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`unknown SEO page ${path}`);
  return page;
}
