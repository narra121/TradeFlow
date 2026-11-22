import { A } from '@/content/components/ArticleParts';
import type { MetricTerm } from './types';

export const PROFIT_FACTOR: MetricTerm = {
  id: 'profit-factor',
  path: '/glossary/profit-factor',
  name: 'Profit factor',
  inText: 'profit factor',
  title: 'Profit factor: definition, formula and calculator',
  description:
    'Profit factor is gross profit ÷ gross loss. The formula, an eight-trade worked example, a calculator, and what the ratio hides about drawdown and luck.',
  definition:
    'Profit factor is the total money made by your winning trades divided by the total money lost by your losing trades, over the same set of closed trades. Above 1.00 the set made money, at exactly 1.00 it broke even and below 1.00 it lost; the ratio does not say how often you won or how far the account fell on the way.',
  formula: {
    words: (
      <>
        Add up the result of every winning trade: that is gross profit. Add up the result of every losing trade and drop the minus sign: that is gross
        loss. Divide the first by the second.
      </>
    ),
    lines: ['PF = Σ winning trades ÷ |Σ losing trades|', 'PF = (win rate × average win) ÷ (loss rate × average loss)'],
    key: (
      <>
        Σ means &ldquo;the sum of&rdquo; and the bars mean the size of the loss without its sign. The second line is the same number written with
        averages, which is how profit factor ties to win rate and payoff. A trade that closed at exactly zero drops out of both lines.
      </>
    ),
  },
  example: {
    heading: 'Worked example: eight trades',
    intro: 'Eight hypothetical trades in a US dollar account, each result already net of commission and spread.',
    caption: 'Eight hypothetical trades, net results',
    head: ['Trade', 'Result'],
    rows: [
      ['1', '+$120'],
      ['2', '−$80'],
      ['3', '+$45'],
      ['4', '−$60'],
      ['5', '+$210'],
      ['6', '−$80'],
      ['7', '−$35'],
      ['8', '+$90'],
    ],
    working: [
      'Gross profit = 120 + 45 + 210 + 90 = $465',
      'Gross loss = 80 + 60 + 80 + 35 = $255',
      'Profit factor = 465 ÷ 255 = 1.82',
      'Net result = 465 − 255 = +$210',
    ],
    after: 'The winners made $1.82 for every $1.00 the losers gave back. The calculator below starts with these two totals.',
  },
  calculator: {
    intro: 'Enter the two totals from your closed trades, in one currency.',
    limits: (
      <>
        It takes totals you have already added up. It does not deduct charges, count trades or look at the order of results, so use net figures from
        your statement or journal, one account currency at a time.
      </>
    ),
  },
  reading: (
    <>
      Read it as money made per unit of money lost: 1.82 means the winners returned $1.82 for each $1.00 the losers cost. It is a ratio over the whole
      set, so it does not grow with the number of trades the way net profit does.
    </>
  ),
  hides: [
    {
      lead: 'Drawdown and order.',
      text: (
        <>
          In the order listed, the eight trades never fall more than $115 below a high. Put the four losers first and the account is $255 down before
          the first winner, yet profit factor is still 1.82. For the depth of a losing stretch, see{' '}
          <A to="/glossary/maximum-drawdown">maximum drawdown</A>.
        </>
      ),
    },
    {
      lead: 'How much rests on one trade.',
      text: 'Remove the single +$210 trade and the other seven give 255 ÷ 255 = 1.00: every dollar of edge in this sample came from one result.',
    },
    {
      lead: 'How often you win.',
      text: 'The same 1.82 comes from four winners in eight, as here, or from one $465 winner and seven losers totalling $255. The ratio cannot tell them apart.',
    },
    {
      lead: 'Size per trade.',
      text: (
        <>
          Profit factor is 1.82 whether the $210 took 8 trades or 800. <A to="/glossary/expectancy">Expectancy</A>, the result per trade, separates
          the two.
        </>
      ),
    },
  ],
  mistakes: [
    {
      lead: 'Using results before charges.',
      text: 'Had the eight results been before a $4 commission per trade, the net totals are 449 and 271, and profit factor is 1.66, not 1.82.',
    },
    {
      lead: 'Averaging profit factors.',
      text: 'A month at 300 ÷ 100 = 3.00 and a month at 100 ÷ 400 = 0.25 average to 1.625, but together the two months made 400 and lost 500: 0.80, a losing period. Add the sums first, then divide.',
    },
    {
      lead: 'Treating scratch trades loosely.',
      text: 'A trade closed at exactly zero adds nothing to either sum. A “scratch” that cost $2 in commission is a $2 loss and belongs in gross loss; leaving it out flatters the ratio.',
    },
    {
      lead: 'Including open trades.',
      text: 'A paper profit on an open position can still disappear. Profit factor is computed on closed trades only.',
    },
    {
      lead: 'Mixing currencies.',
      text: 'Adding dollar and rupee results into one gross profit gives a number in no currency. Work it out per account currency.',
    },
  ],
  deeper: (
    <>
      <A to="/blog/win-rate-vs-profit-factor">Win rate vs profit factor</A> works through two full scenarios: an 80% win rate that loses money (profit
      factor 0.67) and a 35% win rate that makes it (2.69). <A to="/blog/trading-metrics-that-matter">Trading metrics that matter</A> puts profit factor
      beside expectancy, R-multiples and losing streaks. To get expectancy and profit factor after charges from a win rate and average win and loss, use
      the <A to="/resources/expectancy-calculator">expectancy calculator</A>.
    </>
  ),
  inJournal: (
    <>
      The TradeQut dashboard shows profit factor for the trades you import or log, one figure per account currency when you trade in more than one, and
      shows ∞ while there are wins and no losses.
    </>
  ),
  faq: [
    {
      question: 'What is a good profit factor?',
      answer:
        'There is no single number that is good for every trader, and this page does not set one. Above 1.00 the trades made money after whatever costs are in the figures. How far above 1.00 matters less than how many trades it rests on and whether one result carries it: remove the largest winner from the example and 1.82 becomes 1.00.',
    },
    {
      question: 'What does a profit factor below 1 mean?',
      answer: 'The losing trades cost more than the winning trades made, so the set lost money. At 0.80, each $1.00 lost was matched by only $0.80 of profit.',
    },
    {
      question: 'Why is profit factor undefined when there are no losing trades?',
      answer:
        'The formula divides by gross loss, and with no losses that is zero. Division by zero has no answer, so the calculator says "Not defined" rather than print a huge number. Some tools show ∞ instead; either way the figure means little until the sample contains losses.',
    },
    {
      question: 'What is the difference between profit factor and expectancy?',
      answer:
        'Profit factor is a ratio of totals, gross profit ÷ gross loss. Expectancy is the average result per trade, net profit ÷ number of trades. The example’s eight trades have a profit factor of 1.82 and an expectancy of +$26.25 a trade ($210 ÷ 8).',
    },
    {
      question: 'Does profit factor include commissions and spread?',
      answer:
        'Only if the results you add up are net of them. Gross results leave the costs out and make profit factor look higher; in the example, a $4 commission per trade moves it from 1.82 to 1.66.',
    },
  ],
};
