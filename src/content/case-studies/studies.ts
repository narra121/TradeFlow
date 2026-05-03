import type { ComponentType } from 'react';

export interface CaseStudy {
  slug: string;
  title: string;
  description: string;
  traderType: string;
  market: string;
  duration: string;
  keyResult: string;
  publishedAt: string;
  content: () => Promise<{ default: ComponentType }>;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'day-trader-win-rate',
    title: 'How a Day Trader Went from 40% to 62% Win Rate in 3 Months',
    description:
      'A US equities day trader struggling with consistency discovers that lunchtime overtrading was destroying performance.',
    traderType: 'Day Trader',
    market: 'US Stocks',
    duration: '3 months',
    keyResult: '40% → 62% win rate',
    publishedAt: '2026-04-25',
    content: () => import('./day-trader-win-rate'),
  },
  {
    slug: 'ftmo-challenge-journal',
    title: "Passing the FTMO Challenge: A Prop Trader's Journal Strategy",
    description:
      'After failing two challenges, a forex prop trader uses disciplined journaling to pass FTMO in 18 trading days.',
    traderType: 'Prop Trader',
    market: 'Forex',
    duration: '18 trading days',
    keyResult: 'Passed FTMO on 3rd attempt',
    publishedAt: '2026-04-26',
    content: () => import('./ftmo-challenge-journal'),
  },
  {
    slug: 'revenge-trading-to-discipline',
    title: "From Revenge Trading to Discipline: A Swing Trader's Journey",
    description:
      'A crypto swing trader breaks the revenge trading cycle by logging emotional states and creating a cooling-off rule.',
    traderType: 'Swing Trader',
    market: 'Crypto',
    duration: '4 months',
    keyResult: 'Revenge trades: 30% → 5%',
    publishedAt: '2026-04-27',
    content: () => import('./revenge-trading-to-discipline'),
  },
  {
    slug: 'multi-account-management',
    title: 'Multi-Account Management: Tracking 3 Funded Accounts',
    description:
      'A funded forex trader consolidates tracking for FTMO, MFF, and personal accounts into a single journal.',
    traderType: 'Funded Trader',
    market: 'Forex',
    duration: '6 months',
    keyResult: '3 accounts tracked in 1 journal',
    publishedAt: '2026-04-28',
    content: () => import('./multi-account-management'),
  },
  {
    slug: 'forex-session-edge',
    title: 'How Analytics Revealed a Hidden Edge in Forex Sessions',
    description:
      'A forex trader with a flat equity curve discovers a 73% win rate during London/NY overlap using hourly analytics.',
    traderType: 'Forex Trader',
    market: 'Forex',
    duration: '2 months',
    keyResult: '41% → 73% win rate (session-filtered)',
    publishedAt: '2026-04-29',
    content: () => import('./forex-session-edge'),
  },
];
