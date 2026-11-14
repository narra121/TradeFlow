import type { Insight, Review } from '@/types/insights';

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

/** The QA INR review of progress/leaf-2.1.md G5 (report §5.2), with a 7-day period so the week wording applies. */
export const qaInrReview = (): Review => ({
  version: 1,
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  baseline: { from: '2026-05-12', to: '2026-08-09', trades: 0 },
  verdict: {
    result: 'losing', process: 'poor', net: -56787.78, netR: -12.5676, tradesWithR: 23, cleanShare: 0.2174, stopShare: 1,
    keptToStopShare: 0.3529, insideCapShare: null, selfInflictedShare: 0.4646, headline: 'A losing period, partly self-inflicted.',
    text: 'A losing period, and nearly half of the loss came from trades that went past your own stop.',
  },
  theOne: {
    key: 'detector:beyondStop', source: 'detector', title: 'Losses beyond the stop', trades: 11, tradeIds: ids('b', 11),
    cost: 26382.89, costR: 6.0997, net: -67182.89, avgR: -1.5545, evidenceTrades: 11, label: 'too-few', verdict: 'watch', basis: 'accounting',
    ruleText: 'If price reaches my stop, I exit.', rule: { kind: 'exitAtStop' },
    replay: { actualNet: -56787.78, replayNet: -30404.89, removed: 0 },
    overlaps: [{ key: 'mistake:fomo', title: 'Tagged "FOMO"', shared: 4 }, { key: 'mistake:late entry', title: 'Tagged "Late Entry"', shared: 1 }, { key: 'mistake:overtrading', title: 'Tagged "Overtrading"', shared: 2 }],
    history: { weeksInRow: 3, lastWeekCount: 7, status: 'up' },
    text: '11 of 17 losing trades went past the stop, which cost ₹26,382.89 beyond plan. Had every loss ended at the stop you set, the period would have lost ₹30,404.89 instead of ₹56,787.78.',
  },
  more: [],
  different: [],
  watch: [
    {
      key: 'segment:weekday:fri', source: 'segment', title: 'Fridays', trades: 7, wins: 0, net: -51006.18, avgR: -1.3795, tradeIds: ids('f', 7), evidenceTrades: 7, label: 'too-few', paidSoFar: false,
      overlaps: [{ key: 'segment:symbol:nifty', title: 'NIFTY', shared: 4 }],
      text: 'Fridays: 7 trades, all lost, −₹51,006.18; 4 of them were NIFTY, so "Fridays" and "NIFTY" are largely the same trades. Too few trades to call.',
    },
    {
      key: 'detector:losersHeldLonger', source: 'detector', title: 'Losers held longer than winners', trades: 7, wins: 0, net: -38821.14, avgR: -1.2633, tradeIds: ids('l', 7), evidenceTrades: 7, label: 'too-few', paidSoFar: false,
      overlaps: [], text: 'Losers held longer than winners: 7 trades (all lost), −1.26R per trade, −₹38,821.14.',
    },
    {
      key: 'segment:direction:long', source: 'segment', title: 'Long trades', trades: 8, wins: 2, net: -37752.58, avgR: -0.7151, tradeIds: ids('g', 8), evidenceTrades: 8, label: 'too-few', paidSoFar: false,
      overlaps: [], text: 'Long trades: 8 trades (2 won), −0.72R per trade, −₹37,752.58.',
    },
    {
      key: 'mistake:moved stop loss', source: 'mistake', title: 'Tagged "Moved Stop Loss"', trades: 4, wins: 3, net: 1406.25, avgR: 0.7592, tradeIds: ids('m', 4), evidenceTrades: 4, label: 'too-few', paidSoFar: true,
      overlaps: [], text: 'Tagged "Moved Stop Loss": 4 trades (3 won), +0.76R per trade, ₹1,406.25. It has paid so far; that is not evidence that it works.',
    },
  ],
  resolved: [],
  muted: [],
});

export const reviewInsight = (p: Partial<Insight> = {}, r: Partial<Review> = {}): Insight => ({
  id: 'w1',
  createdAt: '2026-11-10T02:00:00.000Z',
  period: { from: '2026-11-03', to: '2026-11-09' },
  accountId: 'inr',
  summary: 'A losing period of 23 trades, net −₹56,787.78, and nearly half of the loss came from trades that went past their own stop.',
  sections: [{ kind: 'leak', title: 'Losses beyond the stop', body: 'Built by code from the review.' }],
  model: 'openai/gpt-6.1-terra',
  tradeCount: 23,
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  review: { ...qaInrReview(), ...r },
  ...p,
});
