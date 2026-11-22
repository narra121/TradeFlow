import { A } from '@/content/components/ArticleParts';
import type { MetricTerm } from './types';

export const WIN_RATE: MetricTerm = {
  id: 'win-rate',
  path: '/glossary/win-rate',
  name: 'Win rate',
  inText: 'win rate',
  title: 'Win rate: definition, formula and break-even calculator',
  description:
    'Win rate is winning trades ÷ trades × 100. How break-even trades change it, the break-even win rate for any payoff, a 20-trade example and a calculator.',
  definition:
    'Win rate is the percentage of closed trades that made a profit: winning trades divided by the trades counted, times 100. On its own it says how often you win but not how much, so it is read against the break-even win rate, the win rate at which your average win and average loss cancel out.',
  formula: {
    words: (
      <>
        Count the trades that closed with a profit and divide by the number of trades. The break-even win rate depends only on payoff, the average win
        divided by the average loss: it is one divided by one plus the payoff.
      </>
    ),
    lines: ['Win rate = wins ÷ (wins + losses + trades at zero) × 100', 'Break-even win rate = 1 ÷ (1 + average win ÷ average loss) × 100'],
    key: (
      <>
        Trades that closed at exactly zero count in the first line as trades that did not win. When comparing with the break-even win rate, use wins ÷
        (wins + losses) instead, leaving them out: a trade that made nothing neither helps nor hurts, and the break-even line assumes every trade is a
        win or a loss.
      </>
    ),
  },
  example: {
    heading: 'Worked example: twenty trades against break-even',
    intro: 'Twenty hypothetical closed trades. The winners averaged 1.6R and the losers 1.0R.',
    caption: 'Twenty hypothetical trades by outcome',
    head: ['Outcome', 'Trades'],
    rows: [
      ['Won', '9'],
      ['Lost', '10'],
      ['Closed at zero', '1'],
      ['Total', '20'],
    ],
    working: [
      'Win rate = 9 ÷ 20 × 100 = 45.0%',
      'Without the zero trade = 9 ÷ 19 × 100 = 47.4%',
      'Payoff = 1.6R ÷ 1.0R = 1.6, so break-even = 1 ÷ (1 + 1.6) × 100 = 38.5%',
      '47.4% is 8.9 points above break-even: 9 × 1.6R − 10 × 1.0R = +4.4R',
    ],
    after: 'At a payoff of 1.0 the same 45% would be below the 50% break-even. The calculator below starts with these counts.',
  },
  calculator: {
    intro: 'Enter counts of closed trades and, for the break-even comparison, your realised payoff.',
    limits: (
      <>
        It counts trades. Payoff should be the realised average win ÷ average loss of the same trades, not the target you plan, and a trade is a win
        only if it made money after charges. It does not estimate how much the win rate could move over the next trades.
      </>
    ),
  },
  reading: (
    <>
      Read win rate only next to payoff. 45% is above break-even at a payoff of 1.6 and below it at a payoff of 1.0, where break-even is 50%. A rising
      win rate is good news only if payoff has not fallen with it: taking profits earlier raises one and lowers the other.
    </>
  ),
  hides: [
    {
      lead: 'Size.',
      text: (
        <>
          A high win rate with small wins and large losses loses money; <A to="/blog/win-rate-vs-profit-factor">win rate vs profit factor</A> works
          through an 80% example that does, and <A to="/glossary/profit-factor">profit factor</A> is the ratio that captures size.
        </>
      ),
    },
    {
      lead: 'How settled the number is.',
      text: 'In 20 trades each trade is 5 points of win rate, so two results going the other way move it from 45% to 35% or 55%.',
    },
    {
      lead: 'Costs.',
      text: 'A trade that closed slightly up before commission can be a loss after it. Win rate from gross results counts it as a win.',
    },
  ],
  mistakes: [
    {
      lead: 'Splitting one position into several trades.',
      text: 'Scaling out in three parts can record three wins for one decision. Count the position once, at its total net result.',
    },
    {
      lead: 'Using the planned reward:risk as payoff.',
      text: 'A plan of 1:2 that is usually closed early may realise a payoff of 1.3, which needs 43.5% to break even, not 33.3%.',
    },
    {
      lead: 'Switching how trades at zero are counted.',
      text: '45% and 47.4% describe the same twenty trades. Pick one rule, keep it, and say which one a quoted figure uses.',
    },
    {
      lead: 'Counting results before charges.',
      text: 'Decide wins and losses on net P&L; on small winners, commission and spread decide which side of zero the trade lands.',
    },
    {
      lead: 'Counting an open position as a win.',
      text: 'An open position showing a profit is not a win until it closes.',
    },
  ],
  deeper: (
    <>
      <A to="/blog/win-rate-vs-profit-factor">Win rate vs profit factor</A> sets a high-win-rate account that loses money beside a low-win-rate one that
      makes it. For the break-even win rate after charges and a table by reward:risk, use the{' '}
      <A to="/resources/expectancy-calculator">expectancy calculator</A>; for the chance that a win rate, payoff and risk per trade reach a drawdown you choose, the{' '}
      <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A>.
    </>
  ),
  inJournal: (
    <>
      In TradeQut, the dashboard&apos;s win rate is winning trades ÷ all trades, so trades at zero are in the total, and the Overview tab of Analytics
      shows win rate, with the range it probably lies in, against the break-even win rate.
    </>
  ),
  faq: [
    {
      question: 'What win rate do I need to break even?',
      answer:
        'It depends on payoff: break-even = 1 ÷ (1 + average win ÷ average loss). At a payoff of 1 it is 50%, at 2 it is 33.3%, at 3 it is 25%, and at 0.5, wins half the size of losses, it is 66.7%. Charges push each of these up.',
    },
    {
      question: 'Do break-even trades count in win rate?',
      answer:
        'Conventions differ. Counting them in the total gives 45% in the example; leaving them out gives 47.4%. Either works if it is used consistently, but the comparison with the break-even win rate should leave them out.',
    },
    {
      question: 'Is a 60% win rate good?',
      answer:
        'Not on its own. At a payoff of 0.5 the break-even win rate is 66.7%, so 60% loses money; at a payoff of 1 it is 10 points above break-even. Payoff decides.',
    },
    {
      question: 'Are win rate, hit rate, strike rate and accuracy the same?',
      answer:
        'They are different names used for the same count: winning trades as a share of trades. Before comparing two quoted figures, check whether each counts trades that closed at zero.',
    },
    {
      question: 'How do partial exits affect win rate?',
      answer:
        'If each part is logged as its own trade, one position closed in three pieces counts as three trades, usually three wins. Count the position once, using its total net result.',
    },
  ],
};
