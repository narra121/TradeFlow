import type { ComponentType } from 'react';
import type { FaqItem } from '../product-facts';

export interface HowToMeta {
  name: string;
  steps: { name: string; text: string }[];
}

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  /** Last substantive edit (YYYY-MM-DD); drives dateModified and sitemap lastmod. Absent = publishedAt. */
  updatedAt?: string;
  readingTime: number;
  /** 2-3 sentence answer-first summary shown at the top and copied into llms-full.txt. */
  summary?: string;
  /** Rendered visibly by <ArticleFaq> and emitted as FAQPage JSON-LD; both read this array. */
  faq?: FaqItem[];
  howTo?: HowToMeta;
  content: () => Promise<{ default: ComponentType }>;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-keep-trading-journal',
    title: 'How to keep a trading journal: the complete guide',
    description:
      'Learn why a trading journal is essential for trading success and how to build one that actually improves your performance.',
    tags: ['beginner', 'journaling', 'discipline'],
    publishedAt: '2026-04-20',
    readingTime: 8,
    updatedAt: '2026-11-12',
    summary:
      'A trading journal records every trade with its numbers and the reasoning behind it, so you can measure what works. Record entry, exit, size, stop, fees, strategy, mistakes and a one-line lesson, and review the record every week.',
    faq: [
      {
        question: 'What should a trading journal include?',
        answer:
          'Each trade needs the symbol, direction, entry and exit price, size, stop loss, fees and times, plus the strategy, any mistakes or broken rules, and a short lesson. Screenshots of the chart at entry help the review.',
      },
      {
        question: 'How often should I review my trading journal?',
        answer:
          'Once a week is enough for most traders: look at the week\'s numbers, the worst trades and the rules you broke, and pick one thing to change. A monthly review checks whether the change helped.',
      },
    ],
    content: () => import('./how-to-keep-trading-journal'),
  },
  {
    slug: 'trading-journal-template',
    title: 'Trading journal template: what every entry should include',
    description:
      'The essential fields and optional context every trade entry needs. Stop guessing what to log — use this template.',
    tags: ['beginner', 'journaling', 'template'],
    publishedAt: '2026-04-21',
    readingTime: 6,
    updatedAt: '2026-11-12',
    summary:
      'A good trading journal template has required fields for the numbers (symbol, direction, prices, size, stop, fees, times) and a few context fields (strategy, session, market condition), plus a mistake field and a lesson field on every entry.',
    faq: [
      {
        question: 'What are the essential fields in a trading journal template?',
        answer:
          'Symbol, direction, entry and exit price, position size, stop loss, fees, open and close time, strategy, and a field for mistakes and the lesson learned.',
      },
      {
        question: 'Why use a template instead of free-form notes?',
        answer:
          'The same fields on every trade let you group and compare trades later, for example the win rate of one strategy or the cost of one mistake. Free-form notes cannot be counted.',
      },
    ],
    content: () => import('./trading-journal-template'),
  },
  {
    slug: 'mistakes-new-traders-make',
    title: '5 mistakes new traders make (and how a journal fixes them)',
    description:
      'Revenge trading, overtrading, no plan, ignoring risk, and never reviewing. Here is how journaling solves each one.',
    tags: ['beginner', 'psychology', 'mistakes'],
    publishedAt: '2026-04-22',
    readingTime: 7,
    summary:
      'Five mistakes cost new traders most: revenge trading, overtrading, trading without a plan, ignoring risk per trade and never reviewing. A journal makes each one visible because it shows when the mistake happened and what it cost.',
    faq: [
      {
        question: 'What is revenge trading?',
        answer:
          'Taking an impulsive trade to win back a loss, usually larger and with less preparation than normal. Journals often show these trades clustered right after a losing trade.',
      },
      {
        question: 'How does a journal help stop overtrading?',
        answer:
          'Counting trades per day next to the daily result shows whether extra trades add or remove money. A maximum-trades limit is easy to check against that count.',
      },
    ],
    content: () => import('./mistakes-new-traders-make'),
  },
  {
    slug: 'how-to-review-trades',
    title: 'How to review your trades: a weekly routine',
    description:
      'A systematic weekly review process that helps you spot patterns, fix mistakes, and track progress over time.',
    tags: ['beginner', 'review', 'routine'],
    publishedAt: '2026-04-23',
    readingTime: 6,
    updatedAt: '2026-11-12',
    summary:
      'A weekly review takes 20 to 30 minutes: check the week\'s net P&L, win rate and broken rules, study the best and the worst trade, look for one repeating pattern, and choose one change for next week.',
    faq: [
      {
        question: 'Why review trades weekly rather than daily?',
        answer:
          'A week has enough trades to show a pattern while it is still fresh. Daily reviews react to noise; monthly reviews alone come too late to fix a habit.',
      },
      {
        question: 'What should I look for in a trade review?',
        answer:
          'Repeated mistakes, rules broken under pressure, the hours and strategies where you lose, and whether losses stayed within your planned risk.',
      },
    ],
    content: () => import('./how-to-review-trades'),
  },
  {
    slug: 'getting-started-tradequt',
    title: 'Getting started with TradeQut: your first 30 days',
    description:
      'A four-week plan for your first month with TradeQut: accounts and rules, importing trades, reading Analytics, weekly limits and a weekly review.',
    tags: ['beginner', 'tradequt', 'onboarding'],
    publishedAt: '2026-04-24',
    readingTime: 5,
    updatedAt: '2026-11-12',
    summary:
      'A four-week plan for a new TradeQut journal: set up accounts, pick lists and rules in week one, get every trade in by import or by hand, read your first numbers in Analytics after about 20 trades, then set weekly limits and review once a week.',
    faq: [
      {
        question: 'Is there a free trial of Pro?',
        answer:
          'Yes. Every new account starts with a 14-day free trial with every Pro feature and no card. When it ends nothing is charged and the journal becomes read-only: you can still view and export your trades.',
      },
      {
        question: 'How many trades do I need before the analytics mean anything?',
        answer:
          'Around 20 trades give a first picture; segment figures with only a handful of trades should be read with care. Each figure shows its trade count.',
      },
    ],
    content: () => import('./getting-started-tradequt'),
  },
  {
    slug: 'win-rate-vs-profit-factor',
    title: 'Win rate vs profit factor: which matters more?',
    description:
      'A deep dive into two critical trading metrics with math, examples, and scenarios showing why profit factor often matters more.',
    tags: ['analytics', 'metrics', 'intermediate'],
    publishedAt: '2026-04-25',
    readingTime: 8,
    summary:
      'Win rate is the share of trades that make money; profit factor is gross profit divided by gross loss. A high win rate can still lose money if losses are larger than wins, so profit factor (above 1.0 after fees) says more about profitability.',
    faq: [
      {
        question: 'What is a good profit factor?',
        answer:
          'Above 1.0 means gross profits exceed gross losses. Many traders treat 1.5 or more, after fees and over a large sample, as a sign of a robust edge.',
      },
      {
        question: 'Can a strategy with a 40% win rate be profitable?',
        answer:
          'Yes, if the average win is large enough relative to the average loss. At a 1:2 risk-reward ratio, the breakeven win rate is about 33% before fees.',
      },
    ],
    content: () => import('./win-rate-vs-profit-factor'),
  },
  {
    slug: 'risk-reward-ratio-guide',
    title: 'Risk-reward ratio: formula and how to calculate it',
    description:
      'What the risk-reward ratio is, the formula for long and short trades, how to calculate it step by step, and the win rate each ratio from 1:0.5 to 1:5 needs to break even.',
    tags: ['analytics', 'risk-management', 'intermediate'],
    publishedAt: '2026-04-26',
    updatedAt: '2026-11-21',
    readingTime: 6,
    summary:
      'The risk-reward ratio compares what a trade loses at its stop loss with what it makes at its take profit: risk = entry − stop, reward = target − entry, written 1 : (reward ÷ risk). Risking 5 to make 15 is 1 : 3, which breaks even when 1 ÷ (1 + 3) = 25% of trades win, before costs.',
    faq: [
      {
        question: 'What is the risk-reward ratio in trading?',
        answer:
          'The comparison between what a trade loses if the stop loss is hit and what it makes if the take profit is hit, written risk : reward with the risk as 1. A stop 10 points from the entry and a target 20 points away is 1 : 2.',
      },
      {
        question: 'What is the formula for risk-reward ratio?',
        answer:
          'For a long trade, risk = entry − stop loss and reward = take profit − entry; for a short, both are reversed. The ratio is risk : reward = 1 : (reward ÷ risk). Buying at 250 with a stop at 242 and a target at 270 gives 8 : 20, or 1 : 2.5.',
      },
      {
        question: 'What win rate do you need for a 1:2 risk-reward ratio?',
        answer:
          'More than 33.3% before costs, because the break-even win rate is 1 ÷ (1 + reward ÷ risk) = 1 ÷ 3. At 1:1 it is 50%, at 1:3 it is 25% and at 1:5 it is 16.7%; costs push each one higher.',
      },
      {
        question: 'Is a higher risk-reward ratio always better?',
        answer:
          'No. A target further away raises the ratio but is reached less often. If price moved randomly with no drift, the chance of reaching the target first would equal the break-even win rate at every ratio, so the ratio alone adds nothing; what matters is a win rate above the break-even for the ratio traded.',
      },
    ],
    howTo: {
      name: 'Calculate a risk-reward ratio',
      steps: [
        { name: 'Measure the risk', text: 'Subtract the stop loss from the entry for a long trade, or the entry from the stop loss for a short: 250 − 242 = 8.' },
        { name: 'Measure the reward', text: 'Subtract the entry from the take profit for a long trade, or the take profit from the entry for a short: 270 − 250 = 20.' },
        { name: 'Divide the reward by the risk', text: '20 ÷ 8 = 2.5, so the risk-reward ratio is 1 : 2.5.' },
        { name: 'Find the break-even win rate', text: '1 ÷ (1 + 2.5) = 28.6%: trades like this pay for their losses when more than 28.6% of them reach the target, before costs.' },
        { name: 'Convert it to money', text: 'Multiply the risk and the reward by the position size: 100 units risk 800 to make 2,000.' },
      ],
    },
    content: () => import('./risk-reward-ratio-guide'),
  },
  {
    slug: 'track-reduce-drawdown',
    title: 'How to track and reduce your maximum drawdown',
    description:
      'Understand drawdown types, the math of recovery, and practical strategies to protect your trading account.',
    tags: ['analytics', 'risk-management', 'drawdown'],
    publishedAt: '2026-04-27',
    readingTime: 7,
    summary:
      'Drawdown is the fall from an equity peak to a later low. Recovery is not symmetrical: a 20% drawdown needs a 25% gain and a 50% drawdown needs 100%. Fixed risk per trade, loss limits and reviewing what caused each drawdown keep it small.',
    faq: [
      {
        question: 'How is maximum drawdown calculated?',
        answer:
          'Track the running peak of your equity; drawdown at any point is (peak − current equity) ÷ peak. The largest value over the period is the maximum drawdown.',
      },
      {
        question: 'Why does a larger drawdown take so much longer to recover?',
        answer:
          'The gain needed is drawdown ÷ (1 − drawdown). After losing 30% you need about 43% to get back to the peak.',
      },
    ],
    content: () => import('./track-reduce-drawdown'),
  },
  {
    slug: 'trading-metrics-that-matter',
    title: 'Trading metrics that actually matter: beyond win rate',
    description:
      'Expectancy, Sharpe ratio, profit factor, average R-multiple — the metrics serious traders track and why.',
    tags: ['analytics', 'metrics', 'advanced'],
    publishedAt: '2026-04-28',
    readingTime: 9,
    summary:
      'Win rate alone says little. Expectancy, profit factor, average R, maximum drawdown, the longest losing streak and results by time of day together show whether a strategy makes money and how hard it is to trade.',
    faq: [
      {
        question: 'What is trading expectancy?',
        answer:
          'The average amount you can expect to win or lose per trade: (win rate × average win) − (loss rate × average loss). Measured in R, it is comparable across instruments.',
      },
      {
        question: 'Which trading metrics matter most for a beginner?',
        answer:
          'Start with expectancy and profit factor, both after fees. Add maximum drawdown and the longest losing streak to know how much pain the strategy brings.',
      },
    ],
    content: () => import('./trading-metrics-that-matter'),
  },
  {
    slug: 'build-trading-plan',
    title: 'How to build a trading plan that works',
    description:
      'Entry/exit criteria, risk rules, position sizing, daily limits, and a pre-market routine that keeps you disciplined.',
    tags: ['strategy', 'planning', 'discipline'],
    publishedAt: '2026-04-29',
    readingTime: 8,
    updatedAt: '2026-11-12',
    summary:
      'A trading plan writes down what you trade, when, how you enter and exit, how much you risk per trade, your daily loss limit and how you review. Tracking where reality differs from the plan is what makes it useful.',
    faq: [
      {
        question: 'What should a trading plan include?',
        answer:
          'Markets and instruments, trading hours, entry and exit criteria, risk per trade, daily and weekly loss limits, a pre-market routine and a review schedule.',
      },
      {
        question: 'How often should a trading plan change?',
        answer:
          'Only after a review with enough trades to show a pattern, usually monthly. Change one rule at a time so you can see its effect.',
      },
    ],
    content: () => import('./build-trading-plan'),
  },
  {
    slug: 'trading-psychology-managing-emotions',
    title: 'Trading psychology: managing emotions with data',
    description:
      'How objective trading data counters the fear/greed cycle and helps you make rational decisions under pressure.',
    tags: ['psychology', 'emotions', 'journaling'],
    publishedAt: '2026-04-30',
    readingTime: 7,
    summary:
      'Fear and greed show up in your trades as patterns: revenge trades after losses, oversized trades after wins, early exits. Recording what happened on each trade and comparing results by situation turns feelings into data you can act on.',
    faq: [
      {
        question: 'What is tilt in trading?',
        answer:
          'A state of emotional escalation, usually after a loss or a streak, in which a trader abandons the plan: larger size, more trades, moved stops.',
      },
      {
        question: 'How can a journal help with trading psychology?',
        answer:
          'It shows when emotional mistakes happen and what they cost, for example how trades taken right after a loss perform. Rules such as a cool-down after two losses can then be checked.',
      },
    ],
    content: () => import('./trading-psychology-managing-emotions'),
  },
  {
    slug: 'why-trading-rules-matter',
    title: 'Why trading rules matter more than trading signals',
    description:
      'Signals tell you what to trade. Rules tell you how to trade. Here is why the latter determines your success.',
    tags: ['strategy', 'rules', 'discipline'],
    publishedAt: '2026-05-01',
    readingTime: 6,
    updatedAt: '2026-11-12',
    summary:
      'Signals change with the market; rules decide how you behave in every market. Writing five or so checkable rules, marking which ones each trade broke, and comparing results with and without breaks shows which rules earn their place.',
    faq: [
      {
        question: 'What are examples of good trading rules?',
        answer:
          'Risk a fixed share of the account per trade, set the stop loss before entry, stop after a daily loss limit, no new trade after two losses in a row, and no trading around major news unless planned.',
      },
      {
        question: 'How do I know whether my rules work?',
        answer:
          'Split your trades into those that broke a rule and those that did not, and compare win rate, net P&L and drawdown. Your own data answers it.',
      },
    ],
    content: () => import('./why-trading-rules-matter'),
  },
  {
    slug: 'forex-trading-journal',
    title: 'Forex trading journal: what forex traders should track',
    description:
      'Pips vs dollar P&L, session timing, currency pair analysis, swap costs, and news event tracking for forex traders.',
    tags: ['forex', 'journaling', 'market-specific'],
    publishedAt: '2026-05-02',
    readingTime: 7,
    updatedAt: '2026-11-12',
    summary:
      'A forex journal needs fields a stock journal does not: P&L in pips and in money, the session (London, New York, Tokyo, Sydney), commission and swap, the spread at entry and major news events.',
    faq: [
      {
        question: 'Should I track forex results in pips or money?',
        answer:
          'Both. Pips show the quality of the trade idea; money shows the effect of position size, commission and swap.',
      },
      {
        question: 'Which forex session is best to trade?',
        answer:
          'It depends on the pair and your strategy; a journal answers it for you by grouping your own results by session and hour.',
      },
    ],
    content: () => import('./forex-trading-journal'),
  },
  {
    slug: 'day-trading-journal',
    title: 'Day trading journal: intraday-specific tracking tips',
    description:
      'Time-of-day analysis, overtrading detection, scalping metrics, and daily P&L limits for day traders.',
    tags: ['day-trading', 'journaling', 'market-specific'],
    publishedAt: '2026-05-03',
    readingTime: 7,
    summary:
      'Day traders should track time of day, trades per day, slippage, and results against a daily loss limit. These show overtrading and the hours that cost money, which a trade-by-trade view hides.',
    faq: [
      {
        question: 'How do I detect overtrading in my journal?',
        answer:
          'Compare the number of trades per day with the day\'s net result. If days with many trades are worse, a maximum-trades limit is worth trying.',
      },
      {
        question: 'What daily loss limit should a day trader use?',
        answer:
          'A common approach is a fixed share of the account, small enough that hitting it several days in a row does not end the account. Record when you hit it and whether you stopped.',
      },
    ],
    content: () => import('./day-trading-journal'),
  },
  {
    slug: 'prop-trading-challenges',
    title: 'Prop trading challenges: how to pass with better journaling',
    description:
      'FTMO, MFF, and TFT challenge rules, drawdown tracking, consistency requirements, and how journaling prevents failures.',
    tags: ['prop-trading', 'challenges', 'discipline'],
    publishedAt: '2026-05-04',
    readingTime: 8,
    summary:
      'Prop-firm challenges fail most often on two rules: the daily loss limit and the maximum drawdown. A daily checklist, fixed risk per trade and a journal of how close each day came to the limits keep you inside them.',
    faq: [
      {
        question: 'What are the main rules of a prop-firm challenge?',
        answer:
          'Usually a profit target, a daily loss limit, a maximum overall drawdown and sometimes a minimum number of trading days or a consistency rule. Each firm publishes its own; read them before you start.',
      },
      {
        question: 'How does a journal help pass a prop challenge?',
        answer:
          'It shows how much of the daily and overall limits each day used and which mistakes caused the worst days, so you can cut risk before a limit is hit.',
      },
    ],
    content: () => import('./prop-trading-challenges'),
  },
  {
    slug: 'trading-analytics-find-edge',
    title: 'How to use trading analytics to find your edge',
    description:
      'Equity curve analysis, hourly patterns, symbol performance, and session analysis to identify what works.',
    tags: ['analytics', 'advanced', 'edge'],
    publishedAt: '2026-05-05',
    readingTime: 9,
    updatedAt: '2026-11-12',
    summary:
      'An edge is a repeatable pattern with positive expectancy. Break your own results down by symbol, strategy, session, weekday and hour, check the number of trades behind each figure, and concentrate on the segments that hold up.',
    faq: [
      {
        question: 'What is a trading edge?',
        answer:
          'A set of conditions in which your trades have positive expectancy after fees, over a sample large enough to trust.',
      },
      {
        question: 'How many trades do I need before trusting a pattern?',
        answer:
          'There is no fixed number, but a segment with fewer than about 20 to 30 trades can easily be noise. Read the count beside every figure.',
      },
    ],
    content: () => import('./trading-analytics-find-edge'),
  },
  {
    slug: 'importing-trades-from-broker',
    title: 'Import trades from your broker: files, CSV and screenshots',
    description:
      'How to import broker trade files (Zerodha, Dhan, Upstox, Angel One, Groww, MT4, MT5), any CSV or Excel file, or screenshots into TradeQut, and what to check.',
    tags: ['tradequt', 'import', 'practical'],
    publishedAt: '2026-05-06',
    readingTime: 5,
    updatedAt: '2026-11-24',
    summary:
      'TradeQut imports trade files from Zerodha, Dhan, Upstox, Angel One, Groww, MetaTrader 4 and MetaTrader 5, or any CSV or Excel file with column matching, and reads screenshots with AI when there is no file. Every trade is reviewed before saving, duplicates are skipped, and Indian broker trades get estimated charges.',
    faq: [
      {
        question: 'Which brokers can TradeQut import from?',
        answer:
          'Zerodha (tradebook and P&L statement), Dhan, Upstox, Angel One, Groww, MetaTrader 4 and MetaTrader 5, plus any broker through a CSV or Excel file where you match the columns.',
      },
      {
        question: 'Does importing the same file twice create duplicate trades?',
        answer:
          'No. Trades already imported into the account are marked Already imported and skipped.',
      },
      {
        question: 'Does TradeQut connect to my broker automatically?',
        answer:
          'No. You upload the file your broker gives you. Automatic broker sync is planned for Pro and is not available yet.',
      },
    ],
    content: () => import('./importing-trades-from-broker'),
  },
  {
    slug: 'fo-trading-charges-india',
    title: 'F&O charges in India: the new STT, GST and a worked example',
    description:
      'Every charge on an F&O trade in India: the new STT rates from 1 April 2026 against the old, rates from Zerodha as of November 2026, and a worked net P&L example.',
    tags: ['india', 'charges', 'options', 'futures'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-21',
    readingTime: 8,
    summary:
      'An F&O trade pays brokerage, STT, exchange charges, a SEBI fee, GST and stamp duty. From 1 April 2026 STT is 0.05% on a futures sale (was 0.02%), 0.15% on an option sale (was 0.10%) and 0.15% on an exercised option (was 0.125%); delivery and intraday STT did not change. On a hypothetical option trade with a ₹1,000 gross gain, charges at Zerodha rates came to ₹72.83, leaving ₹927.17.',
    faq: [
      {
        question: 'What is the STT rate on options in 2026?',
        answer:
          'For trades executed on or after 1 April 2026, STT is 0.15% of the premium on an option sold, payable by the seller, and 0.15% of the intrinsic value on an option exercised, payable by the purchaser (NSE/FATAX/73524, 31 March 2026). Before that the rates were 0.10% and 0.125%. Check your contract notes for the rate applied to your trade.',
      },
      {
        question: 'Did STT on delivery and intraday trades change in 2026?',
        answer:
          'No. NSE/FATAX/73524 lists STT on equity shares as no change: 0.1% on the purchase and 0.1% on the sale of shares settled by delivery, and 0.025% on the sale of shares not settled by delivery (intraday), payable by the seller. The Finance Act, 2026 raised only the futures and options rates.',
      },
      {
        question: 'Is GST charged on STT?',
        answer: 'No. GST at 18% applies to brokerage, SEBI charges and exchange transaction charges, not to STT or stamp duty.',
      },
      {
        question: 'Do all brokers charge the same on F&O?',
        answer:
          'Brokerage differs between brokers. STT, stamp duty, SEBI charges and exchange charges are set by the government, SEBI and the exchanges, so they are the same up to rounding, but check your broker for its exact figures.',
      },
    ],
    content: () => import('./fo-trading-charges-india'),
  },
  {
    slug: 'zerodha-tradebook-pnl',
    title: 'How to analyse your Zerodha tradebook: download to net P&L',
    description:
      'How to analyse a Zerodha tradebook: download it from Console (CSV or XLSX, 365 days per file), match buys with sells, and add charges to get net P&L.',
    tags: ['india', 'zerodha', 'import', 'practical'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 5,
    summary:
      'In Zerodha Console go to Reports, then Tradebook, pick a segment and dates, and download CSV or XLSX; each export covers at most 365 days. The file lists executions, not closed trades or charges, so you must match buys with sells and add charges.',
    faq: [
      {
        question: 'How do I download my Zerodha tradebook?',
        answer:
          'Sign in to Console, open Reports then Tradebook, select the segment, choose a date range, click the arrow button and download as XLSX or CSV using the control beside the Download button.',
      },
      {
        question: 'How far back can I download the Zerodha tradebook?',
        answer: 'Zerodha allows a maximum of 365 days per download, so download one file per year for a longer history.',
      },
      {
        question: 'Does the tradebook include charges?',
        answer: 'No. It lists executions. Charges appear in your contract notes and in Console reports, so add them to get net P&L.',
      },
    ],
    howTo: {
      name: 'Download the Zerodha tradebook',
      steps: [
        { name: 'Open Console', text: 'Sign in at console.zerodha.com with your Kite credentials.' },
        { name: 'Open the report', text: 'Go to Reports, then Tradebook.' },
        { name: 'Filter', text: 'Select the segment and a date range of at most 365 days, then click the arrow button.' },
        { name: 'Download', text: 'Use the control beside the Download button to choose XLSX or CSV.' },
      ],
    },
    content: () => import('./zerodha-tradebook-pnl'),
  },
  {
    slug: 'best-free-trading-journal',
    title: 'Best free trading journal: what free plans really include',
    description:
      'Free trading journal plans compared on the limits that matter: monthly imports, accounts, asset classes and review tools. Read from vendor pages, November 2026.',
    tags: ['comparison', 'journaling', 'free'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 5,
    summary:
      'A spreadsheet is free but manual. TradesViz Basic is free with 3,000 executions a month and one account. TradeQut has no free plan: a 14-day free trial with every Pro feature, then read-only without Pro. Test two tools with your own broker file before choosing.',
    faq: [
      {
        question: 'Is there a completely free trading journal?',
        answer:
          'A spreadsheet is free without limits but needs manual work. TradesViz has a free plan with limits; TradeQut has a 14-day free trial and then needs Pro to add or edit trades. Limits change, so confirm on each vendor page.',
      },
      {
        question: 'What should a free trading journal include?',
        answer:
          'At least manual trade entry, notes and tags, a calendar or equity view and win rate, profit factor and drawdown. Check monthly import and account limits.',
      },
    ],
    content: () => import('./best-free-trading-journal'),
  },
  {
    slug: 'trading-journal-excel-template',
    title: 'Trading journal Excel template: free NSE F&O download',
    description:
      'Free NSE F&O trading journal template for Excel and CSV with estimated charges and net P&L, plus the columns and formulas to build your own in Excel or Google Sheets.',
    tags: ['journaling', 'template', 'excel'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-15',
    readingTime: 6,
    summary:
      'Download the free NSE F&O trading journal template (.xlsx or .csv): one row per round trip with estimated brokerage, STT, exchange charge, SEBI fee, stamp duty and GST, net P&L and a summary by setup and weekday. Charges are estimates from rates effective 1 April 2026; your contract note is the authority. To build your own sheet, net P&L is =IF(D2="Long",1,-1)*(F2-E2)*G2-H2 and R is net P&L divided by risk.',
    faq: [
      {
        question: 'Is there a free Excel template for NSE F&O trades?',
        answer:
          'Yes. The workbook on this page has a Journal sheet that estimates brokerage, STT, exchange charge, SEBI fee, stamp duty and GST for each futures or options round trip, a Rates sheet with effective dates and sources, and a Summary sheet by setup and weekday. A CSV with the same columns is also available.',
      },
      {
        question: 'How accurate are the charges in the F&O template?',
        answer:
          'They are estimates from the rates on its Rates sheet (effective 1 April 2026, last checked 15 November 2026). The contract note from your broker is the authority: amounts differ because of rounding, positions built from several orders and other broker plans.',
      },
      {
        question: 'What columns should a trading journal spreadsheet have?',
        answer:
          'Date, symbol, setup, direction, entry, exit, quantity, fees, risk in money, net P&L, R multiple and a mistake tag.',
      },
      {
        question: 'How do I calculate profit factor in Excel?',
        answer: 'Divide the sum of positive P&L by the absolute value of the sum of negative P&L, using SUMIF on the net P&L column.',
      },
    ],
    howTo: {
      name: 'Use the free NSE F&O trading journal template',
      steps: [
        { name: 'Download', text: 'Download the .xlsx file (or the CSV for plain values) from this page.' },
        { name: 'Enter your trades', text: 'Clear the input cells of the shaded sample rows on the Journal sheet and enter one row per closed trade.' },
        { name: 'Pick your broker plan', text: 'Choose your plan in cell B15 of the Rates sheet so the futures brokerage matches.' },
        { name: 'Name your setups', text: 'Type the setup names you use on the Summary sheet; the Journal offers them as a drop-down.' },
        { name: 'Read the summary', text: 'Check the Summary sheet for trades, wins, win rate, gross P&L, charges and net P&L by setup and by weekday.' },
      ],
    },
    content: () => import('./trading-journal-excel-template'),
  },
  {
    slug: 'options-trading-journal-india',
    title: 'Options trading journal in India: what to record',
    description:
      'The fields an options journal needs for Nifty and Bank Nifty trades: expiry, strike, structure, units, premium, charges, and the questions the data can answer.',
    tags: ['india', 'options', 'journaling'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 5,
    summary:
      'An options journal should record underlying, expiry, strike, call or put, buy or sell, quantity in units, entry and exit premium, planned stop, structure, charges, setup and a mistake tag. With these you can compare expiry-day trades and option buyers versus sellers.',
    faq: [
      {
        question: 'Why record quantity in units instead of lots?',
        answer: 'Exchanges revise lot sizes from time to time, so units keep old and new trades comparable.',
      },
      {
        question: 'Is a spread one trade or two?',
        answer: 'Record a spread as one trade with its legs, since the decision and the risk belong to the structure as a whole.',
      },
    ],
    content: () => import('./options-trading-journal-india'),
  },
  {
    slug: 'mt5-trading-journal',
    title: 'How to export MT5 trade history for a journal',
    description:
      'Export the MetaTrader 5 history report, check server time, commission and swap, and journal forex and prop-firm trades with the right fields.',
    tags: ['forex', 'mt5', 'prop-trading', 'import'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-24',
    readingTime: 5,
    summary:
      "In MetaTrader 5 open the Toolbox History tab, choose a period, right-click and pick Report. Report times are in broker server time, and commission and swap are separate columns. Journal pair, stop, risk in money, session and your firm's loss limits.",
    faq: [
      {
        question: 'How do I export my MT5 trade history?',
        answer: 'Open the Toolbox History tab, choose the period, right-click and select Report; MetaTrader 5 help describes the report as HTML.',
      },
      {
        question: 'Are MT5 report times in my local time zone?',
        answer: "No. They are in your broker's server time; convert them before analysing sessions or hours.",
      },
    ],
    content: () => import('./mt5-trading-journal'),
  },
  {
    slug: 'r-multiple-explained',
    title: 'R multiple explained: measure every trade in risk units',
    description:
      'What an R multiple is, how to compute it with a worked EURUSD example, and how to use R to compare trades, find rule breaks and size positions.',
    tags: ['metrics', 'risk', 'beginner'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 4,
    summary:
      "1R is the amount you lose if your stop is hit. A trade's R multiple is its result divided by that planned risk, so a trade that makes 1.7 times its risk is +1.7R in any market or currency. Losses bigger than 1R show broken stop rules.",
    faq: [
      {
        question: 'What is 1R in trading?',
        answer: 'The planned loss per trade if the stop is hit; results are then expressed as multiples of that amount.',
      },
      {
        question: 'Can an R multiple be less than -1?',
        answer: 'Yes, if you exit beyond your stop or slippage and fees add to the loss; a result below -1R is worth reviewing.',
      },
    ],
    content: () => import('./r-multiple-explained'),
  },
  {
    slug: 'trading-expectancy-formula',
    title: 'Trading expectancy formula: average R per trade',
    description:
      'Expectancy = win rate × average win − loss rate × average loss. Worked examples in R, why 35% win rates can beat 50%, and the sample size you need.',
    tags: ['metrics', 'analytics'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 4,
    summary:
      'Expectancy is the average result per trade: win rate times average win minus loss rate times average loss, ideally in R. A 40% win rate with 2R wins and 1R losses gives +0.2R per trade. Use at least 100 trades per setup before trusting it.',
    faq: [
      {
        question: 'How is expectancy calculated?',
        answer: 'Multiply win rate by average win and subtract loss rate multiplied by average loss, or average the R of every trade.',
      },
      {
        question: 'How many trades do I need to trust expectancy?',
        answer: 'At least about 100 trades per setup; fewer trades can swing the number widely.',
      },
    ],
    content: () => import('./trading-expectancy-formula'),
  },
  {
    slug: 'position-sizing-fixed-risk',
    title: 'Position sizing with fixed risk: formula and worked examples',
    description:
      'Fixed-risk position sizing: decide the money to risk, then size from the stop distance. Worked examples for Indian shares and forex lots.',
    tags: ['risk', 'position-sizing', 'beginner'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 4,
    summary:
      'Position size equals the money you will risk divided by the distance to your stop times the value per unit of price. With ₹5,00,000 and 1% risk, a ₹10 stop gives 500 shares; with $10,000 and 1% risk, a 20-pip stop gives 0.5 lots.',
    faq: [
      {
        question: 'How do I calculate position size from risk?',
        answer: 'Divide the amount you are willing to lose by the stop distance multiplied by the value of one unit of price movement.',
      },
      {
        question: 'Should I round position size up or down?',
        answer: 'Round down to the unit or lot step your broker allows, so risk never exceeds the plan.',
      },
    ],
    content: () => import('./position-sizing-fixed-risk'),
  },
  {
    slug: 'trading-drawdown-calculation',
    title: 'How to calculate trading drawdown: formula, recovery table',
    description:
      'Drawdown = (peak − current) ÷ peak. Worked example, the gain needed to recover from 10% to 50% drawdowns, and balance versus equity for prop-firm limits.',
    tags: ['risk', 'drawdown', 'metrics'],
    publishedAt: '2026-11-11',
    updatedAt: '2026-11-14',
    readingTime: 5,
    summary:
      'Drawdown is the fall from peak equity, as a percentage of the peak: from 1,10,000 to 99,000 is 10%. Recovering needs 1 ÷ (1 − drawdown) − 1, so 10% needs 11.1% and 50% needs 100%. Prop firms define their own limits, so use their rules.',
    faq: [
      {
        question: 'How do I calculate drawdown percentage?',
        answer: 'Subtract current equity from peak equity, divide by peak equity and multiply by 100.',
      },
      {
        question: 'What gain do I need to recover from a 20% drawdown?',
        answer: 'A 25% gain, because 1 ÷ (1 − 0.20) − 1 = 0.25.',
      },
    ],
    content: () => import('./trading-drawdown-calculation'),
  },
  {
    slug: 'mtm-vs-realised-pnl-futures-options',
    title: 'MTM vs realised P&L in futures and options',
    description:
      'One futures position shown three ways: P&L from entry, daily mark-to-market and realised P&L at exit. A worked example and a calculator whose totals reconcile.',
    tags: ['india', 'futures', 'options', 'metrics'],
    publishedAt: '2026-11-15',
    updatedAt: '2026-11-15',
    readingTime: 6,
    summary:
      'Futures are marked to market every day: each day’s credit or debit is the change from the previous settlement price, so daily figures look nothing like the P&L from your entry price. Their running total matches it, and the last total equals the realised P&L. Option premium settles on the trade instead.',
    faq: [
      {
        question: 'Why is my Kite P&L different from the funds page?',
        answer:
          'Zerodha explains that the positions page measures P&L from your entry price, while the ledger behind the funds page records a credit or debit each day for an open futures position, the change from the previous settlement price. Add up the daily entries and you reach the same total; the daily figures differ. Other brokers can measure from the previous settlement, so check your own broker’s wording.',
      },
      {
        question: 'Is futures MTM settled daily?',
        answer:
          'At the exchange, yes. NSE Clearing’s settlement page describes daily mark-to-market settlement for futures, with pay-in and pay-out on T+1 (T is the trade day), collected through clearing members. How and when your broker shows it on your ledger and funds page is the broker’s own, so check your contract note.',
      },
      {
        question: 'Why does my P&L change after the market closes?',
        answer:
          'During the day a positions page compares the last traded price with your entry price. Daily settlement uses a settlement price instead, which NSE Clearing bases on the volume-weighted average price of the last 30 minutes for futures, so a settlement-based figure can differ from the last price you saw. This page has not verified how each broker’s app updates after the close.',
      },
      {
        question: 'Does an open short option have daily mark-to-market?',
        answer:
          'Not as futures do. NSE Clearing describes premium settlement for options, with premium payable and receivable netted each day and settled on T+1, and daily mark-to-market under futures. Zerodha’s reply says short options have no M2M like futures but may need more margin as they move against you. This page does not calculate margin.',
      },
    ],
    howTo: {
      name: 'Reconcile one futures position by hand',
      steps: [
        { name: 'Note the position', text: 'Write down the direction, quantity (lots times lot size), entry price and exit price.' },
        { name: 'List the settlement prices', text: 'Write the settlement price for each day-end the position was open.' },
        {
          name: 'Work out each day’s MTM',
          text: 'Multiply (settlement minus previous reference) by the quantity. The first reference is the entry price, then each previous settlement.',
        },
        { name: 'Add the exit day', text: 'Add (exit price minus last settlement) times the quantity to the daily figures and add them all up.' },
        { name: 'Compare with realised P&L', text: 'Compute (exit price minus entry price) times the quantity. Before charges the two match.' },
      ],
    },
    content: () => import('./mtm-vs-realised-pnl-futures-options'),
  },
  {
    slug: 'gtt-order-charges',
    title: 'GTT order charges by broker: fees, validity and limits',
    description:
      'What Zerodha, Groww, Upstox, Angel One, Kotak Neo, ICICI Direct, Fyers, mStock, Dhan and 5paisa charge to place a GTT, what applies when it triggers, and its validity, from each broker’s pages.',
    tags: ['india', 'charges'],
    publishedAt: '2026-11-21',
    updatedAt: '2026-11-21',
    readingTime: 10,
    summary:
      'A GTT (good till triggered) order is held by your broker until the price reaches your trigger, then sent to the exchange as an order; it lasts up to a year at all ten brokers checked. Seven of the ten say placing one costs nothing extra (Angel One “usually”, ICICI Direct “typically”) and that their standard charges apply when it executes; Kotak Neo adds a ₹10 minimum for dealer-placed GTTs executed from T+1, and Dhan and 5paisa do not state charges.',
    faq: [
      {
        question: 'Is GTT free in Groww?',
        answer:
          'Placing one is. Groww’s help page says there are no extra charges for placing a GTT order. If it executes, Groww charges what a regular order pays: brokerage, STT, stamp duty, exchange transaction charges, SEBI turnover charges, the Investor Protection Fund Trust charge, DP charges on sells and GST.',
      },
      {
        question: 'What is a 1 year GTT order?',
        answer:
          'A GTT that waits up to a year for its trigger. Zerodha, Groww, Upstox, Angel One, Kotak Neo, ICICI Direct and Fyers keep a stock GTT for one year or 365 days and end an F&O GTT when the contract expires. If the trigger is not reached in that time, the GTT expires and you place a new one.',
      },
      {
        question: 'What is the GTT limit price?',
        answer:
          'The price of the limit order the broker sends when your trigger is reached: the trigger decides when the order goes to the exchange, the limit sets the worst price it can fill at. Zerodha suggests a limit above the trigger for a buy GTT and below it for a sell GTT; at Groww the limit is optional and without it a market order is placed; Angel One accepts limit orders only.',
      },
      {
        question: 'Which is better, AMO or GTT?',
        answer:
          'Neither in general; they do different jobs. An AMO is an order placed outside market hours that goes to the exchange at the next open. A GTT waits, for up to a year at the brokers checked, and sends an order only if the price reaches your trigger. The difference is whether you are waiting for the market to open or for a price.',
      },
      {
        question: 'Are there charges if a GTT never triggers?',
        answer:
          'None of the ten brokers’ pages read on 21 Nov 2026 describes one. The charges they list apply to the order a GTT sends once it triggers and executes, and a FYERS Team reply says there is no charge for the GTT itself before or after it triggers.',
      },
      {
        question: 'Does Kotak Neo charge for GTT orders?',
        answer:
          'Kotak Neo’s page says that from 18 Apr 2026 a GTT placed in the app or on the website pays your plan’s brokerage when it executes, without the earlier ₹49 minimum, and a GTT placed by a dealer and executed from T+1 pays at least ₹10. It does not mention a fee for placing one.',
      },
    ],
    content: () => import('./gtt-order-charges'),
  },
  {
    slug: 'long-buildup-short-covering-long-unwinding',
    title: 'Long build-up, short covering and long unwinding explained',
    description:
      'Price and open interest together: long build-up, short build-up, long unwinding and short covering in one table, the option-chain versions, worked examples and what each one cannot tell you.',
    tags: ['india', 'futures', 'options'],
    publishedAt: '2026-11-22',
    updatedAt: '2026-11-22',
    readingTime: 11,
    summary:
      'Long build-up, short build-up, long unwinding and short covering describe how a contract’s price and open interest moved together over the same period: price up with open interest up is a long build-up, price down with it up a short build-up, price down with it down long unwinding, and price up with it down short covering. They say which positions opened or closed, not what the price does next, and in an option chain the same four labels apply to each strike’s own premium.',
    faq: [
      {
        question: 'Is long build-up bullish or bearish?',
        answer:
          'It is commonly read as bullish, because the price rose while new contracts were opened. It describes one period, not a forecast: every new long has a new short against it, and a build-up today says nothing on its own about tomorrow.',
      },
      {
        question: 'Is short covering bullish or bearish?',
        answer:
          'Commonly read as bullish but weaker than a long build-up: the price rose while positions were closed, which is read as short sellers buying back. The buying stops when they have closed, and the same fall in open interest also closed long positions.',
      },
      {
        question: 'Is long unwinding bullish or bearish?',
        answer:
          'Commonly read as bearish, or as a rally losing support: the price fell while positions were closed. Profit-taking, rollover and expiry also close longs without any new view, so it does not mean the fall continues.',
      },
      {
        question: 'Is short build-up bullish or bearish?',
        answer:
          'Commonly read as bearish: the price fell while new contracts were opened. As many new longs were added, a short can be a hedge, and in options put writing is a short build-up in the put that is commonly read as bullish for the underlying.',
      },
      {
        question: 'What is the difference between long build-up and short covering?',
        answer:
          'Both have a rising price. In a long build-up open interest rises, so new positions are opening; in short covering it falls, so positions are closing. A price chart alone cannot tell them apart.',
      },
      {
        question: 'What does call unwinding mean in the option chain?',
        answer:
          'Call open interest at a strike fell. If the call’s premium rose, the four-way table calls it short covering in the call, writers buying back; if the premium fell, it is long unwinding, call holders selling. Some sources use the term for any fall in call open interest, so check the premium.',
      },
      {
        question: 'What do call writing and put writing mean in the option chain?',
        answer:
          'Writing means selling an option. On an option chain it usually means open interest at a strike rose while that option’s premium fell, a short build-up in the option. Call writing is commonly read as a ceiling and put writing as a floor, but premiums also fall with time alone, so the reading can mislead.',
      },
      {
        question: 'Where can I see open interest data?',
        answer:
          'On NSE’s option chain, in NSE Clearing’s daily open interest files, or in your broker’s option chain, which can only show what the exchange disseminates. Dhan’s help page says the exchange does not provide live open interest and updates it at intervals during the day.',
      },
    ],
    content: () => import('./long-buildup-short-covering-long-unwinding'),
  },
];

export const ALL_TAGS = [...new Set(BLOG_ARTICLES.flatMap((a) => a.tags))].sort();

export function getRelatedArticles(currentSlug: string, limit = 3) {
  const current = BLOG_ARTICLES.find((a) => a.slug === currentSlug);
  if (!current) return [];
  const shared = (a: (typeof BLOG_ARTICLES)[number]) => a.tags.filter((t) => current.tags.includes(t)).length;
  // Most shared tags first, then the newest.
  return BLOG_ARTICLES.filter((a) => a.slug !== currentSlug && shared(a) > 0)
    .sort((a, b) => shared(b) - shared(a) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}
