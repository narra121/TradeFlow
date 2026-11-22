import { A } from '@/content/components/ArticleParts';
import type { MetricTerm } from './types';

export const EXPECTANCY: MetricTerm = {
  id: 'expectancy',
  path: '/glossary/expectancy',
  name: 'Expectancy',
  inText: 'expectancy',
  title: 'Trading expectancy: definition, formula and calculator',
  description:
    'Expectancy is the average result per trade, in money or in R. The formula, a ten-trade example with a break-even trade, and a calculator for both units.',
  definition:
    'Expectancy is the average profit or loss per trade over a set of closed trades, in money or in R, the amount risked on each trade. It equals the net result divided by the number of trades, and the formula splits it into how often you win and lose and how large the average win and loss are.',
  formula: {
    words: (
      <>
        Multiply the share of trades that won by the average win, multiply the share that lost by the average loss, and subtract the second from the
        first. The answer is the same as the net profit divided by the number of trades.
      </>
    ),
    lines: ['E = (W ÷ N) × average win − (L ÷ N) × average loss', 'E = net profit ÷ N', 'E in R = E ÷ 1R'],
    key: (
      <>
        N is every trade counted, W the number of winners and L the number of losers. When some trades closed at exactly zero, W ÷ N and L ÷ N add up
        to less than 100%. That is correct, and it is why the loss rate is not always 100% minus the win rate. 1R is the money risked on a trade: what
        it loses if the stop is hit.
      </>
    ),
  },
  example: {
    heading: 'Worked example: ten trades, one at zero',
    intro: 'Ten hypothetical trades in a rupee account, each sized to lose ₹1,000 (1R) at its stop, results net of charges.',
    caption: 'Ten hypothetical trades, each risking ₹1,000',
    head: ['Trade', 'Result', 'In R'],
    rows: [
      ['1', '+₹2,000', '+2.0R'],
      ['2', '−₹1,000', '−1.0R'],
      ['3', '−₹1,000', '−1.0R'],
      ['4', '+₹1,500', '+1.5R'],
      ['5', '−₹1,000', '−1.0R'],
      ['6', '₹0', '0R'],
      ['7', '+₹3,000', '+3.0R'],
      ['8', '−₹1,000', '−1.0R'],
      ['9', '−₹500', '−0.5R'],
      ['10', '+₹1,200', '+1.2R'],
    ],
    working: [
      '4 winners: 2,000 + 1,500 + 3,000 + 1,200 = ₹7,700, an average of ₹1,925',
      '5 losers: 1,000 + 1,000 + 1,000 + 1,000 + 500 = ₹4,500, an average of ₹900',
      'E = 0.4 × 1,925 − 0.5 × 900 = 770 − 450 = +₹320 a trade',
      'Check: net ₹3,200 ÷ 10 trades = +₹320; in R, 320 ÷ 1,000 = +0.32R',
    ],
    after: 'The loss rate is 50%, not 60%: trade 6 neither won nor lost. The calculator below starts with these figures.',
  },
  calculator: {
    intro: 'Enter averages from your own closed trades. Use one unit for all of them: money, or R with the average loss in R.',
    limits: (
      <>
        It needs averages you have already worked out, and it has no charges field, so enter averages net of charges. For charges per trade, the
        break-even win rate and a table by reward:risk, use the <A to="/resources/expectancy-calculator">expectancy calculator</A>. It says nothing
        about how widely single results swing around the average.
      </>
    ),
  },
  reading: (
    <>
      A positive figure means the average trade in this sample made money: +₹320 a trade over ten trades is the ₹3,200 the account made. In R it no
      longer depends on position size, so +0.32R reads the same on a ₹1,000 risk or a $50 risk and compares strategies and accounts of different
      sizes. It is an average of past trades, not a forecast of the next ones.
    </>
  ),
  hides: [
    {
      lead: 'The swings.',
      text: (
        <>
          Two sets can both average +0.32R, one from steady small wins and one from a single large winner among many losses; their equity curves look
          nothing alike. The <A to="/resources/equity-curve-simulator">equity curve simulator</A> plays a win rate and payoff forward many times to
          show how far apart the paths land.
        </>
      ),
    },
    {
      lead: 'How settled it is.',
      text: 'Swap trade 7’s +3R for a −1R stop-out and the same ten trades average −₹80. With few trades, one result can flip the sign.',
    },
    {
      lead: 'Costs, unless the results are net.',
      text: 'Charges come off every trade, winners and losers alike, so a thin positive figure before charges can turn negative after them.',
    },
  ],
  mistakes: [
    {
      lead: 'Taking the loss rate as 100% minus the win rate when some trades closed at zero.',
      text: 'In the example that makes the loss part 0.6 × 900 = 540 and expectancy +₹230 instead of +₹320, because the zero trade is counted as an average loss.',
    },
    {
      lead: 'Using the average loss as 1R when trades risked a fixed amount.',
      text: 'The average loss here is ₹900, not the ₹1,000 risked, because one loss was cut at −0.5R. Dividing by ₹900 gives +0.36R and overstates the result in R.',
    },
    {
      lead: 'Mixing money and R.',
      text: 'An average win in rupees against an average loss in R gives a number in neither unit. Pick one for all three inputs.',
    },
    {
      lead: 'Leaving charges out.',
      text: 'Expectancy before charges is not what the account kept. Use net results, or subtract the charges per trade.',
    },
    {
      lead: 'Counting open trades.',
      text: 'A position that is still open has no final result yet; it enters the average when it closes.',
    },
  ],
  deeper: (
    <>
      <A to="/blog/trading-expectancy-formula">The expectancy formula</A> works through three win-rate and payoff combinations in R and why small samples
      mislead. The <A to="/resources/expectancy-calculator">expectancy calculator</A> adds charges per trade, the break-even win rate and a table of
      break-even rates, and <A to="/blog/r-multiple-explained">R multiples explained</A> shows how each trade&apos;s R is measured; the short version is
      the <A to="/glossary/r-multiple">R-multiple</A> term page.
    </>
  ),
  inJournal: (
    <>
      In TradeQut, the Overview tab of Analytics shows expectancy in R with the range it probably lies in, from resampling your own trades, and
      expectancy over the last 20 trades. R there is measured from each trade&apos;s stop loss, so trades without a stop are left out of it.
    </>
  ),
  faq: [
    {
      question: 'Is expectancy the same as the average trade?',
      answer:
        'Yes, when it is worked out from closed trades: net profit divided by the number of trades. The win-rate form of the formula gives the same figure and shows which part, frequency or size, drives it.',
    },
    {
      question: 'How do you calculate expectancy in R?',
      answer:
        'Either divide each trade’s result by the money it risked and average those R values, or divide expectancy in money by a fixed 1R. In the example every trade risked ₹1,000, so +₹320 is +0.32R.',
    },
    {
      question: 'Can expectancy be positive with a win rate under 50%?',
      answer:
        'Yes, if the wins are large enough against the losses. At a 30% win rate, an average win of 2.5R and an average loss of 1R, expectancy is 0.3 × 2.5 − 0.7 × 1 = +0.05R a trade.',
    },
    {
      question: 'Should break-even trades be included in expectancy?',
      answer:
        'Yes, in the trade count N. They add nothing to the wins or the losses, so they pull the average per trade towards zero, which is what they did to the account. Leaving them out of N, or counting them as losses, gives a different figure.',
    },
    {
      question: 'Is expectancy the same as expected value?',
      answer:
        'It is the same idea applied to trades: the probability-weighted average outcome. Worked out from past trades it is a sample average, an estimate of the expected value rather than the value itself, and it moves as trades are added.',
    },
  ],
};
