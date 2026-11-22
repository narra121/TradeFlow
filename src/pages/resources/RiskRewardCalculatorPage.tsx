import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DirectionRadios,
  FormulaDisclosure,
  DecimalInput,
  LiveResult,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { A, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Table, UL } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatPercent } from '@/lib/format';
import { RATIO_TABLE, breakEvenAtRatioPct, riskReward, type TradeDirection } from '@/lib/riskReward';

const PATH = '/resources/risk-reward';
const NAME = 'Risk-reward calculator';
const TITLE = 'Risk-reward calculator: ratio and break-even win rate';
const DESCRIPTION =
  'Risk-reward ratio and break-even win rate from entry, stop loss and take profit, long or short. Formula, worked examples and a table from 1 : 0.5 to 1 : 5.';
const GUIDE = '/blog/risk-reward-ratio-guide';
/** Costs per trade as a share of the risk in the table's last column: 10 of costs on a 100 risk. */
const COST_R = 0.1;

interface Example {
  label: string;
  direction: TradeDirection;
  entry: string;
  stop: string;
  target: string;
}

const LONG_EXAMPLE: Example = { label: 'EUR/USD long', direction: 'long', entry: '1.0850', stop: '1.0825', target: '1.0910' };
const SHORT_EXAMPLE: Example = { label: 'Nifty futures short', direction: 'short', entry: '24,500', stop: '24,580', target: '24,340' };

const FAQ: FaqItem[] = [
  {
    question: 'How do you calculate risk-reward ratio?',
    answer:
      'Take the distance from the entry to the stop loss (the risk) and from the entry to the take profit (the reward), then divide the reward by the risk. Buying at 100 with a stop at 95 and a target at 115 risks 5 to make 15: 15 ÷ 5 = 3, written 1 : 3.',
  },
  {
    question: 'How does the calculator handle a short trade?',
    answer:
      'Choose Short. The stop loss then has to be above the entry and the take profit below it: risk = stop − entry and reward = entry − target. Selling at 24,500 with a stop at 24,580 and a target at 24,340 risks 80 points to make 160, which is 1 : 2.',
  },
  {
    question: 'What does the break-even win rate mean?',
    answer:
      'The share of trades that must reach the target, with the rest stopped out, for the wins to pay for the losses: 1 ÷ (1 + reward ÷ risk). At 1 : 1 it is 50%, at 1 : 2 it is 33.3% and at 1 : 3 it is 25%. Above it the trades make money before costs; below it they lose.',
  },
  {
    question: 'Is 1:3 the same as 3:1?',
    answer:
      'They describe the same trade from opposite ends. Risk to reward 1 : 3 is reward to risk 3 : 1: the target is three times as far from the entry as the stop. As a single number, risk ÷ reward is 0.33 and reward ÷ risk is 3, so check which way round a ratio is quoted before comparing two.',
  },
  {
    question: 'What is a good risk-reward ratio?',
    answer:
      'No ratio is good on its own; it has to be read with the win rate the trades actually achieve. 1 : 3 with 20% winners loses 0.2R a trade before costs, because it needs 25%; 1 : 1 with 60% winners makes 0.2R a trade. Your own closed trades give both numbers.',
  },
  {
    question: 'Does it include spread, commission or slippage?',
    answer:
      'No. It works on the prices you type. Costs make every loss bigger and every win smaller, so they raise the break-even win rate: with costs of 0.1R a trade, 1 : 2 needs 36.7% instead of 33.3%. The expectancy calculator includes your costs.',
  },
  {
    question: 'Does position size change the ratio?',
    answer:
      'No. The ratio compares two price distances, so it is the same for one lot or ten. Position size changes the money at risk, which is the risk per unit times the number of units; the position size calculator works out the size for an amount you choose to risk.',
  },
];

/** Decimals typed in a price ("1.2650" → 4), so a per-unit distance shows at the prices' own precision: forex risk 0.0050, not 0.01. At least 2. */
function priceDecimals(...texts: string[]): number {
  return Math.max(2, ...texts.map((t) => t.trim().split('.')[1]?.replace(/\D/g, '').length ?? 0));
}

const pct = (n: number) => formatPercent(n, 1);

export function RiskRewardCalculatorPage() {
  const [direction, setDirection] = useState<TradeDirection>('long');
  const [entryText, setEntryText] = useState('100');
  const [stopText, setStopText] = useState('95');
  const [targetText, setTargetText] = useState('115');

  const load = (e: Example) => {
    setDirection(e.direction);
    setEntryText(e.entry);
    setStopText(e.stop);
    setTargetText(e.target);
  };

  const r = useMemo(
    () => riskReward({ direction, entry: parseDecimal(entryText), stop: parseDecimal(stopText), target: parseDecimal(targetText) }),
    [direction, entryText, stopText, targetText],
  );

  const decimals = priceDecimals(entryText, stopText, targetText);
  const stopError =
    r.status === 'error' && r.stopWrongSide ? `For a ${direction} trade the stop loss must be ${direction === 'long' ? 'below' : 'above'} the entry.` : null;
  const targetError =
    r.status === 'error' && r.targetWrongSide ? `For a ${direction} trade the take profit must be ${direction === 'long' ? 'above' : 'below'} the entry.` : null;

  const summary =
    r.status === 'ok'
      ? `Risk-reward 1 to ${r.ratio.toFixed(2)}, break-even win rate ${r.breakEvenPct.toFixed(1)} percent.`
      : 'The stop loss and take profit are on the wrong side of the entry for this direction.';

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Risk-reward calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">
        The risk-reward ratio of a long or short trade from its entry, stop loss and take profit, and the win rate that ratio needs to break even.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Risk-reward ratio = risk : reward, written 1 : (reward ÷ risk). For a long trade, risk = entry − stop loss and reward = take profit − entry; for a
          short, both flip. Buying at 100 with a stop at 95 and a target at 115 risks 5 to make 15, so 1 : 3. Trades like it break even when 1 ÷ (1 + 3) =
          25% of them reach the target, before costs.
        </ShortAnswer>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[LONG_EXAMPLE, SHORT_EXAMPLE].map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => load(e)}
            className="inline-flex h-9 max-md:h-11 items-center rounded-md border border-input px-3 text-sm text-foreground-soft hover:bg-secondary"
          >
            Load the {e.label} example
          </button>
        ))}
      </div>

      <CalcLayout
        inputs={
          <>
            <DirectionRadios value={direction} onChange={setDirection} />
            <div>
              <label htmlFor="entry-price" className={calcLabelClass}>
                Entry price
              </label>
              <DecimalInput id="entry-price" value={entryText} onChange={setEntryText} />
            </div>
            <div>
              <label htmlFor="stop-loss-price" className={calcLabelClass}>
                Stop loss price
              </label>
              <DecimalInput id="stop-loss-price" value={stopText} onChange={setStopText} error={stopError} />
            </div>
            <div>
              <label htmlFor="take-profit-price" className={calcLabelClass}>
                Take profit price
              </label>
              <DecimalInput id="take-profit-price" value={targetText} onChange={setTargetText} error={targetError} />
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {r.status === 'error' ? (
              <p className="text-sm text-foreground-soft">
                {direction === 'long'
                  ? 'Stop loss must be below entry and take profit must be above entry for a long trade.'
                  : 'Stop loss must be above entry and take profit must be below entry for a short trade.'}
              </p>
            ) : (
              <div data-testid="rr-result">
                <p className="text-sm text-muted-foreground">Risk-reward ratio</p>
                <p className="num mb-1 text-2xl font-semibold text-foreground">1 : {r.ratio.toFixed(2)}</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  The reward is {r.ratio.toFixed(2)} times the risk; also written {r.ratio.toFixed(2)} : 1 reward to risk.
                </p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Risk (per unit)</dt>
                    <dd className="num text-base font-semibold text-loss">{r.risk.toFixed(decimals)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Reward (per unit)</dt>
                    <dd className="num text-base font-semibold text-profit">{r.reward.toFixed(decimals)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">Break-even win rate</p>
                <p className="num text-base font-semibold text-foreground">{pct(r.breakEvenPct)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  At this ratio, trades break even when {pct(r.breakEvenPct)} of them reach the target and the rest hit the stop, before costs.
                </p>
              </div>
            )}
            <FormulaDisclosure>
              <p>Long: risk = entry − stop, reward = target − entry. Short: risk = stop − entry, reward = entry − target.</p>
              <p>Ratio = reward ÷ risk, shown as 1 : ratio. Break-even win rate = 1 ÷ (1 + ratio) = risk ÷ (risk + reward).</p>
              <p>Distances are per unit of price, before spread, commission and slippage.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>The risk-reward ratio formula</H2>
        <P>
          The risk is how far price can move against the trade before the stop loss closes it; the reward is how far it has to move in favour to reach the
          take profit. The ratio divides one by the other, with the risk counted as 1:
        </P>
        <div className="mb-6 space-y-1 rounded-lg border border-border bg-card p-4 text-center font-mono text-sm text-foreground">
          <p>
            Long: <span className="whitespace-nowrap">risk = entry − stop loss,</span> <span className="whitespace-nowrap">reward = take profit − entry</span>
          </p>
          <p>
            Short: <span className="whitespace-nowrap">risk = stop loss − entry,</span> <span className="whitespace-nowrap">reward = entry − take profit</span>
          </p>
          <p>
            Risk-reward ratio = <span className="whitespace-nowrap">1 : (reward ÷ risk)</span>
          </p>
          <p>
            Break-even win rate = <span className="whitespace-nowrap">1 ÷ (1 + reward ÷ risk)</span>
          </p>
        </div>
        <P>
          The same trade is often quoted the other way round: 3 : 1 reward to risk, or a 3R target, where R is the amount at risk. Written as a single
          number, risk ÷ reward is 0.33 and reward ÷ risk is 3, so check which one a source means before comparing. The{' '}
          <A to={GUIDE}>risk-reward ratio guide</A> explains how the ratio, the win rate and the chance of reaching the target fit together.
        </P>

        <H2>Worked examples</H2>
        <P>Hypothetical prices, per unit, to show the arithmetic. Load either one into the calculator with the buttons above it.</P>
        <Table
          head={['', 'Long: EUR/USD', 'Short: Nifty futures']}
          rows={[
            ['Entry', '1.0850 (buy)', '24,500 (sell)'],
            ['Stop loss', '1.0825, below the entry', '24,580, above the entry'],
            ['Take profit', '1.0910, above the entry', '24,340, below the entry'],
            ['Risk per unit', '1.0850 − 1.0825 = 0.0025 (25 pips)', '24,580 − 24,500 = 80 points'],
            ['Reward per unit', '1.0910 − 1.0850 = 0.0060 (60 pips)', '24,500 − 24,340 = 160 points'],
            ['Risk-reward ratio', '0.0060 ÷ 0.0025 = 2.4, so 1 : 2.4', '160 ÷ 80 = 2, so 1 : 2'],
            ['Break-even win rate', '1 ÷ (1 + 2.4) = 29.4%', '1 ÷ (1 + 2) = 33.3%'],
          ]}
        />
        <P>
          The ratio is the same for 0.5 lot of EUR/USD or 5 lots, and for one Nifty lot or three. The money at risk is not: it is the risk per unit times the
          number of units. The <A to="/resources/position-size">position size calculator</A> works back from the amount you choose to risk to the lot size or
          quantity.
        </P>

        <H2>Break-even win rate by risk-reward ratio</H2>
        <P>
          Each row is 1 ÷ (1 + reward ÷ risk): the share of trades that must reach the target, with the rest stopped out, for the account to stay flat. The
          last column adds costs of 0.1R a trade (10 on a risk of 100), paid on winners and losers alike, so the break-even becomes 1.1 ÷ (1 + reward ÷ risk).
        </P>
        <Table
          head={['Risk : reward', 'Break-even win rate', 'With costs of 0.1R a trade']}
          rows={RATIO_TABLE.map((rr) => [`1 : ${rr}`, pct(breakEvenAtRatioPct(rr)), pct(breakEvenAtRatioPct(rr, COST_R))])}
        />
        <P>
          Trades at a given ratio are ahead before costs only when their win rate is above that row. The{' '}
          <A to="/resources/expectancy-calculator">expectancy calculator</A> works out the result per trade with your own costs, and{' '}
          <A to="/blog/win-rate-vs-profit-factor">win rate vs profit factor</A> shows why neither number means much alone.
        </P>

        <H2>What this calculator does not do</H2>
        <UL>
          <li>
            It does not include costs. Spread, commission, brokerage, STT and slippage make each loss larger and each win smaller; the expectancy calculator
            adds them.
          </li>
          <li>It does not give money amounts. Risk and reward are per unit of price; multiply by the position size to get the amount.</li>
          <li>
            It does not estimate how likely the target is. The break-even win rate is the win rate a ratio needs, not the one a setup has: a target further
            away raises the ratio, but price has further to travel to reach it. See <A to={`${GUIDE}#probability`}>risk-reward and probability</A>.
          </li>
          <li>
            It assumes every trade ends at the stop or the target. Partial exits, trailing stops and a gap through the stop are not modelled;{' '}
            <A to="/blog/r-multiple-explained">R multiples</A> measure what each trade actually made.
          </li>
        </UL>

        <H2>Planned and actual risk-reward in a journal</H2>
        <P>
          The ratio you plan is not always the ratio you get: a trade closed early or a stop that slips changes it. In TradeQut the trade list can show each
          trade&apos;s planned R:R, from its stop and target, next to the R it realised at the exit, and the Risk tab in Analytics compares the planned R of
          winning trades with the R they captured and lists losses that ran past the stop. It describes trades you have already made.
        </P>

        <Faq items={FAQ} />
        <Disclaimer>
          Educational calculator. It does arithmetic on the prices you enter and does not forecast results. TradeQut is a journaling and analytics tool, not
          a SEBI-registered investment adviser or research analyst, and nothing here is a recommendation to buy or sell any security or currency.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
