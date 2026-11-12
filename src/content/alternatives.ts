import type { FaqItem } from './product-facts';

/** Competitor facts for the /alternatives pages. Every fact carries its source; re-check `checked` monthly. */
export interface Competitor {
  id: 'tradezella' | 'tradersync' | 'tradesviz';
  name: string;
  /** YYYY-MM-DD the vendor pages below were read. */
  checked: string;
  pricingUrl: string;
  /** One-line neutral description. */
  summary: string;
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
      'A permanent Free plan, and Pro at $9.99/month or ₹199/month rather than $35 and up.',
      'Pricing in INR, and import of Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.',
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    faq: [
      {
        question: 'Is TradeQut cheaper than TradeZella?',
        answer:
          'On list prices checked on 12 November 2026, yes: TradeQut Pro is $9.99/month or $79/year, and there is a Free plan. TradeZella lists Essential at $35/month ($26/month billed yearly) and no free plan. TradeZella offers automatic broker sync that TradeQut does not have yet.',
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
    facts: ['TraderSync positions itself as a trading journal with automatic broker import and analytics.'],
    strongerAt: [
      'Automatic broker import and a long-established analytics suite.',
      'A larger user base and a longer track record than TradeQut.',
    ],
    tradequtFits: [
      'A permanent Free plan and INR pricing.',
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
          "TraderSync's own pricing page could not be read automatically on 12 November 2026. A third-party guide updated in September 2026 lists $29.95, $49.95 and $79.95 a month for its three plans; check tradersync.com/pricing for the current figures. TradeQut Pro is $9.99/month or $79/year, with a Free plan.",
      },
    ],
  },
  {
    id: 'tradesviz',
    name: 'TradesViz',
    checked: '2026-11-12',
    pricingUrl: 'https://www.tradesviz.com/pricing/',
    summary: 'A feature-rich trading journal with a free plan and India listed as a supported market.',
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
      'Free plan with 2 trading accounts, unlimited manual trades and every asset class.',
      'Estimated Indian charges on imported trades, and the cost of each broken rule.',
      'Pro at ₹199/month or ₹1,499/year.',
    ],
    faq: [
      {
        question: 'How does TradesViz compare with TradeQut for Indian traders?',
        answer:
          'TradesViz is the more established product: it supports Zerodha tradebook import today and has a free plan with 3,000 executions a month. TradeQut is smaller and simpler, with rule tracking and lower Pro pricing (₹199/month or ₹1,499/year). Try both free plans with your own tradebook.',
      },
    ],
  },
];

export function getCompetitor(id: Competitor['id']): Competitor {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown competitor ${id}`);
  return c;
}
