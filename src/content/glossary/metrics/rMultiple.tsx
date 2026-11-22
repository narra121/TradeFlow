import { A } from '@/content/components/ArticleParts';
import type { MetricTerm } from './types';

export const R_MULTIPLE: MetricTerm = {
  id: 'r-multiple',
  path: '/glossary/r-multiple',
  name: 'R-multiple',
  inText: 'an R-multiple',
  title: 'R-multiple: definition, formula and calculator',
  description:
    'An R-multiple is a trade’s result divided by its planned risk, entry to stop. One formula for longs and shorts, a worked short trade and a calculator.',
  definition:
    'An R-multiple is a trade’s result divided by the amount you planned to risk on it, which is the distance from entry to the initial stop times the position size. A trade closed exactly at its stop is −1R and one that made twice its risk is +2R, so every trade is measured in the same unit whatever the market, currency or size.',
  formula: {
    words: (
      <>
        Take how far the price moved from entry to exit, and divide it by how far the initial stop was from the entry. In money, divide the
        trade&apos;s net result by the money that would have been lost at the initial stop.
      </>
    ),
    lines: ['R = (exit − entry) ÷ (entry − stop)', 'R = net P&L ÷ initial risk'],
    key: (
      <>
        The first line works for shorts as well as longs: on a short both brackets change sign, so a short that falls towards its target still comes
        out positive. Initial risk is stop distance × quantity, times the value of one point for futures, options or forex. The price units cancel,
        so R reads the same whether the distances are in pips, points or rupees.
      </>
    ),
  },
  example: {
    heading: 'Worked example: a short trade, then a gap through a stop',
    intro: 'A hypothetical short sale of 50 shares.',
    caption: 'A hypothetical short trade',
    head: ['', 'Price'],
    rows: [
      ['Entry (sell)', '₹1,450'],
      ['Initial stop', '₹1,470'],
      ['Exit (buy back)', '₹1,412'],
    ],
    working: [
      'Risk per share = 1,470 − 1,450 = ₹20, so 1R = 20 × 50 = ₹1,000',
      'R = (1,412 − 1,450) ÷ (1,450 − 1,470) = −38 ÷ −20 = +1.9R',
      'Gross profit = 38 × 50 = ₹1,900; after ₹60 of charges, (1,900 − 60) ÷ 1,000 = +1.84R',
    ],
    after: (
      <>
        A second, losing trade: long GBP/USD at 1.2700 with the stop at 1.2675, filled at 1.2668 when the price gapped through the stop. R = (1.2668 −
        1.2700) ÷ (1.2700 − 1.2675) = −0.0032 ÷ 0.0025 = −1.28R, a loss larger than the plan because the fill was 7 pips past the stop.
      </>
    ),
  },
  calculator: {
    intro: 'Pick the direction and enter the three prices. The stop is the initial stop, the one set at entry.',
    limits: (
      <>
        It works in price per unit, so the R it shows is before charges; to include them, divide net P&amp;L by the money at risk, as in the example.
        It assumes one entry and one exit. For a position built or closed in parts, use the average entry and exit prices.
      </>
    ),
  },
  reading: (
    <>
      R says how a trade did against what you were prepared to lose. Between −1R and 0 is a loss cut before the stop; −1R is the stop doing its job;
      below −1R the loss ran past the plan, through slippage, a gap or a stop moved further away. Positive R is how many times its risk the trade
      paid. Averaged over many trades, R becomes <A to="/glossary/expectancy">expectancy</A> in R.
    </>
  ),
  hides: [
    {
      lead: 'Whether the stop made sense.',
      text: 'A very tight stop turns modest price moves into large R values. R measures the result against the stop you chose, not the quality of that stop.',
    },
    {
      lead: 'Money.',
      text: (
        <>
          +2R on a ₹200 risk and +2R on a ₹20,000 risk read the same. How much to risk is a separate question, answered by the{' '}
          <A to="/resources/position-size">position size calculator</A>.
        </>
      ),
    },
    {
      lead: 'Trades without a stop.',
      text: 'With no initial stop there is no 1R, and a stop picked after the trade makes R whatever you want it to be.',
    },
  ],
  mistakes: [
    {
      lead: 'Dividing by the moved stop.',
      text: 'If the stop was trailed to the entry, the risk taken was still the original distance. Dividing by the new, smaller distance, or by zero, inflates R.',
    },
    {
      lead: 'Using planned prices instead of fills.',
      text: 'The GBP/USD trade was planned to lose 1R and lost 1.28R. The fill is the result.',
    },
    {
      lead: 'Ignoring charges.',
      text: 'Price-based R is before costs: the short drops from +1.9R to +1.84R after ₹60 of charges, 0.06R that comes off every trade, winners and losers alike.',
    },
    {
      lead: 'Using only the first entry of a scaled position.',
      text: 'Adding at a second price changes the average entry and the money at risk. Work out R on the whole position: its average entry and its total initial risk.',
    },
    {
      lead: 'Putting the stop on the wrong side.',
      text: 'A long stop above the entry, or a short stop below it, is a data-entry slip that gives a meaningless R. The calculator rejects it.',
    },
  ],
  deeper: (
    <>
      <A to="/blog/r-multiple-explained">R multiples explained</A> has a table of four trades, including one held past its stop, and what to do with R
      once you have it. <A to="/blog/trading-metrics-that-matter">Trading metrics that matter</A> covers the average R-multiple beside expectancy and
      profit factor, and the <A to="/resources/expectancy-calculator">expectancy calculator</A> takes averages in R.
    </>
  ),
  inJournal: (
    <>
      In TradeQut, Avg R on the dashboard averages R over the trades that have a stop loss and an exit price, before fees, and the Risk tab of Analytics
      shows losses past the stop and planned against captured R.
    </>
  ),
  faq: [
    {
      question: 'What does −1R mean?',
      answer:
        'The trade lost exactly what was planned: it was closed at its initial stop. −0.5R is a loss cut halfway to the stop, and −1.5R a loss half as large again as planned.',
    },
    {
      question: 'How do you calculate the R-multiple of a short trade?',
      answer:
        'With the same formula, (exit − entry) ÷ (entry − stop). For the short in the example, (1,412 − 1,450) ÷ (1,450 − 1,470) = −38 ÷ −20 = +1.9R: both brackets are negative, so the result is positive.',
    },
    {
      question: 'What is 1R in money?',
      answer:
        'The amount lost if the initial stop is hit: stop distance × quantity, times the value of one point for futures, options or forex. In the example 1R is ₹20 × 50 = ₹1,000.',
    },
    {
      question: 'Can you calculate R without a stop-loss?',
      answer:
        'Not honestly. Without an initial stop there is no planned risk to divide by. Some traders record the largest loss they would accept as the stop at entry; whatever is used has to be written down before the trade, not chosen afterwards.',
    },
    {
      question: 'Is an R-multiple the same as the risk-reward ratio?',
      answer:
        'No. The risk-reward ratio is a plan: target distance ÷ stop distance, set before entry. The R-multiple is the outcome: where the trade closed, measured in stop distances. A trade planned at 1:3 and closed early might end at +1.2R.',
    },
  ],
};
