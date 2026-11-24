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

const FOREX = { path: '/forex-trading-journal', label: 'Forex trading journal' };
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
    updatedAt: '2026-11-15',
  },
  {
    path: FOREX.path,
    title: 'Forex Trading Journal: MT4/MT5 Import, Sessions | TradeQut',
    description:
      `A forex trading journal: import MT4 and MT5 reports with commission and swap, tag sessions and setups, track prop accounts. ${usdMonth} a month after a free trial.`,
    label: FOREX.label,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
  },
  {
    path: '/mt5-trading-journal',
    title: 'MT5 Trading Journal: Import MetaTrader 5 History | TradeQut',
    description:
      'Save the MetaTrader 5 history report as HTML or Excel and import it: every closed position with lots, stop, target, commission and swap, ready for review.',
    label: 'MT5 trading journal',
    parent: FOREX,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-24',
  },
  {
    path: '/mt4-trading-journal',
    title: 'MT4 Trading Journal: Import MetaTrader 4 History | TradeQut',
    description:
      'Save the MetaTrader 4 Detailed Report from Account History and import it: every closed trade with lots, stop, target, commission, taxes and swap.',
    label: 'MT4 trading journal',
    parent: FOREX,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
  },
  {
    path: '/prop-firm-trading-journal',
    title: 'Prop Firm Trading Journal for Challenges | TradeQut',
    description:
      'Keep prop challenge and funded accounts apart with their status, import MT4/MT5 reports or screenshots, and see which habits take you near the limits.',
    label: 'Prop firm trading journal',
    parent: FOREX,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
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
    path: '/sebi-fo-study',
    title: 'SEBI F&O Study: How Many Traders Lose Money | TradeQut',
    description:
      'SEBI studies of individual F&O traders, FY22 to FY26: share with a net loss, losses, costs and persistence, each figure with its PDF page. Checked 15 Nov 2026.',
    label: 'SEBI F&O study',
    parent: INDIA,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
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
    updatedAt: '2026-11-24',
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
    updatedAt: '2026-11-24',
  },
  {
    path: '/dhan-trading-journal',
    title: 'Dhan Trading Journal: Import Global Transactions | TradeQut',
    description:
      'Import the Dhan Global Transaction Report into TradeQut and add what a statement cannot: setups, mistakes, broken rules and what each one cost, net of charges.',
    label: 'Dhan trading journal',
    parent: INDIA,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-24',
  },
  {
    path: '/import-trades-from-screenshot',
    title: 'Import Trades From a Screenshot Into a Journal | TradeQut',
    description:
      'No export from your broker or prop firm? Upload screenshots of the trade list: AI extraction reads the trades and you check each row before saving.',
    label: 'Import trades from a screenshot',
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-15',
  },
  {
    path: ALTERNATIVES.path,
    title: 'Trading Journal Alternatives Compared | TradeQut',
    description:
      'Sourced comparisons of Myfxbook, FX Blue, TradeZella, TraderSync, TradesViz, Tradervue and Edgewonk with TradeQut: vendor prices and where each is stronger.',
    label: ALTERNATIVES.label,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-15',
  },
  {
    path: '/alternatives/tradezella',
    title: 'TradeZella Alternative: Prices and Features | TradeQut',
    description:
      'TradeZella vs TradeQut: prices read from the vendor page on 12 Nov 2026, where TradeZella is stronger, and where TradeQut may fit better.',
    label: 'TradeZella alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-15',
  },
  {
    path: '/alternatives/tradersync',
    title: 'TraderSync Alternative: Prices and Features | TradeQut',
    description:
      'TraderSync vs TradeQut: prices read from the vendor page on 21 Nov 2026, forex and MetaTrader support, where TraderSync is stronger, and where TradeQut fits.',
    label: 'TraderSync alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-21',
  },
  {
    path: '/alternatives/tradesviz',
    title: 'TradesViz Alternative for Indian Traders | TradeQut',
    description:
      'TradesViz vs TradeQut for Indian traders: free plans, INR prices and the current promotion, Zerodha import, and where each is stronger. Checked 12 Nov 2026.',
    label: 'TradesViz alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-15',
  },
  {
    path: '/alternatives/tradervue',
    title: 'Tradervue Alternative: Prices and Features | TradeQut',
    description:
      'Tradervue vs TradeQut: prices read from the vendor page on 21 Nov 2026, where Tradervue is stronger, and where TradeQut may fit better.',
    label: 'Tradervue alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-21',
  },
  {
    path: '/alternatives/edgewonk',
    title: 'Edgewonk Alternative: Prices and Features | TradeQut',
    description:
      'Edgewonk vs TradeQut: prices read from the vendor page on 21 Nov 2026, where Edgewonk is stronger, and where TradeQut may fit better.',
    label: 'Edgewonk alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-14',
    updatedAt: '2026-11-21',
  },
  {
    path: '/alternatives/myfxbook',
    title: 'Myfxbook Alternative: A Private Forex Journal | TradeQut',
    description:
      'Myfxbook vs TradeQut: what Myfxbook offers for free (read 15 Nov 2026), where it is stronger, and when an upload-based journal with notes and rules fits better.',
    label: 'Myfxbook alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
  },
  {
    path: '/alternatives/fxblue',
    title: 'FX Blue Alternative: Journal vs Statistics | TradeQut',
    description:
      'FX Blue vs TradeQut: a free MetaTrader statistics site against a private journal with notes, rules and MT4/MT5 report import. Facts read 15 Nov 2026.',
    label: 'FX Blue alternative',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
  },
  {
    path: '/trading-journal-pricing',
    title: 'Trading Journal Pricing Compared (2026) | TradeQut',
    description:
      'TradeZella, Tradervue, TraderSync, Edgewonk, TradesViz and more: monthly and yearly list prices, free plans and trials, read from vendor pages 21 Nov 2026.',
    label: 'Trading journal pricing compared',
    parent: ALTERNATIVES,
    publishedAt: '2026-11-21',
    updatedAt: '2026-11-21',
  },
];

export function getSeoPage(path: string): SeoPageMeta {
  const page = SEO_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`unknown SEO page ${path}`);
  return page;
}
