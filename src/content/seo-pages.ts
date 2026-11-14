import { proPrice } from './product-facts';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Metadata for the stand-alone SEO pages rendered from src/pages/seo (routes wired via src/content/routes.ts). */
export interface SeoPageMeta {
  path: string;
  title: string;
  description: string;
  /** Breadcrumb / llms.txt label. */
  label: string;
  /** The hub this page sits under in the breadcrumb trail (path and label of another SEO page); absent = directly under Home. */
  parent?: { path: string; label: string };
  publishedAt: string;
  updatedAt: string;
}

const INDIA = { path: '/trading-journal-india', label: 'Trading journal for India' };
const ALTERNATIVES = { path: '/alternatives', label: 'Alternatives' };

export const SEO_PAGES: SeoPageMeta[] = [
  {
    path: '/pricing',
    title: `TradeQut Pricing: Free Trial, then ${usdMonth} or ${inrMonth} a Month`,
    description:
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${usdYear}/year (${inrMonth}/month or ${inrYear}/year in India). Currency and cancel FAQ.`,
    label: 'Pricing',
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: INDIA.path,
    title: 'Trading Journal for India: F&O, Zerodha Import | TradeQut',
    description:
      `A trading journal for Indian traders: import Zerodha, Dhan, Upstox, Angel One and Groww files, see P&L after estimated charges, track rules. ${inrMonth} a month.`,
    label: INDIA.label,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: '/fo-trading-journal',
    title: 'F&O Trading Journal for Nifty and Bank Nifty | TradeQut',
    description:
      'An F&O and options journal for India: strike and expiry from your broker file, estimated STT and charges per trade, results by calls, puts and expiry day.',
    label: 'F&O trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/zerodha-trading-journal',
    title: 'Zerodha Trading Journal: Analyse Your Tradebook | TradeQut',
    description:
      'Upload your Zerodha Console tradebook (CSV or XLSX): every trade with estimated charges, net P&L by strategy, weekday and hour, and the cost of broken rules.',
    label: 'Zerodha trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/upstox-trading-journal',
    title: 'Upstox Trading Journal: Import Your Trade Report | TradeQut',
    description:
      'Import the Upstox trade report into TradeQut: executions paired into trades, charges estimated per trade, net P&L by strategy, weekday, hour and broken rule.',
    label: 'Upstox trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/groww-trading-journal',
    title: 'Groww Trading Journal: Import Your Order History | TradeQut',
    description:
      'Import the Groww order history (stocks or F&O) into TradeQut: executed orders become trades with estimated charges; analytics show what makes or loses money.',
    label: 'Groww trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/angel-one-trading-journal',
    title: 'Angel One Trading Journal: Import Trade History | TradeQut',
    description:
      'Import the Angel One trade history into TradeQut: executions paired into trades, charges estimated per trade, net P&L by strategy, weekday, hour and mistake.',
    label: 'Angel One trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/dhan-trading-journal',
    title: 'Dhan Trading Journal: Import Your Trade History | TradeQut',
    description:
      'Import the Dhan trade history into TradeQut and add what a statement cannot: setups, mistakes, the rules you broke and what each one cost, net of charges.',
    label: 'Dhan trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/import-trades-from-screenshot',
    title: 'Import Trades From a Screenshot Into a Journal | TradeQut',
    description:
      'No export from your broker or prop firm? Upload screenshots of the trade list: AI extraction reads the trades and you check each row before saving.',
    label: 'Import trades from a screenshot',
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: ALTERNATIVES.path,
    title: 'Trading Journal Alternatives Compared | TradeQut',
    description:
      'Sourced comparisons of TradeZella, TraderSync, TradesViz, Tradervue and Edgewonk with TradeQut: prices read from vendor pages and where each one is stronger.',
    label: ALTERNATIVES.label,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: '/alternatives/tradezella',
    title: 'TradeZella Alternative: Prices and Features | TradeQut',
    description:
      'TradeZella vs TradeQut: prices read from the vendor page on 12 Nov 2026, where TradeZella is stronger, and where TradeQut may fit better.',
    label: 'TradeZella alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: '/alternatives/tradersync',
    title: 'TraderSync Alternative: Verified Facts Compared | TradeQut',
    description:
      'TraderSync vs TradeQut: a fair comparison that states which TraderSync facts we verified, where it is stronger, and where TradeQut may fit better.',
    label: 'TraderSync alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: '/alternatives/tradesviz',
    title: 'TradesViz Alternative for Indian Traders | TradeQut',
    description:
      'TradesViz vs TradeQut for Indian traders: free plans, INR prices and the current promotion, Zerodha import, and where each is stronger. Checked 12 Nov 2026.',
    label: 'TradesViz alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
  },
  {
    path: '/alternatives/tradervue',
    title: 'Tradervue Alternative: Prices and Features | TradeQut',
    description:
      'Tradervue vs TradeQut: prices read from the vendor page on 14 Nov 2026, where Tradervue is stronger, and where TradeQut may fit better.',
    label: 'Tradervue alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
  {
    path: '/alternatives/edgewonk',
    title: 'Edgewonk Alternative: Prices and Features | TradeQut',
    description:
      'Edgewonk vs TradeQut: prices read from the vendor page on 14 Nov 2026, where Edgewonk is stronger, and where TradeQut may fit better.',
    label: 'Edgewonk alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-14',
  },
];

export function getSeoPage(path: string): SeoPageMeta {
  const page = SEO_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`unknown SEO page ${path}`);
  return page;
}
