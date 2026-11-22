import { A } from '@/content/components/ArticleParts';
import type { MetricTerm } from './types';

export const MAXIMUM_DRAWDOWN: MetricTerm = {
  id: 'maximum-drawdown',
  path: '/glossary/maximum-drawdown',
  name: 'Maximum drawdown',
  inText: 'maximum drawdown',
  title: 'Maximum drawdown: definition, formula and calculator',
  description:
    'Maximum drawdown is the largest fall from a peak to a later low. The formula, a worked example, percent against money, and a calculator for balances or returns.',
  definition:
    'Maximum drawdown is the largest fall in an account’s value from a peak to a later low, before a new peak is reached, over the period measured. It is usually given as a percentage of that peak, sometimes in money, and it describes the worst stretch that has already happened, not the worst that can.',
  formula: {
    words: (
      <>
        Go through the balances in order, keeping the highest value reached so far. At each point the drawdown is the fall from that running peak,
        divided by the peak. Maximum drawdown is the largest of these.
      </>
    ),
    lines: [
      'Drawdown at t = (peak up to t − value at t) ÷ peak up to t',
      'Maximum drawdown = the largest drawdown at any t',
      'Gain to recover = drawdown ÷ (1 − drawdown)',
    ],
    key: (
      <>
        Here the denominator is the running peak. Some tools divide by the starting balance instead, TradeQut among them, which gives a different
        percentage once the account has grown; the example shows both.
      </>
    ),
  },
  example: {
    heading: 'Worked example: eleven balances',
    intro: 'Hypothetical closing balances of an account that started at 10,000, with no deposits or withdrawals.',
    caption: 'Eleven hypothetical balances and the fall from the running peak',
    head: ['Point', 'Balance', 'Peak so far', 'Below the peak'],
    rows: [
      ['1', '10,000', '10,000', '0'],
      ['2', '10,400', '10,400', '0'],
      ['3', '10,100', '10,400', '300 (2.9%)'],
      ['4', '10,900', '10,900', '0'],
      ['5', '10,250', '10,900', '650 (6.0%)'],
      ['6', '9,800', '10,900', '1,100 (10.1%)'],
      ['7', '10,300', '10,900', '600 (5.5%)'],
      ['8', '11,200', '11,200', '0'],
      ['9', '13,000', '13,000', '0'],
      ['10', '11,800', '13,000', '1,200 (9.2%)'],
      ['11', '12,600', '13,000', '400 (3.1%)'],
    ],
    working: [
      'Maximum drawdown = 1,100 ÷ 10,900 = 10.09%, from point 4 to point 6; the balance was back above 10,900 at point 8',
      'Gain needed from the low = 1,100 ÷ 9,800 = 11.22%',
      'The largest fall in money is another stretch: 13,000 to 11,800 = 1,200, only 9.23% of its higher peak',
      'Divided by the 10,000 starting balance instead, the largest fall is 1,200 ÷ 10,000 = 12.0%',
    ],
    after: 'Three different figures, 10.09%, 1,200 and 12.0%, describe one account, so say which one you quote. The calculator below starts with this series.',
  },
  calculator: {
    intro: 'Paste balances in time order, or returns per period in percent.',
    limits: (
      <>
        It measures the values you enter at the frequency you enter them: daily closing balances miss a fall and recovery inside the day, and
        closed-trade balances miss open positions. It does not separate deposits and withdrawals from trading results; take them out first.
      </>
    ),
  },
  reading: (
    <>
      Maximum drawdown is the depth of the worst stretch so far. 10.09% means that at one point the account was 10.09% below its highest level, and it
      needed an 11.22% gain from the low to get back. The deeper the fall, the larger the gain needed: an account that halves has to double to recover.
    </>
  ),
  hides: [
    {
      lead: 'How long it lasted.',
      text: 'The worst stretch in the example ran from point 4 to point 8. Another account can have the same depth and stay below its peak for most of a year; time below the peak is a separate measure.',
    },
    {
      lead: 'What comes next.',
      text: (
        <>
          The past maximum is the worst of one sequence of results, not a limit on the next. The{' '}
          <A to="/resources/equity-curve-simulator">equity curve simulator</A> plays a win rate, payoff and risk per trade forward many times and shows
          how deep drawdowns get across the runs.
        </>
      ),
    },
    {
      lead: 'How often it happens.',
      text: 'One 10% fall in a year and ten falls of 9% have nearly the same maximum drawdown and very different years.',
    },
  ],
  mistakes: [
    {
      lead: 'Mixing percent and money.',
      text: 'In the example the largest money fall (1,200) and the largest percentage fall (10.09%) are different stretches. Say which one you mean.',
    },
    {
      lead: 'Calling a starting-balance figure the same number.',
      text: '1,200 ÷ 10,000 = 12.0% is a valid measure, and some tools use it, but it is not the peak-based 10.09%.',
    },
    {
      lead: 'Counting deposits and withdrawals as results.',
      text: 'A 2,000 withdrawal looks like a 2,000 drawdown in the balance. Remove cash movements, or measure on returns, before calculating.',
    },
    {
      lead: 'Using closed-trade balances when the question is equity.',
      text: 'A position that was 15% under water and then closed at a 2% loss shows only the 2% in a list of closing balances.',
    },
    {
      lead: 'Measuring from the start only.',
      text: 'An account that grew 30% and then fell back to where it started has had a drawdown of 23.1% (0.3 ÷ 1.3), not zero.',
    },
  ],
  deeper: (
    <>
      <A to="/blog/trading-drawdown-calculation">Drawdown calculation explained</A> covers balance against equity and why funded-account rules differ,
      with a table of the gain needed to recover. <A to="/blog/track-reduce-drawdown">Tracking and reducing drawdown</A> covers daily, trailing and
      maximum drawdown and how a journal finds the trades inside the worst stretch. For a prop firm&apos;s daily and overall limits, use the{' '}
      <A to="/resources/prop-firm-drawdown-calculator">prop firm drawdown calculator</A>, and for the chance of reaching a drawdown you choose, the{' '}
      <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A>.
    </>
  ),
  inJournal: (
    <>
      TradeQut&apos;s Max drawdown is the largest peak-to-low fall divided by the account&apos;s starting balance, the second method above, and the
      Risk tab of Analytics shows drawdown beside risk per trade.
    </>
  ),
  faq: [
    {
      question: 'What is the difference between drawdown and maximum drawdown?',
      answer:
        'Drawdown is how far the account is below its peak at a given moment, and it changes with every new balance. Maximum drawdown is the largest of those values over the whole period. At the last point of the example the drawdown is 3.1%, while the maximum drawdown is 10.09%.',
    },
    {
      question: 'How do you calculate maximum drawdown from returns?',
      answer:
        'Turn the returns into a value series first: start at 100 and multiply by (1 + return) each period, then measure falls from the running peak. Returns of +5%, −3% and −4% take 100 to 105, 101.85 and 97.78, a drawdown of 6.88% from 105, not 7%, because the second fall is on a smaller amount.',
    },
    {
      question: 'Does a withdrawal count as drawdown?',
      answer:
        'It should not. Taking cash out lowers the balance without a trading loss, so remove deposits and withdrawals, or work from returns, before measuring drawdown.',
    },
    {
      question: 'What gain is needed to recover from a drawdown?',
      answer: 'Drawdown ÷ (1 − drawdown). A 10.09% fall needs 11.22%, a 20% fall 25% and a 50% fall 100%.',
    },
    {
      question: 'Is maximum drawdown the same as a prop firm’s maximum loss limit?',
      answer:
        'Not necessarily. A firm sets its own reference point and reset rules in its terms, so the same account can show different figures there and here. Check your firm’s current rules; the prop firm drawdown calculator handles static and trailing limits.',
    },
  ],
};
