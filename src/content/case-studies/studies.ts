import type { ComponentType } from 'react';

/** Every entry is an illustrative scenario with hypothetical data, never a real customer or an outcome claim. */
export interface CaseStudy {
  slug: string;
  title: string;
  description: string;
  /** Kind of trader the scenario is about. */
  traderType: string;
  market: string;
  /** Review window the example assumes. */
  duration: string;
  /** The analysis the scenario demonstrates. */
  method: string;
  publishedAt: string;
  updatedAt?: string;
  content: () => Promise<{ default: ComponentType }>;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'day-trader-win-rate',
    title: 'Scenario: finding the hours that lose money',
    description:
      'An illustrative walk-through of grouping day trades by entry time to see which hours cost money, using hypothetical data.',
    traderType: 'Day trader',
    market: 'US stocks',
    duration: '100+ trades',
    method: 'Group trades by entry window',
    publishedAt: '2026-04-25',
    updatedAt: '2026-11-11',
    content: () => import('./day-trader-win-rate'),
  },
  {
    slug: 'ftmo-challenge-journal',
    title: 'Scenario: tracking prop-firm loss limits in a journal',
    description:
      'An illustrative walk-through of tracking daily and overall loss limits trade by trade during a prop-firm evaluation, using hypothetical data.',
    traderType: 'Prop trader',
    market: 'Forex',
    duration: 'One evaluation',
    method: 'Rules and room-to-limit log',
    publishedAt: '2026-04-26',
    updatedAt: '2026-11-11',
    content: () => import('./ftmo-challenge-journal'),
  },
  {
    slug: 'revenge-trading-to-discipline',
    title: 'Scenario: spotting revenge trades with tags and a cooling-off rule',
    description:
      'An illustrative walk-through of tagging emotions and after-loss entries to see whether revenge trading shows up, using hypothetical data.',
    traderType: 'Swing trader',
    market: 'Crypto',
    duration: '100+ trades',
    method: 'Emotion tag + after-loss flag',
    publishedAt: '2026-04-27',
    updatedAt: '2026-11-11',
    content: () => import('./revenge-trading-to-discipline'),
  },
  {
    slug: 'multi-account-management',
    title: 'Scenario: keeping several accounts separate in one journal',
    description:
      'An illustrative layout for tracking a personal account and two prop accounts with different rules and currencies, using hypothetical data.',
    traderType: 'Multi-account trader',
    market: 'Forex',
    duration: 'Ongoing',
    method: 'One journal account per real account',
    publishedAt: '2026-04-28',
    updatedAt: '2026-11-11',
    content: () => import('./multi-account-management'),
  },
  {
    slug: 'forex-session-edge',
    title: 'Scenario: comparing forex sessions with hourly analytics',
    description:
      'An illustrative walk-through of comparing Asia, London and New York sessions and checking whether the sample is large enough, using hypothetical data.',
    traderType: 'Forex trader',
    market: 'Forex',
    duration: '100+ trades',
    method: 'Session tag + sample-size check',
    publishedAt: '2026-04-29',
    updatedAt: '2026-11-11',
    content: () => import('./forex-session-edge'),
  },
];
