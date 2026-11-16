import { proPrice, type FaqItem } from './product-facts';

const usdMonth = proPrice('USD', 'month').display;
const usdYear = proPrice('USD', 'year').display;
const inrMonth = proPrice('INR', 'month').display;
const inrYear = proPrice('INR', 'year').display;

/** Competitor facts for the /alternatives pages. Every fact carries its source; re-check `checked` monthly. */
export interface Competitor {
  id: 'tradezella' | 'tradersync' | 'tradesviz' | 'tradervue' | 'edgewonk' | 'myfxbook' | 'fxblue';
  name: string;
  /** YYYY-MM-DD the vendor pages below were read. */
  checked: string;
  pricingUrl: string;
  /** Source label for `pricingUrl` when the vendor has no pricing page; absent = "<name> pricing page". */
  pricingLabel?: string;
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
      'Its help pages (read 15 November 2026) describe MT4 and MT5 auto-sync with an investor password and an MT4 HTML report upload; its MT4/MT5 guide gives automatic sync every 3 hours and manual sync every 30 minutes.',
    ],
    strongerAt: [
      'Automatic broker sync across a very large list of brokers, MetaTrader included; TradeQut imports files today and automatic sync is planned.',
      'A broader product with higher tiers for heavy users.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${inrMonth}/month rather than $35 and up.`,
      'MT4 and MT5 report import with commission, taxes and swap in the fees and no investor password, plus Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.',
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    extraSources: [
      { label: 'TradeZella Help: link your MetaTrader 4/5 account', url: 'https://help.tradezella.com/en/articles/8672972-link-your-metatrader-4-5-account-with-tradezella', checked: '2026-11-15' },
      { label: 'TradeZella blog: how to connect MT4 and MT5 to a trading journal (updated 31 Mar 2026)', url: 'https://www.tradezella.com/blog/connect-mt4-mt5-trading-journal', checked: '2026-11-15' },
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
          'No. TradeQut imports trade files from MetaTrader 4/5, Zerodha, Dhan, Upstox, Angel One, Groww and generic CSV. Automatic sync is planned, not available.',
      },
    ],
  },
  {
    id: 'tradersync',
    name: 'TraderSync',
    checked: '2026-11-15',
    pricingUrl: 'https://tradersync.com/pricing/',
    summary: 'A US-focused trading journal with broker auto-sync, file import and a market-replay simulator, in three paid plans with a 7-day free trial.',
    table: { free: 'No free plan; 7-day free trial', price: '$29.95/month (Pro), $49.95 (Premium), $79.95 (Elite)', connection: 'Auto-sync for supported brokers, or file upload' },
    facts: [
      'Monthly prices on the pricing page: Pro $29.95, Premium $49.95 and Elite $79.95 a month, each with a 7-day free trial.',
      'Annual plans were shown at first-year promotional prices ("up to 60% off on your 1st annual subscription"): $179.64, $269.64 and $383.76 for the first year.',
      'The billing policy says card payments only, and that payments are non-refundable.',
      'Forex support ("importing and analyzing forex trades with accurate multi-currency analytics") is marked on all three plans, and its broker list includes MetaTrader 4, MetaTrader 5 and cTrader.',
      'The pricing page lists auto-sync with "over 700 brokers and trading platforms", file import, notes on each trade, trade replay and a mobile app.',
    ],
    strongerAt: [
      'Automatic broker import across a long broker list; TradeQut imports files today and automatic sync is planned.',
      'Trade replay, a market-replay simulator with forex, an AI assistant and a mobile app, which TradeQut does not have.',
      'A larger user base and a longer track record than TradeQut.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then ${usdMonth}/month or ${usdYear}/year, against $29.95/month for TraderSync Pro.`,
      'MT4 and MT5 report import with commission, taxes and swap in the fees, and screenshot import when there is no export.',
      'Rule tracking that records when you broke each rule and what the breaks cost; INR pricing and Indian broker files with estimated charges.',
    ],
    extraSources: [
      { label: 'TraderSync billing, cancellation and refund policy', url: 'https://tradersync.com/billing-cancellation-and-refund-policy/', checked: '2026-11-15' },
      { label: 'TraderSync supported brokers', url: 'https://tradersync.com/supported-broker/', checked: '2026-11-15' },
      {
        label: 'Day Trading Toolkit: TraderSync pricing explained (third party, updated 27 Sep 2026; matches the monthly prices)',
        url: 'https://daytradingtoolkit.com/trading-tools-tutorials/tradersync-pricing-explained',
        checked: '2026-11-12',
      },
    ],
    unverified: [
      "TraderSync's pages return HTTP 403 to automated requests, so they were read in a web browser on 15 November 2026. Not verified from them: whether the 7-day trial needs a card, the renewal price after the first annual year, and whether MetaTrader trades come in by file or by sync.",
    ],
    faq: [
      {
        question: 'What does TraderSync cost?',
        answer:
          `TraderSync's pricing page (read 15 November 2026) lists Pro at $29.95/month, Premium at $49.95/month and Elite at $79.95/month, each with a 7-day free trial; annual plans were shown at promotional first-year prices. TradeQut Pro is ${usdMonth}/month or ${usdYear}/year after a 14-day free trial with no card.`,
      },
      {
        question: 'Does TraderSync support forex and MT4/MT5?',
        answer:
          'Its pricing page marks forex support on all three plans and its broker list includes MetaTrader 4, MetaTrader 5 and cTrader; its pages do not say whether MetaTrader import is by file or by sync. TradeQut imports the MT4 Detailed Report (HTML) and the MT5 history report (HTML or XLSX) that you upload.',
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
      'For MetaTrader its pages (read 15 November 2026) describe MT4 and MT5 HTML import, MT4 sync by FTP and MT5 sync by investor password; forex needs a paid plan, as the free plan is stocks only.',
    ],
    strongerAt: [
      'Depth: charting, many broker importers and a mature analytics suite.',
      'A free plan with a high monthly execution limit.',
      'Paid plans add options, futures, forex, crypto and CFDs; the free plan is stocks only.',
    ],
    tradequtFits: [
      'A smaller, simpler journal built around rules and review habits.',
      'A 14-day free trial with every Pro feature: unlimited accounts and manual trades, every asset class, forex and MT4/MT5 import included.',
      'Estimated Indian charges on imported trades, and the cost of each broken rule.',
      `Pro at ${inrMonth}/month or ${inrYear}/year.`,
    ],
    extraSources: [
      { label: 'TradesViz blog: MT4 auto-import by FTP', url: 'https://www.tradesviz.com/blog/auto-import-metatrader-ftp/', checked: '2026-11-15' },
      { label: 'TradesViz blog: MT5 sync by investor password', url: 'https://www.tradesviz.com/blog/auto-import-mt5fa/', checked: '2026-11-15' },
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
      'MetaTrader 4/5 report import with commission and swap in the fees, plus Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade; pricing in USD or INR.',
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
      "An Edgewonk blog post (20 September 2024, read 15 November 2026) describes MT4/MT5 sync through MetaTrader's FTP report publishing; the pricing page lists forex among supported markets.",
    ],
    strongerAt: [
      'A longer track record and a larger user base than TradeQut.',
      'Automated trade imports are listed on its pricing page; TradeQut imports files you upload, and automatic sync is planned.',
    ],
    tradequtFits: [
      `A 14-day free trial with every Pro feature and no card, then Pro at ${usdMonth}/month or ${usdYear}/year.`,
      'No FTP setup: upload the MT4 or MT5 report, with commission, taxes and swap in the fees.',
      `Pricing in INR (${inrMonth}/month or ${inrYear}/year), and import of Zerodha, Dhan, Upstox, Angel One and Groww files with estimated Indian charges per trade.`,
      'Rule tracking that records when you broke each rule and what the breaks cost.',
    ],
    extraSources: [{ label: 'Edgewonk blog: MetaTrader sync', url: 'https://edgewonk.com/blog/metatrader-sync-edgewonk', checked: '2026-11-15' }],
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
  {
    id: 'myfxbook',
    name: 'Myfxbook',
    checked: '2026-11-15',
    pricingUrl: 'https://www.myfxbook.com/help/knowledge-base/metatrader-4-connection-methods/',
    pricingLabel: 'Myfxbook Help: MetaTrader 4 connection methods (Myfxbook has no pricing page)',
    summary: 'A free forex account-tracking and track-record site that connects MetaTrader accounts by investor password or an Expert Advisor.',
    table: { free: 'Free, paid for by ads', price: 'Free; real-time Live Update $60 a year per account', connection: 'MT4/MT5 by investor password or an EA; cTrader and others' },
    facts: [
      "Myfxbook's FAQ says the service is free and paid for by ads, with no limit on the number of trading accounts.",
      "MT4 and MT5 connect in three ways: Auto Update with the account's read-only investor password (free), an EA Publisher that runs on your terminal and updates every 5 minutes (free, Windows only), or Live Update in real time (paid).",
      'Live Update is billed at $60 a year and applies to one account at a time.',
      'Accounts can be verified (track record and trading privileges) and made public or shared by private link; verification needs the account number, investor password, broker and server.',
      'A Prop Shield feature tracks prop-challenge rules such as daily loss, maximum loss (static or trailing), profit target and consistency.',
      'The help centre also lists cTrader, TradeLocker, Match-Trader, Oanda and DXtrade connections.',
    ],
    strongerAt: [
      'Free, with automatic updates from MT4 and MT5; TradeQut reads report files you upload, and automatic sync is planned.',
      'Verified, public track records that others can view; TradeQut has no public record.',
      'Automatic prop-challenge rule tracking; TradeQut records a challenge account and its status but does not track the limits.',
      'More platforms: cTrader, TradeLocker, Match-Trader, Oanda and DXtrade.',
    ],
    tradequtFits: [
      "A journal around each trade: setup, session tag, mistakes, notes and screenshots, the rules you broke and what the breaks cost. We found no journal or notes feature in Myfxbook's help centre (searched 15 November 2026; not checked inside an account).",
      'No investor password, EA or broker login: upload the MT4 Detailed Report or the MT5 history report, which also works when a broker or prop firm does not allow third-party connections.',
      'Private by default: nothing is published.',
      `Indian F&O and stock accounts in the same journal, with estimated charges; ${usdMonth}/month or ${usdYear}/year after a 14-day free trial.`,
    ],
    unverified: [
      'Not verified: whether Myfxbook has per-trade notes inside a logged-in account, and which broker servers its free Auto Update supports. Myfxbook returns HTTP 403 to automated requests, so its pages were read in a web browser.',
    ],
    extraSources: [
      { label: 'Myfxbook FAQ', url: 'https://www.myfxbook.com/faq', checked: '2026-11-15' },
      { label: 'Myfxbook Help: Live Update', url: 'https://www.myfxbook.com/help/knowledge-base/live-update/', checked: '2026-11-15' },
      { label: 'Myfxbook Help: Verification', url: 'https://www.myfxbook.com/help/knowledge-base/verification/', checked: '2026-11-15' },
      { label: 'Myfxbook Help: Prop Shield', url: 'https://www.myfxbook.com/help/knowledge-base/prop-shield/', checked: '2026-11-15' },
      { label: 'Myfxbook Help: how to add an account', url: 'https://www.myfxbook.com/help/knowledge-base/how-to-add-account/', checked: '2026-11-15' },
    ],
    faq: [
      {
        question: 'Is Myfxbook free?',
        answer:
          "Myfxbook's FAQ says its service is free and paid for by ads, and its help centre lists the Auto Update and EA Publisher connections as free. The real-time Live Update connection is $60 a year per account (read 15 November 2026). TradeQut has a 14-day free trial, then Pro.",
      },
      {
        question: 'Can I use Myfxbook as a trading journal?',
        answer:
          'Myfxbook connects MT4 and MT5 accounts automatically, shows statistics and offers verified public track records. Its help centre does not describe per-trade notes or a journal; check inside your account. TradeQut is an upload-based journal with setups, session tags, mistakes, notes and rules, with no automatic connection and no public record.',
      },
      {
        question: 'Does Myfxbook need my investor password?',
        answer:
          "Its Auto Update connection asks for the account's read-only login credentials, and track-record verification needs the investor password; the EA Publisher method runs an Expert Advisor on your own terminal instead. TradeQut asks for no broker password because it reads the report files you upload.",
      },
    ],
  },
  {
    id: 'fxblue',
    name: 'FX Blue',
    checked: '2026-11-15',
    pricingUrl: 'https://www.fxblue.com/live/register',
    pricingLabel: 'FX Blue registration page (FX Blue has no pricing page)',
    summary: 'A free MetaTrader and cTrader results-publishing site that builds a statistics page from a publisher EA or account sync.',
    table: { free: 'Free, no paid plan', price: 'Free ("Nothing here costs money, now or later")', connection: 'MT4/MT5 publisher EA, or account sync with an investor password' },
    facts: [
      'The registration page says "Nothing here costs money, now or later", and its privacy notice describes advertising and broker and prop-firm partners funding the free service.',
      'Results are published from MT4, MT5, cTrader and other platforms through a Publisher EA that updates every 5 minutes or on each trade, or for some platforms through account sync with a read-only investor password.',
      'Published results are public by default; a PIN or an access list can restrict them.',
      'Its FAQ says FX Blue does not accept uploaded history files from the public.',
      'Its strategy tags read the order comment typed when the order was placed, which cannot be edited afterwards.',
      'The site is run by FXBLUE LLP, registered in England and Wales.',
    ],
    strongerAt: [
      'Free, with no paid tier, and it updates itself from the terminal; TradeQut needs a report upload each time.',
      'A shareable statistics page with equity curve, drawdown and risk figures, and embeddable widgets.',
      'Free extras alongside it: a trade copier, a trading simulator and prop-firm challenge simulations.',
    ],
    tradequtFits: [
      "Per-trade setups, session tags, mistakes, notes and screenshots that you can edit at any time, and the cost of each broken rule. We found no free-text journal in FX Blue's FAQ or public pages.",
      'Private by default, with no EA, publishing step or investor password: upload the MT4 Detailed Report or the MT5 history report.',
      'Commission, taxes and swap in the fees of each trade; screenshot import when there is no export.',
      `${usdMonth}/month or ${usdYear}/year after a 14-day free trial, for a review habit rather than a results page.`,
    ],
    unverified: [
      'Not verified: whether FX Blue offers per-trade notes inside a logged-in account, and whether MT5 account sync is available (its FAQ names MT4 and cTrader in one answer and MT4/5 in another).',
    ],
    extraSources: [
      { label: 'FX Blue FAQ', url: 'https://www.fxblue.com/faq', checked: '2026-11-15' },
      { label: 'FX Blue Publisher EA', url: 'https://www.fxblue.com/tools-for-download/fx-blue-publisher-ea', checked: '2026-11-15' },
      { label: 'FX Blue terms', url: 'https://www.fxblue.com/about/terms', checked: '2026-11-15' },
      { label: 'FX Blue privacy notice', url: 'https://www.fxblue.com/about/privacy', checked: '2026-11-15' },
    ],
    faq: [
      {
        question: 'Is FX Blue free?',
        answer:
          'Yes. The FX Blue registration page says "Nothing here costs money, now or later" (read 15 November 2026), and its privacy notice describes advertising and broker and prop-firm partners funding the free service.',
      },
      {
        question: 'How does FX Blue connect to MetaTrader?',
        answer:
          'Through a Publisher EA that runs in MT4 or MT5, or for some platforms through account sync with a read-only investor password. FX Blue does not accept uploaded history files from the public. TradeQut is the other way round: you upload the MT4 or MT5 report, with no EA and no automatic sync.',
      },
      {
        question: 'Are FX Blue results private?',
        answer:
          "FX Blue's FAQ says published results are public by default; you can add a PIN or an access list. A TradeQut journal is private, and there is no public track record.",
      },
    ],
  },
];

export function getCompetitor(id: Competitor['id']): Competitor {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown competitor ${id}`);
  return c;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-11-15` → `15 Nov 2026`, for dates shown in running text (D.3); read as a calendar day, never through a time zone. */
export function checkedOn(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
