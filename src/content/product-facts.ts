/**
 * Single source of product facts for public pages, JSON-LD and llms.txt.
 * Prices and limits mirror the monetization contract (Free / Pro, 14-day trial).
 * Change a fact here and every consumer (pricing page, FAQ, structured data, llms*.txt) follows.
 */

export const SITE_URL = 'https://tradequt.com';
export const SITE_HOST = 'tradequt.com';
export const PRODUCT_NAME = 'TradeQut';
export const SUPPORT_EMAIL = 'support@tradequt.com';

/** One definition sentence, reused verbatim so search and AI engines see a consistent entity. */
export const PRODUCT_DEFINITION =
  'TradeQut is an online trading journal for stock, F&O, forex and crypto traders that imports broker trade files, computes net P&L after charges and shows which setups, mistakes and rules cost money.';

export const PRODUCT_TAGLINE = 'Trading journal with broker import, net P&L after charges and rule tracking';

export const AUDIENCES = [
  'Indian F&O and intraday traders (Zerodha, Dhan, Upstox, Angel One, Groww)',
  'Forex and prop-firm traders on MetaTrader 4 / MetaTrader 5',
  'Stock, options, futures and crypto traders who want a journal they control',
];

export const MARKETS = ['Stocks', 'Futures', 'Options', 'Forex', 'Crypto', 'Commodities', 'CFDs'];

export const IMPORT_SOURCES = [
  { id: 'zerodha', name: 'Zerodha', file: 'Console tradebook (CSV/XLSX)' },
  { id: 'dhan', name: 'Dhan', file: 'Trade history export' },
  { id: 'upstox', name: 'Upstox', file: 'Trade report export' },
  { id: 'angelone', name: 'Angel One', file: 'Trade history export' },
  { id: 'groww', name: 'Groww', file: 'Order/trade history export' },
  { id: 'mt4', name: 'MetaTrader 4', file: 'Account history report (HTML)' },
  { id: 'mt5', name: 'MetaTrader 5', file: 'History report (HTML/XLSX)' },
  { id: 'generic_csv', name: 'Any broker', file: 'Generic CSV with column mapping' },
] as const;

export const PLATFORM = 'Web app (works in desktop and mobile browsers); no native mobile app';

export const TRIAL_DAYS = 14;

export type Currency = 'USD' | 'INR';
export type Interval = 'month' | 'year';

export interface PlanPrice {
  currency: Currency;
  interval: Interval;
  amount: number;
  /** Display string, e.g. "$9.99" or "₹1,499". */
  display: string;
}

export const PRO_PRICES: PlanPrice[] = [
  { currency: 'USD', interval: 'month', amount: 9.99, display: '$9.99' },
  { currency: 'USD', interval: 'year', amount: 79, display: '$79' },
  { currency: 'INR', interval: 'month', amount: 199, display: '₹199' },
  { currency: 'INR', interval: 'year', amount: 1499, display: '₹1,499' },
];

export function proPrice(currency: Currency, interval: Interval): PlanPrice {
  const p = PRO_PRICES.find((x) => x.currency === currency && x.interval === interval);
  if (!p) throw new Error(`no Pro price for ${currency}/${interval}`);
  return p;
}

export const PRICING_NOTE =
  'Prices show in INR or USD from your browser language; checkout charges INR in India and USD elsewhere. Every account starts with a 14-day Pro trial, no card required. Cancel any time from the billing portal.';

export interface PlanLimitRow {
  feature: string;
  free: string;
  pro: string;
}

/** Free vs Pro, in plain words. Mirrors the monetization contract. */
export const PLAN_LIMITS: PlanLimitRow[] = [
  { feature: 'Manual trades, trade log, calendar, dashboard', free: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Goals and trading rules', free: 'Included', pro: 'Included' },
  { feature: 'Data export and account deletion', free: 'Included', pro: 'Included' },
  { feature: 'Trading accounts', free: '2', pro: 'Unlimited' },
  { feature: 'Broker file imports', free: '3 per month', pro: 'Unlimited (fair use 200/month)' },
  { feature: 'AI extraction from screenshots/files', free: '5 per month', pro: '200 per month' },
  { feature: 'AI Insights reports', free: '1 per month', pro: '30 per month + weekly auto report' },
  { feature: 'AI Chat messages about your own trades', free: '10 per month', pro: '500 per month' },
  {
    feature: 'Advanced analytics (setup, session and mistake cost, time of day, R-distribution, drawdown)',
    free: 'Preview',
    pro: 'Included',
  },
  { feature: 'India charges and tax P&L report', free: 'Not included', pro: 'Included' },
];

export const DATA_FACTS = [
  'Runs on AWS (us-east-1) with encryption in transit and at rest.',
  'Each user can only read their own trades; data is never sold or shared with brokers.',
  'Export all data or delete the account yourself from Settings.',
  'AI features describe your own past trades; they never give buy/sell recommendations.',
];

export const COMPANY_FACTS = {
  name: PRODUCT_NAME,
  url: SITE_URL,
  email: SUPPORT_EMAIL,
  country: 'India',
  founded: '2026',
  logo: `${SITE_URL}/favicon-512.png`,
};

export interface FaqItem {
  question: string;
  answer: string;
}

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Product FAQ: visible on the home and pricing pages and emitted as FAQPage JSON-LD. */
export const PRODUCT_FAQ: FaqItem[] = [
  { question: 'What is TradeQut?', answer: PRODUCT_DEFINITION },
  {
    question: 'Is TradeQut free?',
    answer: `Yes. The Free plan includes unlimited manual trades, the trade log, calendar, dashboard, goals, rules and data export. Pro costs ${usdMonth}/month or ${usdYear}/year (${inrMonth}/month or ${inrYear}/year in India) and adds unlimited accounts and imports, higher AI limits, advanced analytics and an India charges and tax P&L report. Every account starts with a ${TRIAL_DAYS}-day Pro trial without a card.`,
  },
  {
    question: 'Which brokers can I import from?',
    answer: `TradeQut imports trade files from ${IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv')
      .map((s) => s.name)
      .join(', ')}, plus any broker through a generic CSV. Screenshots of broker or prop-firm dashboards can be read with AI extraction.`,
  },
  {
    question: 'Does TradeQut calculate P&L after charges for Indian F&O?',
    answer:
      'Trades can carry fees and lot size, so P&L can be recorded net of charges. Pro includes a tax report for each financial year that splits the charges into STT, exchange charges, SEBI fee and stamp duty at the statutory rates (NSE rates assumed), with brokerage, GST and other charges as the remainder, and shows P&L by tax category for your CA. TradeQut does not file taxes and is not tax advice.',
  },
  {
    question: 'Does TradeQut give trading tips or signals?',
    answer:
      'No. TradeQut analyses your own past trades — win rate, profit factor, drawdown, which rules you break and what mistakes cost. It never recommends securities, strikes or trades.',
  },
  {
    question: 'Is my trading data private?',
    answer: DATA_FACTS.join(' '),
  },
];
