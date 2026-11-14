import { proPrice, type FaqItem } from './product-facts';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Competitor facts for the /alternatives pages. Every fact carries its source; re-check `checked` monthly. */
export interface Competitor {
  id: 'tradezella' | 'tradersync' | 'tradesviz' | 'tradervue' | 'edgewonk';
  name: string;
  /** YYYY-MM-DD the vendor pages below were read. */
  checked: string;
  pricingUrl: string;
  /** One-line neutral description. */
  summary: string;
  /** Cells of the side-by-side table, as read from the vendor page (or stated as not verified). */
  table: { free: string; price: string; connection: string };
  /** Verified facts from the vendor's own pages, in plain words. */
  facts: string[];
  /** Where this product is stronger than TradeQut today. */
  strongerAt: string[];
  /** Where TradeQut may suit better. */
  tradequtFits: string[];
  /** Facts not verified from the vendor's page, stated as such. */
  unverified?: string[];
  /** Other pages a fact above was read from (beside the pricing page). */
  extraSources?: { label: string; url: string; checked: string }[];
  faq: FaqItem[];
}

export const COMPETITORS: Competitor[] = [
  {
    id: 'tradezella',
    name: 'TradeZella',
    checked: '2026-11-12',
    pricingUrl: 'https://www.tradezella.com/pricing',
    summary: 'A US-focused trading journal with broker auto-sync, in three paid tiers.',
    table: { free: 'None advertised', price: 'From $35/month', connection: 'Automatic sync' },
    facts: [
      'Paid plans only: Essential $35/month ($26/month billed $315 a year), Pro $59/month ($44/month billed $531 a year), Ultra $99/month ($74/month billed $891 a year).',
      'The pricing page advertises no free plan and no free trial.',
      'Every plan lists "500+ broker and prop firm integrations", with trade import by auto-sync, upload or manual entry.',
      'Connected accounts: 1 active account on Essential, up to 50 on Pro, unlimited on Ultra.',
    ],
    strongerAt: [
      'Automatic broker sync across a very large list of brokers; TradeQut imports files today and automatic sync is planned.',
      'A broader product with higher tiers for heavy users.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${inrMonth}/month rather than $35 and up.`,
      'Pricing in INR, and import of Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.',
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    faq: [
      {
        question: 'Is TradeQut cheaper than TradeZella?',
        answer:
          `On list prices checked on 12 November 2026, yes: TradeQut Pro is ${usdMonth}/month or ${usdYear}/year, after a 14-day free trial. TradeZella lists Essential at $35/month ($26/month billed yearly) and no free plan. TradeZella offers automatic broker sync that TradeQut does not have yet.`,
      },
      {
        question: 'Does TradeQut sync automatically with my broker like TradeZella?',
        answer:
          'No. TradeQut imports trade files from Zerodha, Dhan, Upstox, Angel One, Groww, MetaTrader 4/5 and generic CSV. Automatic sync is planned, not available.',
      },
    ],
  },
  {
    id: 'tradersync',
    name: 'TraderSync',
    checked: '2026-11-12',
    pricingUrl: 'https://tradersync.com/pricing/',
    summary: 'A US-focused trading journal with broker sync and trade analytics.',
    table: { free: 'Not verified', price: 'Not verified (a third-party guide lists from $29.95/month)', connection: 'See vendor page' },
    facts: ['TraderSync positions itself as a trading journal with automatic broker import and analytics.'],
    strongerAt: [
      'Automatic broker import and a long-established analytics suite.',
      'A larger user base and a longer track record than TradeQut.',
    ],
    tradequtFits: [
      'A 14-day free trial with every Pro feature, and INR pricing.',
      'File import designed around Indian broker reports, with estimated charges per trade.',
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    extraSources: [
      {
        label: 'Day Trading Toolkit: TraderSync pricing explained (third party, updated 27 Sep 2026)',
        url: 'https://daytradingtoolkit.com/trading-tools-tutorials/tradersync-pricing-explained',
        checked: '2026-11-12',
      },
    ],
    unverified: [
      "TraderSync's own pricing page returned HTTP 403 to automated access on 11 and 12 November 2026, so its current prices, trial terms and plan limits are not verified from the vendor. Check https://tradersync.com/pricing/ before comparing.",
      'A third-party guide (daytradingtoolkit.com, updated 27 September 2026, read 12 November 2026) lists Pro at $29.95/month, Premium at $49.95/month and Elite at $79.95/month, with a 7-day trial on every paid tier. These figures are not confirmed by TraderSync.',
    ],
    faq: [
      {
        question: 'What does TraderSync cost?',
        answer:
          `TraderSync's own pricing page could not be read automatically on 12 November 2026. A third-party guide updated in September 2026 lists $29.95, $49.95 and $79.95 a month for its three plans; check tradersync.com/pricing for the current figures. TradeQut Pro is ${usdMonth}/month or ${usdYear}/year, after a 14-day free trial.`,
      },
    ],
  },
  {
    id: 'tradesviz',
    name: 'TradesViz',
    checked: '2026-11-12',
    pricingUrl: 'https://www.tradesviz.com/pricing/',
    summary: 'A feature-rich trading journal with a free plan and India listed as a supported market.',
    table: { free: 'Free plan (stocks only, 1 account)', price: 'From ₹1,400/month (₹980 in the promotion to 30 Nov 2026)', connection: 'See vendor page' },
    facts: [
      'A free plan ("Basic", free forever, no card): 3,000 executions per month, 1 trading account, stocks only, P&L-only calendar data.',
      'Paid plans on the INR price list: Pro ₹1,400/month (₹1,050/month billed yearly) and Platinum ₹2,300/month (₹1,708.33/month billed yearly), each with a 7-day free trial.',
      'On 12 November 2026 the page showed a 30% promotion (code TVBF26, 12 to 30 November 2026): Pro ₹980/month or ₹735/month billed yearly, Platinum ₹1,610/month or ₹1,195.83/month billed yearly.',
      'India is listed among supported markets, and a TradesViz help page describes importing the Zerodha tradebook CSV for stocks and F&O, with re-imports not duplicating data.',
    ],
    strongerAt: [
      'Depth: charting, many broker importers and a mature analytics suite.',
      'A free plan with a high monthly execution limit.',
      'Paid plans add options, futures, forex, crypto and CFDs; the free plan is stocks only.',
    ],
    tradequtFits: [
      'A smaller, simpler journal built around rules and review habits.',
      'A 14-day free trial with every Pro feature: unlimited accounts and manual trades, every asset class.',
      'Estimated Indian charges on imported trades, and the cost of each broken rule.',
      `Pro at ${inrMonth}/month or ${inrYear}/year.`,
    ],
    faq: [
      {
        question: 'How does TradesViz compare with TradeQut for Indian traders?',
        answer:
          `TradesViz is the more established product: it supports Zerodha tradebook import today and has a free plan with 3,000 executions a month. TradeQut is smaller and simpler, with rule tracking and lower Pro pricing (${inrMonth}/month or ${inrYear}/year). Try the TradesViz free plan and the TradeQut free trial with your own tradebook.`,
      },
    ],
  },
  {
    id: 'tradervue',
    name: 'Tradervue',
    checked: '2026-11-14',
    pricingUrl: 'https://www.tradervue.com/site/pricing',
    summary: 'A long-running trading journal with broker sync, a free sign-up and two paid plans.',
    table: { free: 'Free sign-up offered; its limits are not verified', price: 'Silver $29.95/month, Gold $49.95/month', connection: 'Broker sync and trade import' },
    facts: [
      'Paid plans on the pricing page: Silver $29.95/month and Gold $49.95/month; Gold is labelled "Most popular".',
      'Both paid plans list unlimited trade imports and broker sync.',
      'New users can start a trial of Silver or Gold; the page says the card is charged when the trial ends unless you switch to a free plan first.',
    ],
    strongerAt: [
      'Broker sync and imports from many brokers; TradeQut imports files today and automatic sync is planned.',
      'A longer track record and a larger user base than TradeQut.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${inrMonth}/month.`,
      'Pricing in INR, and import of Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.',
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    unverified: [
      'The pricing page read on 14 November 2026 does not describe the limits of the free plan, so they are not verified here. Check https://www.tradervue.com/site/pricing before comparing.',
    ],
    faq: [
      {
        question: 'Is TradeQut cheaper than Tradervue?',
        answer:
          `On list prices checked on 14 November 2026, TradeQut Pro is ${usdMonth}/month or ${usdYear}/year after a 14-day free trial. Tradervue lists Silver at $29.95/month and Gold at $49.95/month, and offers a free sign-up whose limits we did not verify. Tradervue has broker sync, which TradeQut does not have yet.`,
      },
      {
        question: 'Can I move my trades from Tradervue to TradeQut?',
        answer:
          'If you can export your trades as a CSV or Excel file, the TradeQut generic import lets you match your columns to the trade fields and review every row before saving. We have not verified which export options Tradervue offers on each plan.',
      },
    ],
  },
  {
    id: 'edgewonk',
    name: 'Edgewonk',
    checked: '2026-11-14',
    pricingUrl: 'https://edgewonk.com/pricing',
    summary: 'A trading journal sold as one plan with every feature, billed yearly or monthly.',
    table: { free: 'No free plan or trial on the pricing page; 14-day money-back guarantee', price: '$197 a year or $35 a month', connection: 'Automated trade imports (see vendor page)' },
    facts: [
      'One plan with full access to all features: $197 billed every 12 months, or $35 billed every month, with VAT calculated at checkout.',
      'A 14-day money-back guarantee. The pricing page mentions no free plan and no free trial.',
      'The page lists automated trade imports and unlimited trade imports.',
      'On 14 November 2026 the page advertised a limited-time offer of four extra months.',
    ],
    strongerAt: [
      'A longer track record and a larger user base than TradeQut.',
      'Automated trade imports are listed on its pricing page; TradeQut imports files you upload, and automatic sync is planned.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${usdYear}/year.`,
      `Pricing in INR (${inrMonth}/month or ${inrYear}/year), and import of Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.`,
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    faq: [
      {
        question: 'Is TradeQut cheaper than Edgewonk?',
        answer:
          `On list prices checked on 14 November 2026, TradeQut Pro is ${usdMonth}/month or ${usdYear}/year after a 14-day free trial. Edgewonk lists $197 a year or $35 a month, with a 14-day money-back guarantee.`,
      },
      {
        question: 'Does Edgewonk have a free trial?',
        answer:
          'The Edgewonk pricing page read on 14 November 2026 mentions a 14-day money-back guarantee and no free trial or free plan. TradeQut starts with a 14-day free trial with every Pro feature and no card.',
      },
    ],
  },
];

export function getCompetitor(id: Competitor['id']): Competitor {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown competitor ${id}`);
  return c;
}
