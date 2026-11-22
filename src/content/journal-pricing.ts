import { PLAN_LIMITS, PRODUCT_NAME, PRO_PRICES, TRIAL_DAYS, type Currency } from './product-facts';
import type { Competitor } from './alternatives';

/**
 * Plans and list prices of other trading journals, each read from the vendor's own pages on `checked`.
 * Feeds /trading-journal-pricing and the `table.price` cells in alternatives.ts; JournalPricingPage.test.tsx checks the
 * prices written in alternatives.ts prose against this list, so the two never disagree.
 */
export interface JournalPlan {
  name: string;
  /** List price billed monthly; 0 = free; null = the vendor states only a yearly price. */
  monthly: number | null;
  /** Yearly list price as one payment; absent = the vendor's page does not state it. */
  yearlyTotal?: number;
  /** Yearly list price as the vendor expresses it per month, billed yearly; absent = not stated. */
  yearlyPerMonth?: number;
  /** Shown in place of the yearly price when the page gives no yearly list price for a stated reason. */
  yearlyNote?: string;
}

export interface Promotion {
  /** YYYY-MM-DD the promotion was seen. */
  seen: string;
  text: string;
  url: string;
}

export interface JournalPricing {
  id: string;
  name: string;
  /** The vendor's own site; every URL below is on it. */
  domain: string;
  currency: Currency;
  pricingUrl: string;
  pricingLabel: string;
  /** YYYY-MM-DD the pricing page was read. */
  checked: string;
  hasFreePlan: boolean;
  /** Free plan or trial in a few words, for the table cell. */
  freeShort: string;
  /** Free plan or free trial, as the vendor's page states it. */
  freeOrTrial: string;
  plans: JournalPlan[];
  /** Limits per plan as the pricing page lists them. */
  limits?: string;
  /** Currency and tax wording, when the page says more than "US dollars". */
  currencyNote?: string;
  promotions: Promotion[];
  /** Price facts the vendor's page does not state. */
  notStated: string[];
  extraSources: { label: string; url: string; checked: string }[];
  /** The /alternatives/<id> comparison, where one exists. */
  alternative?: Competitor['id'];
}

/** Listed alphabetically; TradeQut is rendered separately, from product-facts.ts. */
export const JOURNAL_PRICING: JournalPricing[] = [
  {
    id: 'chartlog',
    name: 'Chartlog',
    domain: 'chartlog.com',
    currency: 'USD',
    pricingUrl: 'https://www.chartlog.com/pricing/',
    pricingLabel: 'Chartlog pricing page',
    checked: '2026-11-21',
    hasFreePlan: false,
    freeShort: 'Trial (length not stated); no free plan',
    freeOrTrial: 'A trial ("Start your trial"); its length is not stated on the pricing page. No free plan is listed.',
    plans: [
      { name: 'Lite', monthly: 14.99, yearlyPerMonth: 13.49 },
      { name: 'Standard', monthly: 29.99, yearlyPerMonth: 25.49 },
      { name: 'Pro', monthly: 39.99, yearlyPerMonth: 31.99 },
    ],
    limits: 'Unlimited trade imports and trading accounts on all three plans.',
    promotions: [],
    notStated: ['the length of the trial'],
    extraSources: [],
  },
  {
    id: 'edgewonk',
    name: 'Edgewonk',
    domain: 'edgewonk.com',
    currency: 'USD',
    pricingUrl: 'https://edgewonk.com/pricing',
    pricingLabel: 'Edgewonk pricing page',
    checked: '2026-11-21',
    hasFreePlan: false,
    freeShort: 'No free plan or trial; 14-day money-back guarantee',
    freeOrTrial: 'No free plan or free trial on the pricing page; a 14-day money-back guarantee.',
    plans: [{ name: 'One plan, every feature', monthly: 35, yearlyTotal: 197 }],
    limits: 'Monthly and yearly differ only in price: unlimited journals, broker and prop-firm accounts, and trade imports.',
    currencyNote: 'US dollars. VAT is calculated at checkout; the page lists VAT-inclusive prices for EU countries and the UK.',
    promotions: [
      {
        seen: '2026-11-21',
        text: 'Black Friday 2026: 25% off for new customers with code BF26, "for the length of your subscription": $147.75 per 12 months or $26.25 a month, before VAT.',
        url: 'https://edgewonk.com/pricing',
      },
    ],
    notStated: [],
    extraSources: [],
    alternative: 'edgewonk',
  },
  {
    id: 'fxblue',
    name: 'FX Blue',
    domain: 'fxblue.com',
    currency: 'USD',
    pricingUrl: 'https://www.fxblue.com/register',
    pricingLabel: 'FX Blue registration page (FX Blue has no pricing page)',
    checked: '2026-11-21',
    hasFreePlan: true,
    freeShort: 'Free',
    freeOrTrial: 'Free: "Nothing here costs money, now or later."',
    plans: [{ name: 'FX Blue account', monthly: 0 }],
    promotions: [],
    notStated: [],
    extraSources: [],
    alternative: 'fxblue',
  },
  {
    id: 'myfxbook',
    name: 'Myfxbook',
    domain: 'myfxbook.com',
    currency: 'USD',
    pricingUrl: 'https://www.myfxbook.com/faq',
    pricingLabel: 'Myfxbook FAQ (Myfxbook has no pricing page)',
    checked: '2026-11-21',
    hasFreePlan: true,
    freeShort: 'Free, ad-supported; Live Update is paid',
    freeOrTrial: 'Free, paid for by ads: "Our service is absolutely free. We make money by showing you ads." Live Update is a paid add-on.',
    plans: [
      { name: 'Myfxbook account', monthly: 0 },
      { name: 'Live Update (per account)', monthly: null, yearlyTotal: 60 },
    ],
    limits: 'Live Update applies to one account at a time; each further account needs its own subscription.',
    promotions: [],
    notStated: [],
    extraSources: [{ label: 'Myfxbook Help: Live Update', url: 'https://www.myfxbook.com/help/knowledge-base/live-update/', checked: '2026-11-21' }],
    alternative: 'myfxbook',
  },
  {
    id: 'trademetria',
    name: 'Trademetria',
    domain: 'trademetria.com',
    currency: 'USD',
    pricingUrl: 'https://trademetria.com/pricing',
    pricingLabel: 'Trademetria pricing page',
    checked: '2026-11-21',
    hasFreePlan: true,
    freeShort: 'Free plan; no card to start',
    freeOrTrial: 'A free plan, with no card needed to start. After opening an account, every feature can be tried for up to 200 page views.',
    plans: [
      { name: 'Free', monthly: 0 },
      { name: 'Basic', monthly: 19.95, yearlyTotal: 169, yearlyPerMonth: 14.1 },
      { name: 'Pro', monthly: 29.95, yearlyTotal: 249, yearlyPerMonth: 20.8 },
    ],
    limits: 'Orders imported a month: 30 on Free, 500 on Basic, unlimited on Pro. Accounts: 1 on Free and Basic, 50 on Pro. Open positions tracked: 3 on Free, 200 on Basic, unlimited on Pro.',
    currencyNote:
      'US dollars. Read from India, the page said users from that country can save up to 50% on the listed prices, shown after opening an account.',
    promotions: [],
    notStated: [],
    extraSources: [],
  },
  {
    id: 'tradersync',
    name: 'TraderSync',
    domain: 'tradersync.com',
    currency: 'USD',
    pricingUrl: 'https://tradersync.com/pricing/',
    pricingLabel: 'TraderSync pricing page',
    checked: '2026-11-21',
    hasFreePlan: false,
    freeShort: 'No free plan; 7-day free trial',
    freeOrTrial: 'No free plan on the pricing page; a 7-day free trial on each plan.',
    plans: [
      { name: 'Pro', monthly: 29.95, yearlyNote: 'Only a first-year offer is shown' },
      { name: 'Premium', monthly: 49.95, yearlyNote: 'Only a first-year offer is shown' },
      { name: 'Elite', monthly: 79.95, yearlyNote: 'Only a first-year offer is shown' },
    ],
    limits: 'Unlimited trade imports on all three plans.',
    promotions: [
      {
        seen: '2026-11-21',
        text: '"Up to 70% off on your 1st annual subscription plan": first-year yearly prices of $143.76 (Pro), $209.76 (Premium) and $287.76 (Elite), each beside a struck-through figure equal to 12 monthly payments ($359.40, $599.40 and $959.40).',
        url: 'https://tradersync.com/pricing/',
      },
    ],
    notStated: ['the yearly renewal price after the first year', 'whether the 7-day trial needs a card'],
    extraSources: [],
    alternative: 'tradersync',
  },
  {
    id: 'tradervue',
    name: 'Tradervue',
    domain: 'tradervue.com',
    currency: 'USD',
    pricingUrl: 'https://www.tradervue.com/site/pricing',
    pricingLabel: 'Tradervue pricing page',
    checked: '2026-11-21',
    hasFreePlan: true,
    freeShort: 'Free Basic plan (30 trades a month); trial of Silver and Gold',
    freeOrTrial:
      'Free Basic plan, up to 30 trades a month (listed on the phone layout of the pricing page). New users choosing Silver or Gold get a trial; the card is charged when it ends unless they switch to a free plan.',
    plans: [
      { name: 'Basic', monthly: 0 },
      { name: 'Silver', monthly: 29.95 },
      { name: 'Gold', monthly: 49.95 },
    ],
    limits: 'Silver and Gold: unlimited trade imports and trading accounts, with broker sync.',
    promotions: [],
    notStated: ['a yearly price', 'the length of the Silver and Gold trial'],
    extraSources: [
      {
        label: 'Tradervue pricing page as served to phones, which lists the free Basic plan (desktop browsers are sent to /site/pricing/, which lists Silver and Gold only)',
        url: 'https://www.tradervue.com/site/pricing-plans/',
        checked: '2026-11-21',
      },
    ],
    alternative: 'tradervue',
  },
  {
    id: 'tradesviz',
    name: 'TradesViz',
    domain: 'tradesviz.com',
    currency: 'INR',
    pricingUrl: 'https://www.tradesviz.com/pricing/',
    pricingLabel: 'TradesViz pricing page',
    checked: '2026-11-21',
    hasFreePlan: true,
    freeShort: 'Free Basic plan; 7-day free trial of Pro and Platinum',
    freeOrTrial: 'Free Basic plan ("Free forever": 3,000 executions a month, 1 account, stocks only); a 7-day free trial of Pro and Platinum.',
    plans: [
      { name: 'Basic', monthly: 0 },
      { name: 'Pro', monthly: 1400, yearlyPerMonth: 1050 },
      { name: 'Platinum', monthly: 2300, yearlyPerMonth: 1708.33 },
    ],
    limits: 'Trading accounts: 1 on Basic, 10 on Pro, 20 on Platinum.',
    currencyNote: 'Indian rupees, as the page showed them when read from India.',
    promotions: [
      {
        seen: '2026-11-21',
        text: '30% discount with code TVBF26 from 12 to 30 Nov 2026: Pro ₹980 a month or ₹735 a month billed yearly, Platinum ₹1,610 a month or ₹1,195.83 a month billed yearly. A banner adds a free one-year EZstockscreener subscription with yearly plans.',
        url: 'https://www.tradesviz.com/pricing/',
      },
    ],
    notStated: ['a US-dollar price list (the page showed rupee prices when read from India)'],
    extraSources: [],
    alternative: 'tradesviz',
  },
  {
    id: 'tradezella',
    name: 'TradeZella',
    domain: 'tradezella.com',
    currency: 'USD',
    pricingUrl: 'https://www.tradezella.com/pricing',
    pricingLabel: 'TradeZella pricing page',
    checked: '2026-11-21',
    hasFreePlan: false,
    freeShort: 'None stated',
    freeOrTrial: 'Neither a free plan nor a free trial is stated on the pricing page.',
    plans: [
      { name: 'Essential', monthly: 35, yearlyTotal: 315, yearlyPerMonth: 26 },
      { name: 'Pro', monthly: 59, yearlyTotal: 531, yearlyPerMonth: 44 },
      { name: 'Ultra', monthly: 99, yearlyTotal: 891, yearlyPerMonth: 74 },
    ],
    limits: 'Active trading accounts: 1 on Essential, up to 50 on Pro, unlimited on Ultra.',
    promotions: [
      {
        seen: '2026-11-21',
        text: 'Black Friday offer ("TradeZella Pro for $1 a day"): Pro yearly at $345.15 for the first year, renewing at $531. The offer page says it ends on 1 December and covers Pro yearly and Ultra yearly, not monthly plans or Essential.',
        url: 'https://www.tradezella.com/black-friday',
      },
    ],
    notStated: [],
    extraSources: [{ label: 'TradeZella Black Friday offer page', url: 'https://www.tradezella.com/black-friday', checked: '2026-11-21' }],
    alternative: 'tradezella',
  },
];

const howLong = PLAN_LIMITS.find((r) => r.feature === 'How long')!;
const whenEnds = PLAN_LIMITS.find((r) => r.feature === 'When it ends')!;

/** TradeQut's own row: every figure comes from product-facts.ts. */
export const TRADEQUT_PRICING = {
  name: PRODUCT_NAME,
  plan: 'Pro',
  prices: PRO_PRICES,
  trialDays: TRIAL_DAYS,
  freeShort: `${TRIAL_DAYS}-day free trial, ${howLong.trial.split(', ').pop()}`,
  freeOrTrial: `A free trial with every Pro feature, ${howLong.trial}; when it ends the journal is ${whenEnds.trial.charAt(0).toLowerCase()}${whenEnds.trial.slice(1)}.`,
};

/** `$29.95`, `$35`, `₹1,708.33`: whole amounts without decimals, others to the cent. */
export function money(currency: Currency, amount: number): string {
  const [whole, cents] = (Number.isInteger(amount) ? String(amount) : amount.toFixed(2)).split('.');
  return `${currency === 'USD' ? '$' : '₹'}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${cents ? `.${cents}` : ''}`;
}

export function getJournalPricing(id: string): JournalPricing {
  const p = JOURNAL_PRICING.find((x) => x.id === id);
  if (!p) throw new Error(`unknown journal ${id}`);
  return p;
}

/** A plan's list price, for text elsewhere on the site; `year` is the one-payment yearly total. */
export function listPrice(id: string, plan: string, interval: 'month' | 'year'): string {
  const p = getJournalPricing(id);
  const pl = p.plans.find((x) => x.name === plan);
  const amount = interval === 'month' ? pl?.monthly : pl?.yearlyTotal;
  if (amount == null) throw new Error(`no ${interval} list price for ${id} ${plan}`);
  return money(p.currency, amount);
}

export function monthlyText(p: JournalPricing, plan: JournalPlan): string {
  if (plan.monthly === 0) return 'Free';
  if (plan.monthly === null) return 'Yearly only';
  return money(p.currency, plan.monthly);
}

export function yearlyText(p: JournalPricing, plan: JournalPlan): string {
  if (plan.monthly === 0 && plan.yearlyTotal === undefined) return 'Free';
  if (plan.yearlyTotal !== undefined && plan.yearlyPerMonth !== undefined)
    return `${money(p.currency, plan.yearlyTotal)} a year (${money(p.currency, plan.yearlyPerMonth)} a month)`;
  if (plan.yearlyTotal !== undefined) return `${money(p.currency, plan.yearlyTotal)} a year`;
  if (plan.yearlyPerMonth !== undefined) return `${money(p.currency, plan.yearlyPerMonth)} a month, billed yearly`;
  return plan.yearlyNote ?? "Not stated on the vendor's page";
}
