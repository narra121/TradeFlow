import type { ComponentType } from 'react';

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  readingTime: number;
  featured: boolean;
  content: () => Promise<{ default: ComponentType }>;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-keep-trading-journal',
    title: 'How to Keep a Trading Journal: The Complete Guide',
    description:
      'Learn why a trading journal is essential for trading success and how to build one that actually improves your performance.',
    tags: ['beginner', 'journaling', 'discipline'],
    publishedAt: '2026-04-20',
    readingTime: 8,
    featured: true,
    content: () => import('./how-to-keep-trading-journal'),
  },
  {
    slug: 'trading-journal-template',
    title: 'Trading Journal Template: What Every Entry Should Include',
    description:
      'The essential fields and optional context every trade entry needs. Stop guessing what to log — use this template.',
    tags: ['beginner', 'journaling', 'template'],
    publishedAt: '2026-04-21',
    readingTime: 6,
    featured: false,
    content: () => import('./trading-journal-template'),
  },
  {
    slug: 'mistakes-new-traders-make',
    title: '5 Mistakes New Traders Make (And How a Journal Fixes Them)',
    description:
      'Revenge trading, overtrading, no plan, ignoring risk, and never reviewing. Here is how journaling solves each one.',
    tags: ['beginner', 'psychology', 'mistakes'],
    publishedAt: '2026-04-22',
    readingTime: 7,
    featured: true,
    content: () => import('./mistakes-new-traders-make'),
  },
  {
    slug: 'how-to-review-trades',
    title: 'How to Review Your Trades: A Weekly Routine',
    description:
      'A systematic weekly review process that helps you spot patterns, fix mistakes, and track progress over time.',
    tags: ['beginner', 'review', 'routine'],
    publishedAt: '2026-04-23',
    readingTime: 6,
    featured: false,
    content: () => import('./how-to-review-trades'),
  },
  {
    slug: 'getting-started-tradequt',
    title: 'Getting Started with TradeQut: Your First 30 Days',
    description:
      'A day-by-day guide to setting up TradeQut, logging your first trades, and using analytics to improve.',
    tags: ['beginner', 'tradequt', 'onboarding'],
    publishedAt: '2026-04-24',
    readingTime: 5,
    featured: false,
    content: () => import('./getting-started-tradequt'),
  },
  {
    slug: 'win-rate-vs-profit-factor',
    title: 'Win Rate vs Profit Factor: Which Matters More?',
    description:
      'A deep dive into two critical trading metrics with math, examples, and scenarios showing why profit factor often matters more.',
    tags: ['analytics', 'metrics', 'intermediate'],
    publishedAt: '2026-04-25',
    readingTime: 8,
    featured: true,
    content: () => import('./win-rate-vs-profit-factor'),
  },
  {
    slug: 'risk-reward-ratio-guide',
    title: 'Understanding Risk-Reward Ratio: A Practical Guide',
    description:
      'How to calculate R:R, why 1:2 is the minimum, breakeven win rates per ratio, and real trade examples.',
    tags: ['analytics', 'risk-management', 'intermediate'],
    publishedAt: '2026-04-26',
    readingTime: 7,
    featured: false,
    content: () => import('./risk-reward-ratio-guide'),
  },
  {
    slug: 'track-reduce-drawdown',
    title: 'How to Track and Reduce Your Maximum Drawdown',
    description:
      'Understand drawdown types, the math of recovery, and practical strategies to protect your trading account.',
    tags: ['analytics', 'risk-management', 'drawdown'],
    publishedAt: '2026-04-27',
    readingTime: 7,
    featured: false,
    content: () => import('./track-reduce-drawdown'),
  },
  {
    slug: 'trading-metrics-that-matter',
    title: 'Trading Metrics That Actually Matter: Beyond Win Rate',
    description:
      'Expectancy, Sharpe ratio, profit factor, average R-multiple — the metrics serious traders track and why.',
    tags: ['analytics', 'metrics', 'advanced'],
    publishedAt: '2026-04-28',
    readingTime: 9,
    featured: false,
    content: () => import('./trading-metrics-that-matter'),
  },
  {
    slug: 'build-trading-plan',
    title: 'How to Build a Trading Plan That Works',
    description:
      'Entry/exit criteria, risk rules, position sizing, daily limits, and a pre-market routine that keeps you disciplined.',
    tags: ['strategy', 'planning', 'discipline'],
    publishedAt: '2026-04-29',
    readingTime: 8,
    featured: false,
    content: () => import('./build-trading-plan'),
  },
  {
    slug: 'trading-psychology-managing-emotions',
    title: 'Trading Psychology: Managing Emotions with Data',
    description:
      'How objective trading data counters the fear/greed cycle and helps you make rational decisions under pressure.',
    tags: ['psychology', 'emotions', 'journaling'],
    publishedAt: '2026-04-30',
    readingTime: 7,
    featured: false,
    content: () => import('./trading-psychology-managing-emotions'),
  },
  {
    slug: 'why-trading-rules-matter',
    title: 'Why Trading Rules Matter More Than Trading Signals',
    description:
      'Signals tell you what to trade. Rules tell you how to trade. Here is why the latter determines your success.',
    tags: ['strategy', 'rules', 'discipline'],
    publishedAt: '2026-05-01',
    readingTime: 6,
    featured: false,
    content: () => import('./why-trading-rules-matter'),
  },
  {
    slug: 'forex-trading-journal',
    title: 'Forex Trading Journal: What Forex Traders Should Track',
    description:
      'Pips vs dollar P&L, session timing, currency pair analysis, swap costs, and news event tracking for forex traders.',
    tags: ['forex', 'journaling', 'market-specific'],
    publishedAt: '2026-05-02',
    readingTime: 7,
    featured: false,
    content: () => import('./forex-trading-journal'),
  },
  {
    slug: 'day-trading-journal',
    title: 'Day Trading Journal: Intraday-Specific Tracking Tips',
    description:
      'Time-of-day analysis, overtrading detection, scalping metrics, and daily P&L limits for day traders.',
    tags: ['day-trading', 'journaling', 'market-specific'],
    publishedAt: '2026-05-03',
    readingTime: 7,
    featured: false,
    content: () => import('./day-trading-journal'),
  },
  {
    slug: 'prop-trading-challenges',
    title: 'Prop Trading Challenges: How to Pass with Better Journaling',
    description:
      'FTMO, MFF, and TFT challenge rules, drawdown tracking, consistency requirements, and how journaling prevents failures.',
    tags: ['prop-trading', 'challenges', 'discipline'],
    publishedAt: '2026-05-04',
    readingTime: 8,
    featured: true,
    content: () => import('./prop-trading-challenges'),
  },
  {
    slug: 'trading-analytics-find-edge',
    title: 'How to Use Trading Analytics to Find Your Edge',
    description:
      'Equity curve analysis, hourly patterns, symbol performance, and session analysis to identify what works.',
    tags: ['analytics', 'advanced', 'edge'],
    publishedAt: '2026-05-05',
    readingTime: 9,
    featured: false,
    content: () => import('./trading-analytics-find-edge'),
  },
  {
    slug: 'importing-trades-from-broker',
    title: 'Importing Trades from Your Broker: CSV, Screenshots, and AI Extraction',
    description:
      'Step-by-step guide to importing trades via CSV files, broker screenshots, and clipboard paste with AI extraction.',
    tags: ['tradequt', 'import', 'practical'],
    publishedAt: '2026-05-06',
    readingTime: 5,
    featured: false,
    content: () => import('./importing-trades-from-broker'),
  },
];

export const ALL_TAGS = [...new Set(BLOG_ARTICLES.flatMap((a) => a.tags))].sort();

export function getRelatedArticles(currentSlug: string, limit = 3) {
  const current = BLOG_ARTICLES.find((a) => a.slug === currentSlug);
  if (!current) return [];
  return BLOG_ARTICLES.filter(
    (a) => a.slug !== currentSlug && a.tags.some((t) => current.tags.includes(t))
  ).slice(0, limit);
}
