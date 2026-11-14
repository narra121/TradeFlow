export interface ChangelogEntry {
  /** Stable id for the in-app "What's new" dot (the version is unique per entry). */
  id: string;
  /** false = history only: shown on the public changelog but never in the in-app What's new popover. */
  inApp?: boolean;
  /** YYYY-MM-DD. */
  date: string;
  version: string;
  title: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix';
    text: string;
  }[];
}

/**
 * User-facing changes only, newest first. The 2026-11-11 entry lists what the public-site release changed;
 * add the in-app changes of that release once they are confirmed to ship.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: '2026-11-11',
    version: '2.0.0',
    id: 'v2.0.0',
    title: 'A rebuilt TradeQut: broker import, charges, AI reports and a new Pro plan',
    changes: [
      { type: 'feature', text: 'An Import page for broker files (Zerodha, Dhan, Upstox, Angel One, Groww, MetaTrader 4 and 5, or any CSV) with a review step before anything is saved' },
      { type: 'feature', text: 'Trades imported from Indian brokers carry estimated charges (brokerage, STT, exchange fees, SEBI fee, stamp duty, GST) at the rates of the trade date' },
      { type: 'feature', text: 'An India tax report in Pro for each financial year: charges by type and P&L by tax category' },
      { type: 'feature', text: 'Analytics totals what each mistake and each broken rule cost; trades can carry tags' },
      { type: 'feature', text: 'Analytics shows win rate and expectancy in R with ranges and a sample label, and calls nothing an edge or a leak before 30 trades on each side' },
      { type: 'feature', text: 'Behaviour checks every trade for a fixed list of habits, such as re-entry within 15 minutes of a loss, and a what-if replay tests a rule on your own trades' },
      { type: 'feature', text: 'AI reports are now a review built around one rule and whether you kept it; chat answers by calculation and shows a table' },
      { type: 'feature', text: 'Export all your data and delete your account from Settings' },
      { type: 'improvement', text: 'A redesigned app: the trade pane opens beside any page, trades are grouped by day, and the calendar has month, week and year views' },
      { type: 'feature', text: 'A Plan and billing page showing your usage this month, with a 14-day free trial of every Pro feature for new accounts' },
      { type: 'feature', text: 'After the free trial, or when Pro ends, your journal is read-only: you can view and export everything, and Pro is needed to add, edit or delete' },
      { type: 'feature', text: 'AI Insights reports and AI Chat about your own trades, with monthly limits' },
      { type: 'feature', text: 'A pricing page with the 14-day free trial and Pro, in USD or INR' },
      { type: 'feature', text: 'A guide for Indian F&O traders and fair comparisons with other trading journals' },
      { type: 'feature', text: 'Cookie settings in the footer; analytics only runs after your choice where required' },
      { type: 'improvement', text: 'One header and footer on every public page, with Log in and Start free always in reach' },
      { type: 'improvement', text: 'Case studies are now clearly labelled illustrative scenarios with hypothetical data' },
      { type: 'improvement', text: 'Privacy, Terms and Refund pages corrected to describe the services TradeQut actually uses' },
      { type: 'fix', text: 'Every public page now loads its own page instead of the home page first' },
    ],
  },
  {
    date: '2026-04-23',
    version: '1.8.1',
    id: 'v1.8.1',
    title: 'AI Insights and Chat paused for a redesign',
    changes: [
      {
        type: 'improvement',
        text: 'The AI Insights and AI Chat features announced in 1.8.0 were paused while they were redesigned; they return in 2.0.0',
      },
      { type: 'improvement', text: 'AI extraction of trades from screenshots is unchanged' },
    ],
    inApp: false,
  },
  {
    date: '2026-04-18',
    version: '1.7.0',
    id: 'v1.7.0',
    title: 'User guide and faster public pages',
    changes: [
      { type: 'feature', text: 'A step-by-step user guide with a table of contents' },
      { type: 'improvement', text: 'Public pages are pre-built so they open faster and can be found by search engines' },
      { type: 'improvement', text: 'Share previews for links to TradeQut pages' },
    ],
  },
  {
    date: '2026-04-16',
    version: '1.6.0',
    id: 'v1.6.0',
    title: 'Sign in with Google',
    changes: [{ type: 'feature', text: 'Sign in or sign up with a Google account' }],
  },
  {
    date: '2026-04-14',
    version: '1.5.0',
    id: 'v1.5.0',
    title: 'Subscriptions with Stripe',
    changes: [
      { type: 'feature', text: 'Pay for a Pro subscription monthly or yearly through Stripe Checkout' },
      { type: 'feature', text: 'Pay in INR or USD' },
      { type: 'feature', text: 'Manage or cancel the subscription from the Stripe customer portal' },
      { type: 'improvement', text: 'Replaced the earlier payment provider with Stripe' },
    ],
  },
  {
    date: '2026-04-12',
    version: '1.4.0',
    id: 'v1.4.0',
    title: 'Import trades from screenshots and files',
    changes: [
      { type: 'feature', text: 'AI extraction of trades from screenshots of broker statements' },
      { type: 'feature', text: 'CSV and text file import with automatic column matching' },
      { type: 'feature', text: 'Paste trades from the clipboard' },
      { type: 'improvement', text: 'Multi-page statements are read in parallel' },
    ],
  },
  {
    date: '2026-04-11',
    version: '1.3.0',
    id: 'v1.3.0',
    title: 'tradequt.com',
    changes: [{ type: 'feature', text: 'TradeQut is available at tradequt.com over HTTPS' }],
  },
  {
    date: '2026-04-10',
    version: '1.2.0',
    id: 'v1.2.0',
    title: 'Faster statistics and mobile layouts',
    changes: [
      { type: 'improvement', text: 'Dashboard and analytics statistics load faster and stay in step with your trades' },
      { type: 'improvement', text: 'Layouts rebuilt for phones and tablets' },
    ],
  },
  {
    date: '2026-04-09',
    version: '1.1.0',
    id: 'v1.1.0',
    title: 'Legal pages and recovery from updates',
    changes: [
      { type: 'feature', text: 'Privacy policy, terms of service, refund policy and contact pages' },
      { type: 'fix', text: 'The app reloads itself when a new version was deployed while a tab was open' },
    ],
  },
  {
    date: '2025-12-15',
    version: '1.0.0',
    id: 'v1.0.0',
    title: 'First release',
    changes: [
      { type: 'feature', text: 'Trade journal with strategy, notes, screenshots, mistakes and lessons' },
      { type: 'feature', text: 'Dashboard with win rate, profit factor and equity curve' },
      { type: 'feature', text: 'Several trading accounts, including prop-firm accounts' },
      { type: 'feature', text: 'Calendar with daily P&L and weekly summaries' },
      { type: 'feature', text: 'Goals and trading rules with compliance tracking' },
    ],
  },
];

/** The newest entry; the app compares its id with the last one the user opened. */
export const LATEST_CHANGELOG_ENTRY: ChangelogEntry = CHANGELOG_ENTRIES[0];
