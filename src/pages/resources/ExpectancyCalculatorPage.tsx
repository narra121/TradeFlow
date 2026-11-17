import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DecimalInput,
  FormulaDisclosure,
  LiveResult,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Table } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney, formatPercent } from '@/lib/format';
import { BREAK_EVEN_RATIOS, breakEvenForRatioPct, computeExpectancy, type ExpectancyError } from '@/lib/expectancy';
import { cn } from '@/lib/utils';

const PATH = '/resources/expectancy-calculator';
const NAME = 'Expectancy calculator';
const TITLE = 'Expectancy and break-even win rate calculator | TradeQut';
const DESCRIPTION =
  'Expectancy per trade in money and in R from win rate, average win and loss and charges, plus the break-even win rate for any reward:risk. Formulas shown.';

type Units = 'money' | 'r';

interface Example {
  label: string;
  units: Units;
  winRate: string;
  avgWin: string;
  avgLoss: string;
  charges: string;
}

const FOREX: Example = { label: 'forex example', units: 'money', winRate: '45', avgWin: '150', avgLoss: '100', charges: '3.50' };
const NIFTY: Example = { label: 'Nifty options example', units: 'money', winRate: '40', avgWin: '1300', avgLoss: '780', charges: '90' };

const ERRORS: Record<ExpectancyError, string> = {
  'win-rate-range': 'Win rate must be between 0 and 100 percent.',
  'negative-win': 'Average win cannot be negative. Enter the size of the average winning trade.',
  'negative-charges': 'Charges cannot be negative.',
  'not-a-number': 'Enter numbers only.',
};

const FAQ: FaqItem[] = [
  {
    question: 'How do you calculate trading expectancy?',
    answer:
      'Expectancy = (win rate × average win) − (loss rate × average loss) − charges per trade. With a 45% win rate, an average win of 150, an average loss of 100 and 3.50 of charges, it is 0.45 × 150 − 0.55 × 100 − 3.50 = +9.00 per trade. Dividing by the average loss gives it in R: +0.09R.',
  },
  {
    question: 'What is the break-even win rate formula?',
    answer:
      'Before charges it is average loss ÷ (average win + average loss), which is the same as 1 ÷ (1 + reward:risk). With charges c on every trade it is (average loss + c) ÷ (average win + average loss). At 1:2 you need 33.3% before charges; at 1:1 you need 50%.',
  },
  {
    question: 'Why do charges matter so much?',
    answer:
      'Charges are paid on every trade, winners and losers alike, so they come straight off expectancy. A small positive expectancy before charges can turn negative after them. Spread and commission in forex, and brokerage, STT and exchange charges in Indian F&O, all count. Use the cost per round trip from your statement or contract note.',
  },
  {
    question: 'Should I use money or R?',
    answer:
      'Both describe the same result. Money tells you what an average trade made in your account currency. R divides it by the average loss, so results from different position sizes, instruments and accounts can be compared. If you size every trade to the same risk, 1R is that risk.',
  },
  {
    question: 'What happens at a 0% or 100% win rate, or with no losing trades?',
    answer:
      'At 0% every trade is a loss plus charges. At 100% expectancy is the average win minus charges and profit factor is infinite, because nothing lost. With an average loss of 0 there is no risk unit, so expectancy in R and reward:risk cannot be shown; the calculator says so instead of printing a misleading number.',
  },
  {
    question: 'How is expectancy different from profit factor?',
    answer:
      'Expectancy is the average result of one trade, in money or R. Profit factor is gross profit ÷ gross loss over all trades: above 1.00 the sample made money. A strategy can have a profit factor of 1.3 and a tiny expectancy per trade, so the two answer different questions.',
  },
  {
    question: 'How many trades does the number need?',
    answer:
      'A win rate from 20 trades can be far from the long-run figure, so expectancy from a small sample swings widely. The figures you type are averages from your own past trades; they describe that sample, not the future.',
  },
  {
    question: 'Does TradeQut calculate this from my trades?',
    answer:
      'Yes. Analytics in TradeQut shows expectancy, payoff, the break-even win rate and expectancy in R with a 95% range from resampling your own trades, from the trades you import or log. There R is measured from the stop loss of each trade rather than from the average loss, so trades without a stop are left out of it. It describes your past trades; it does not recommend any trade.',
  },
];

function fmtPct(n: number | null): string {
  return n === null ? 'n/a' : formatPercent(n, 1);
}

function UnitRadios({ value, onChange }: { value: Units; onChange: (u: Units) => void }) {
  return (
    <fieldset>
      <legend className={calcLabelClass}>Enter amounts as</legend>
      <div className="flex gap-2">
        {(
          [
            ['money', 'Account currency'],
            ['r', 'R multiples'],
          ] as const
        ).map(([u, label]) => (
          <label
            key={u}
            className={cn(
              'flex h-10 max-md:h-11 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === u ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
            )}
          >
            <input type="radio" name="units" value={u} checked={value === u} onChange={() => onChange(u)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ExpectancyCalculatorPage() {
  const [units, setUnits] = useState<Units>(FOREX.units);
  const [winRateText, setWinRateText] = useState(FOREX.winRate);
  const [avgWinText, setAvgWinText] = useState(FOREX.avgWin);
  const [avgLossText, setAvgLossText] = useState(FOREX.avgLoss);
  const [chargesText, setChargesText] = useState(FOREX.charges);
  const [ratioText, setRatioText] = useState('2');

  const load = (e: Example) => {
    setUnits(e.units);
    setWinRateText(e.winRate);
    setAvgWinText(e.avgWin);
    setAvgLossText(e.avgLoss);
    setChargesText(e.charges);
  };

  const changeUnits = (u: Units) => {
    setUnits(u);
    if (u === 'r') {
      setAvgWinText('1.5');
      setAvgLossText('1');
      setChargesText('0');
    } else load(FOREX);
  };

  const avgLoss = Math.abs(parseDecimal(avgLossText));
  const charges = parseDecimal(chargesText);
  const result = useMemo(
    () => computeExpectancy({ winRatePct: parseDecimal(winRateText), avgWin: parseDecimal(avgWinText), avgLoss, charges }),
    [winRateText, avgWinText, avgLoss, charges],
  );

  const fieldError = (e: ExpectancyError) => (result.status === 'error' && result.error === e ? ERRORS[e] : null);
  const chargesInR = avgLoss > 0 ? charges / avgLoss : null;
  const checkRatio = parseDecimal(ratioText);
  const amount = (n: number) => (units === 'r' ? `${formatMoney(n, undefined, { sign: true })}R` : formatMoney(n, undefined, { sign: true }));

  const summary =
    result.status === 'error'
      ? ERRORS[result.error]
      : `Expectancy ${amount(result.expectancy)} per trade after charges, ${
          result.expectancyR === null ? 'not shown in R' : `${result.expectancyR.toFixed(2)} R`
        }. Break-even win rate ${fmtPct(result.breakEvenPct)}.`;

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Expectancy and break-even win rate calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">
        What an average trade makes after charges, in money and in R, and the win rate a reward:risk needs to break even.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Expectancy = (win rate × average win) − (loss rate × average loss) − charges per trade. Break-even win rate = (average loss + charges) ÷
          (average win + average loss); before charges that is 1 ÷ (1 + reward:risk), so 1:2 needs 33.3% and 1:1 needs 50%.
        </ShortAnswer>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[FOREX, NIFTY].map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => load(e)}
            className="inline-flex h-9 max-md:h-11 items-center rounded-md border border-input px-3 text-sm text-foreground-soft hover:bg-secondary"
          >
            Load the {e.label}
          </button>
        ))}
      </div>

      <CalcLayout
        inputs={
          <>
            <UnitRadios value={units} onChange={changeUnits} />
            <div>
              <label htmlFor="win-rate" className={calcLabelClass}>
                Win rate (%)
              </label>
              <DecimalInput id="win-rate" value={winRateText} onChange={setWinRateText} error={fieldError('win-rate-range')} />
            </div>
            <div>
              <label htmlFor="avg-win" className={calcLabelClass}>
                Average win{units === 'r' ? ' (R)' : ''}
              </label>
              <DecimalInput id="avg-win" value={avgWinText} onChange={setAvgWinText} error={fieldError('negative-win')} />
            </div>
            <div>
              <label htmlFor="avg-loss" className={calcLabelClass}>
                Average loss{units === 'r' ? ' (R)' : ''}
              </label>
              <DecimalInput id="avg-loss" value={avgLossText} onChange={setAvgLossText} />
              <p className="mt-1 text-xs text-muted-foreground">The size of the average losing trade; a minus sign is ignored.</p>
            </div>
            <div>
              <label htmlFor="charges" className={calcLabelClass}>
                Charges per trade, round trip{units === 'r' ? ' (R)' : ''} (optional)
              </label>
              <DecimalInput id="charges" value={chargesText} onChange={setChargesText} error={fieldError('negative-charges')} />
              <p className="mt-1 text-xs text-muted-foreground">Commission and spread, or brokerage, STT and exchange charges.</p>
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {result.status === 'error' ? (
              <p className="text-sm text-foreground-soft">{ERRORS[result.error]}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Expectancy per trade, after charges</p>
                <p className={cn('num mb-1 text-2xl font-semibold', result.expectancy < 0 ? 'text-loss' : 'text-profit')}>
                  {amount(result.expectancy)}
                </p>
                <p className="mb-4 text-xs text-muted-foreground">Before charges: {amount(result.grossExpectancy)}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Expectancy in R</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {result.expectancyR === null ? 'n/a (no losses)' : `${result.expectancyR >= 0 ? '+' : '−'}${Math.abs(result.expectancyR).toFixed(2)}R`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Reward:risk</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {result.rewardRisk === null ? 'n/a' : `1 : ${result.rewardRisk.toFixed(2)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Break-even win rate</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {result.breakEvenPct !== null && result.breakEvenPct > 100 ? 'Not reachable' : fmtPct(result.breakEvenPct)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Profit factor</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {result.profitFactor === null ? 'n/a' : result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Break-even before charges: {fmtPct(result.breakEvenGrossPct)}.
                  {result.breakEvenPct !== null && result.breakEvenPct > 100 && ' Charges are larger than the average win, so no win rate breaks even.'}
                </p>
              </>
            )}
            <FormulaDisclosure>
              <p>Expectancy = win rate × average win − loss rate × average loss − charges.</p>
              <p>Expectancy in R = expectancy ÷ average loss. Reward:risk = average win ÷ average loss.</p>
              <p>Break-even win rate = (average loss + charges) ÷ (average win + average loss).</p>
              <p>Profit factor = win rate × (average win − charges) ÷ (loss rate × (average loss + charges)).</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <section aria-labelledby="ratio-table" className="mb-12">
        <h2 id="ratio-table" className="mb-2 text-2xl font-bold text-foreground">
          Break-even win rate by reward:risk
        </h2>
        <p className="mb-4 max-w-[72ch] text-sm text-foreground-soft">
          The win rate needed to break even at each reward:risk.
          {chargesInR !== null && charges > 0
            ? ` The last column adds your charges as a share of the average loss (${units === 'r' ? `${charges.toFixed(2)}R` : `${(chargesInR * 100).toFixed(1)}% of the loss`}).`
            : ' Enter charges above to see a column with them.'}
        </p>
        <div className="mb-4 max-w-xs">
          <label htmlFor="check-ratio" className={calcLabelClass}>
            Check a reward:risk of 1 :
          </label>
          <DecimalInput id="check-ratio" value={ratioText} onChange={setRatioText} />
          <p className="mt-1 text-sm text-foreground" data-testid="ratio-check">
            {checkRatio > 0
              ? `1:${checkRatio} needs ${fmtPct(breakEvenForRatioPct(checkRatio))} before charges${
                  chargesInR !== null && charges > 0 ? `, ${fmtPct(breakEvenForRatioPct(checkRatio, units === 'r' ? charges : chargesInR))} with them` : ''
                }.`
              : 'Enter a ratio above 0.'}
          </p>
        </div>
        <Table
          head={['Reward:risk', 'Break-even before charges', ...(chargesInR !== null && charges > 0 ? ['With your charges'] : [])]}
          rows={BREAK_EVEN_RATIOS.map((rr) => [
            `1 : ${rr}`,
            fmtPct(breakEvenForRatioPct(rr)),
            ...(chargesInR !== null && charges > 0 ? [fmtPct(breakEvenForRatioPct(rr, units === 'r' ? charges : chargesInR))] : []),
          ])}
        />
      </section>

      <div className="max-w-[72ch]">
        <H2>The formulas</H2>
        <P>
          Expectancy is the average result of one trade. Take the share of trades that win, multiply by the average win, and subtract the share that lose
          multiplied by the average loss. Charges are paid on every trade, so they come off once per trade:
        </P>
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-sm text-foreground">
          E = p × W − (1 − p) × L − c
        </div>
        <P>
          Here p is the win rate as a fraction, W the average win, L the size of the average loss and c the charges per round trip. Expectancy in R is E ÷ L:
          it treats the average loss as one unit of risk, so results at different position sizes can be compared. See{' '}
          <A to="/blog/r-multiple-explained">R multiples explained</A> and <A to="/blog/trading-expectancy-formula">the expectancy formula</A>.
        </P>
        <P>
          The break-even win rate is the p at which E is zero. Solving p × (W − c) = (1 − p) × (L + c) gives:
        </P>
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-center font-mono text-sm text-foreground">
          break-even p = (L + c) ÷ (W + L)
        </div>
        <P>
          Without charges this is 1 ÷ (1 + W ÷ L), the familiar 1 ÷ (1 + reward:risk). Charges push it up: in the Nifty example below they move it from 37.5%
          to 41.8%. If the charges are larger than the average win, no win rate breaks even. Win rate and payoff only make sense together, which is the
          point of <A to="/blog/win-rate-vs-profit-factor">win rate vs profit factor</A>.
        </P>

        <H2>Worked examples</H2>
        <P>Hypothetical numbers, to show the arithmetic. Load either one into the calculator with the buttons above it.</P>
        <Table
          head={['', 'Forex: EUR/USD, 0.5 lot', 'Indian F&O: Nifty options, 1 lot']}
          rows={[
            ['Average loss', '20 pips × $5 a pip = $100', '12 points × 65 = ₹780'],
            ['Average win', '30 pips × $5 a pip = $150', '20 points × 65 = ₹1,300'],
            ['Charges per round trip', '$3.50 commission', '₹90 (example; see your contract note)'],
            ['Win rate', '45%', '40%'],
            ['Expectancy before charges', '0.45 × 150 − 0.55 × 100 = +$12.50', '0.40 × 1,300 − 0.60 × 780 = +₹52'],
            ['Expectancy after charges', '+$9.00 a trade, +0.09R', '−₹38 a trade, −0.05R'],
            ['Break-even win rate', '40.0% before charges, 41.4% after', '37.5% before charges, 41.8% after'],
          ]}
        />
        <P>
          A pip on EUR/USD is worth $10 per standard lot, so $5 on 0.5 lot; the <A to="/resources/pip-calculator">pip value calculator</A> does other pairs
          and account currencies. The Nifty lot of 65 is the lot size NSE set from late 2025 (NSE revises lot sizes, so check the
          current one with your broker); the charges for a trade date are on{' '}
          <A to="/resources/fo-charges-rates">F&amp;O charges and STT rates</A>. The F&amp;O example is the common trap: a strategy that is positive before
          charges and negative after.
        </P>

        <Callout title="These are averages of past trades">
          The figures describe the sample they came from. A win rate from a few dozen trades can be far from what the same approach produces over hundreds,
          so read expectancy alongside how many trades it rests on. This page does maths on numbers you type; it is not a forecast or a recommendation.
        </Callout>

        <H2>Getting the inputs from a journal</H2>
        <P>
          The four inputs come from your own closed trades: the share that made money, the average net profit of the winners, the average loss of the
          losers, and the charges per trade. A <A to="/guide">trading journal</A> that records charges with each trade gives them directly. TradeQut
          imports broker and MetaTrader trade files and shows expectancy, the break-even win rate and expectancy in R with its range for your own trades.
          Related calculators: <A to="/resources/position-size">position size</A> and{' '}
          <A to="/resources/risk-reward">risk-reward</A>.
        </P>

        <Faq items={FAQ} />
        <Disclaimer>
          Educational calculator. It does arithmetic on the numbers you enter and does not forecast results. TradeQut is a journaling and analytics tool, not
          a SEBI-registered investment adviser or research analyst, and nothing here is a recommendation to buy or sell any security or currency.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
