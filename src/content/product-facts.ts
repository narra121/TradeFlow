/**
 * Single source of product facts for public pages, JSON-LD and llms.txt.
 * Prices and limits mirror the monetization contract: a 14-day free trial with every Pro feature, then Pro; without
 * Pro the journal is read-only (view and export).
 * Change a fact here and every consumer (pricing page, FAQ, structured data, llms*.txt) follows.
 */

export const SITE_URL = 'https://tradequt.com';
export const SITE_HOST = 'tradequt.com';
export const PRODUCT_NAME = 'TradeQut';
export const SUPPORT_EMAIL = 'support@tradequt.com';

/** One definition sentence, reused verbatim so search and AI engines see a consistent entity. */
export const PRODUCT_DEFINITION =
  'TradeQut is an online trading journal for forex, F&O, stock and crypto traders that imports MetaTrader and broker trade files, computes net P&L after charges and shows which setups, mistakes and rules cost money.';

export const PRODUCT_TAGLINE = 'Trading journal with broker import, net P&L after charges and rule tracking';

export const AUDIENCES = [
  'Forex and prop-firm traders on MetaTrader 4 / MetaTrader 5',
  'Indian F&O and intraday traders (Zerodha, Dhan, Upstox, Angel One, Groww)',
  'Stock, options, futures and crypto traders who want a journal they control',
];

export const MARKETS = ['Forex', 'Stocks', 'Futures', 'Options', 'Crypto', 'Commodities', 'CFDs'];

export const IMPORT_SOURCES = [
  { id: 'mt4', name: 'MetaTrader 4', file: 'Detailed Report from Account History (HTML)' },
  { id: 'mt5', name: 'MetaTrader 5', file: 'History report, Positions table (HTML or XLSX)' },
  { id: 'zerodha', name: 'Zerodha', file: 'Console tradebook (CSV/XLSX)' },
  { id: 'dhan', name: 'Dhan', file: 'Global Transaction Report (CSV)' },
  { id: 'upstox', name: 'Upstox', file: 'Trade report (XLSX)' },
  { id: 'angelone', name: 'Angel One', file: 'Trade history from Trades and charges (XLSX)' },
  { id: 'groww', name: 'Groww', file: 'Order history (XLSX)' },
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
  /** Display string, e.g. "$4.99" or "₹4,999". */
  display: string;
}

/** Must match the live Stripe prices (JournalAWSSetup scripts/stripe/lib.mjs PRICES) and get-subscription-plans PLAN_CONFIG. */
export const PRO_PRICES: PlanPrice[] = [
  { currency: 'USD', interval: 'month', amount: 4.99, display: '$4.99' },
  { currency: 'USD', interval: 'year', amount: 49.99, display: '$49.99' },
  { currency: 'INR', interval: 'month', amount: 499, display: '₹499' },
  { currency: 'INR', interval: 'year', amount: 4999, display: '₹4,999' },
];

export function proPrice(currency: Currency, interval: Interval): PlanPrice {
  const p = PRO_PRICES.find((x) => x.currency === currency && x.interval === interval);
  if (!p) throw new Error(`no Pro price for ${currency}/${interval}`);
  return p;
}

export const PRICING_NOTE =
  'Prices show in INR or USD from your browser language; checkout charges INR in India and USD elsewhere. Every account starts with a 14-day free trial with every Pro feature, no card required. Cancel any time from the billing portal.';

export interface PlanLimitRow {
  feature: string;
  trial: string;
  pro: string;
}

/** Free trial vs Pro, in plain words: the trial has every Pro feature. Mirrors the monetization contract. */
export const PLAN_LIMITS: PlanLimitRow[] = [
  { feature: 'How long', trial: `${TRIAL_DAYS} days from sign-up, no card`, pro: 'Monthly or yearly, cancel any time' },
  { feature: 'When it ends', trial: 'Read-only: you can view and export, not add, edit or delete', pro: 'Read-only, the same as after the trial' },
  { feature: 'Manual trades, trade log, calendar, dashboard', trial: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Goals and trading rules', trial: 'Included', pro: 'Included' },
  { feature: 'Data export and account deletion', trial: 'Included', pro: 'Included' },
  { feature: 'Trading accounts', trial: 'Unlimited', pro: 'Unlimited' },
  { feature: 'Broker file imports', trial: 'Unlimited (fair use 200/month)', pro: 'Unlimited (fair use 200/month)' },
  { feature: 'AI extraction from screenshots/files', trial: '200 per month', pro: '200 per month' },
  { feature: 'AI reports (a review with one rule to work on)', trial: '30 per month + weekly auto report', pro: '30 per month + weekly auto report' },
  { feature: 'AI Chat messages about your own trades', trial: '500 per month', pro: '500 per month' },
  {
    feature: 'Analytics: every breakdown, Timing, Risk, the cost of each behaviour and broken rule, what-if replay',
    trial: 'Included',
    pro: 'Included',
  },
  { feature: 'India charges and tax P&L report', trial: 'Included', pro: 'Included' },
];

export const DATA_FACTS = [
  'Runs on AWS (us-east-1) with encryption in transit and at rest.',
  'Each user can only read their own trades; data is never sold or shared with brokers.',
  'Export all data or delete the account yourself from Settings.',
  'AI features describe your own past trades with figures calculated by code; they never give buy/sell recommendations.',
];

export const VIDEO_LINKS = {
  demo: 'https://www.youtube.com/watch?v=0iEfLqKpjJY',
  mt5Import: 'https://www.youtube.com/watch?v=cU9EMW33ecQ',
} as const;

/**
 * TradeQut's own public profiles. Every `url` is emitted as Organization `sameAs`; rows with a `label` are also linked
 * from the public footer. List a profile only once its page is public.
 */
export const PROFILE_LINKS: { url: string; label?: string }[] = [
  { url: 'https://www.youtube.com/@tradequt', label: 'YouTube' },
  { url: 'https://x.com/tradequt', label: 'X' },
  { url: 'https://github.com/tradequt', label: 'GitHub' },
  { url: 'https://www.crunchbase.com/organization/tradequt' },
  { url: 'https://www.indiehackers.com/product/tradequt' },
  { url: 'https://wellfound.com/company/tradequt' },
  { url: 'https://www.saashub.com/tradequt' },
];

export const COMPANY_FACTS = {
  name: PRODUCT_NAME,
  url: SITE_URL,
  email: SUPPORT_EMAIL,
  country: 'India',
  founded: '2026',
  logo: `${SITE_URL}/favicon-512.png`,
  /** Emitted as Organization `sameAs`. Empty = nothing emitted. */
  profiles: PROFILE_LINKS.map((p) => p.url),
  /** Legal name shown on the contact block. */
  business: 'TradeQutJournal',
  /** `e164` for `tel:` links and JSON-LD, `display` for the page. */
  phone: { e164: '+918501018125', display: '+91 8501018125' },
  address: { street: '3-187/2, Regonda', locality: 'Bhupalpally', region: 'Telangana', postalCode: '506348', country: 'IN' },
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
/** Asked on the landing page and on /pricing: one wording for both, built from the trial length. */
export const TRIAL_END_FAQ: FaqItem = {
  question: 'What happens when the free trial ends?',
  answer: `The ${TRIAL_DAYS}-day free trial starts when you sign up, has every Pro feature and needs no card. When it ends nothing is charged and your journal becomes read-only: you can still view and export every trade. Upgrade to Pro to add, edit or delete again.`,
};

export const PRODUCT_FAQ: FaqItem[] = [
  { question: 'What is TradeQut?', answer: PRODUCT_DEFINITION },
  {
    question: 'Is TradeQut free?',
    answer: `TradeQut starts with a ${TRIAL_DAYS}-day free trial with every Pro feature and no card. After that Pro costs ${usdMonth}/month or ${usdYear}/year (${inrMonth}/month or ${inrYear}/year in India). Without Pro your journal stays readable and exportable, but you cannot add, edit or delete.`,
  },
  {
    question: 'Which brokers can I import from?',
    answer: `TradeQut imports trade files from ${IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv')
      .map((s) => s.name)
      .join(', ')}, plus any broker through a generic CSV. Screenshots of broker or prop-firm dashboards can be read with AI extraction.`,
  },
  {
    question: 'Does TradeQut work for forex and MetaTrader?',
    answer:
      'Yes. Upload the MetaTrader 4 Detailed Report (HTML) or the MetaTrader 5 history report (HTML or XLSX): each closed trade comes in with its lots, prices, stop and target, with commission and swap in the fees. You tag the session and setup, and Analytics shows results by pair, session, hour and weekday. P&L is in the account currency, not in pips.',
  },
  {
    question: 'Does TradeQut calculate P&L after charges for Indian F&O?',
    answer:
      'Trades can carry fees and lot size, so P&L can be recorded net of charges. Pro includes a tax report for each financial year that splits the charges into STT, exchange charges, SEBI fee and stamp duty at the statutory rates (NSE rates assumed), with brokerage, GST and other charges as the remainder, and shows P&L by tax category for your CA. TradeQut does not file taxes and is not tax advice.',
  },
  {
    question: 'Does TradeQut give trading tips or signals?',
    answer:
      'No. TradeQut analyses your own past trades: win rate with its range, expectancy in R, which habits and broken rules cost money, and what a rule would have changed. It never recommends securities, strikes or trades.',
  },
  {
    question: 'Is my trading data private?',
    answer: DATA_FACTS.join(' '),
  },
];
