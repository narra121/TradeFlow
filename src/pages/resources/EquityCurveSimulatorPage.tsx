import { useDeferredValue, useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, H3, OL, P, RelatedLinks, ShortAnswer, SignupCta, Table, UL } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatCount, formatPercent, formatR } from '@/lib/format';
import {
  MAX_RUNS,
  MAX_TRADES,
  expectancyR,
  expectedFinal,
  simulateEquity,
  type EquityError,
  type EquityInput,
  type EquityResult,
  type Sizing,
} from '@/lib/equityCurve';
import { cn } from '@/lib/utils';

const PATH = '/resources/equity-curve-simulator';
const NAME = 'Equity curve simulator';
const TITLE = 'Equity Curve Simulator: Monte Carlo for Trading | TradeQut';
const DESCRIPTION =
  'Free Monte Carlo trading simulator: up to 2,000 equity curves from your win rate, average win and loss and risk per trade, with drawdowns and losing streaks.';

/** The worked examples and the short answer quote runs made with this seed and the default inputs. */
const DEFAULT_SEED = 20261121;

type Field = 'start' | 'win' | 'avgWin' | 'avgLoss' | 'riskPct' | 'riskAmount' | 'cost' | 'trades' | 'runs' | 'drawdown' | 'seed';

const DEFAULTS: Record<Field, string> = {
  start: '10000',
  win: '45',
  avgWin: '2',
  avgLoss: '1',
  riskPct: '1',
  riskAmount: '100',
  cost: '0',
  trades: '100',
  runs: '1000',
  drawdown: '10',
  seed: String(DEFAULT_SEED),
};

const MAX_RUNS_TEXT = formatCount(MAX_RUNS);
const MAX_TRADES_TEXT = formatCount(MAX_TRADES);

const ERRORS: Record<EquityError, string> = {
  start: 'Enter a starting balance above 0.',
  'win-rate': 'Win rate must be between 0 and 100 percent.',
  'avg-win': 'Enter the average win in R, above 0.',
  'avg-loss': 'Enter the average loss in R, above 0.',
  risk: 'Risk per trade must be above 0% and below 100%.',
  cost: 'Cost per trade cannot be negative.',
  trades: `Trades per run must be a whole number from 1 to ${MAX_TRADES_TEXT}.`,
  runs: `Runs must be a whole number from 1 to ${MAX_RUNS_TEXT}.`,
  drawdown: 'The drawdown must be above 0% and below 100%.',
  seed: 'The seed must be a whole number from 0 to 4,294,967,295.',
  'too-large': 'Some runs grow past what the simulator can count. Lower the risk, the average win or the number of trades.',
};
const AMOUNT_RISK_ERROR = 'Enter a risk per trade above 0.';

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** 2.4 × 10¹⁶: from 10¹⁵ a digit string no longer fits a phone-width result panel. */
const scientific = (x: number) => {
  const [m, e] = x.toExponential(1).split('e');
  return `${m} × 10${String(Number(e)).replace(/\d/g, (d) => SUPERSCRIPT[Number(d)])}`;
};
const money = (x: number) => (x < 1e15 ? Math.round(x).toLocaleString('en-US') : scientific(x));
const share = (x: number) => formatPercent(x * 100, 1);

const FAQ: FaqItem[] = [
  {
    question: 'What is an equity curve simulator?',
    answer:
      'A tool that plays a set of trading statistics forward to draw possible equity curves: the account balance after each trade. This one takes a win rate, the average win and average loss in R, the risk per trade (a % of the current balance or a fixed amount) and an optional cost per trade, and draws up to 2,000 runs of up to 1,000 trades each.',
  },
  {
    question: 'What is a Monte Carlo simulation in trading?',
    answer:
      'Running the same random experiment many times to see the spread of outcomes. In each run every trade is a win with a probability equal to the win rate, so runs differ only in how many wins they get and in what order. The percentiles across runs show what is typical and what sits in the tails, such as how deep the drawdown gets in 1 run in 20.',
  },
  {
    question: 'Why does the median run end below the average?',
    answer:
      'With risk as a % of the current balance, gains compound on a larger balance, so a few lucky runs end far above the rest and pull the average up. In the default example the median run has 45 wins in 100 trades and ends at 10,000 × 1.02^45 × 0.99^55 = 14,026, while the average of the model is 10,000 × 1.0035^100 = 14,182. With a fixed amount per trade the two are close.',
  },
  {
    question: 'What is the difference between a fixed amount and a % of the current balance?',
    answer:
      'A fixed amount risks the same money on every trade: a loss costs the same at any balance and the balance grows in a straight line on average. A % of the current balance risks less after losses and more after wins, so a losing run costs less money as the account falls and gains compound. The same seed gives both models the same sequence of wins and losses, so switching the model compares them on identical luck.',
  },
  {
    question: 'How many runs and trades can it simulate?',
    answer:
      'Up to 2,000 runs of up to 1,000 trades, which keeps it recalculating as you type. More runs make the percentiles steadier; re-running with a new seed shows how much they move between samples.',
  },
  {
    question: 'Does the same input always give the same result?',
    answer:
      'Yes. The runs come from a seeded pseudo-random number generator (mulberry32), so the same inputs and seed give the same curves and figures on every device. Re-run with a new seed to see a different sample, or type a seed back in to reproduce one.',
  },
  {
    question: 'Can it predict my trading results?',
    answer:
      'No. It shows what a model with fixed odds and independent trades produces from the numbers you enter. Real results cluster, a win rate measured from a sample is an estimate, and markets change. It is useful for comparing risk sizes and for seeing how deep an ordinary drawdown can be for a given edge, not as a forecast.',
  },
];

/** About four round-numbered gridlines spanning [lo, hi]; the first and last are the axis ends. */
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, Math.abs(hi) * 0.01, 1);
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const first = Math.floor(lo / step) * step;
  const count = Math.max(1, Math.ceil((lo + span - first) / step - 1e-9));
  return Array.from({ length: count + 1 }, (_, k) => first + k * step);
}

const UNITS = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
] as const;

function axisLabel(v: number): string {
  if (v >= 1e15) return scientific(v);
  const unit = UNITS.find(([d]) => v >= d);
  return unit ? `${Number((v / unit[0]).toFixed(2))}${unit[1]}` : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const W = 1000;
const H = 400;

function EquityChart({ r, input }: { r: EquityResult; input: EquityInput }) {
  const n = input.trades;
  const start = input.startBalance;
  let lo = start;
  let hi = start;
  for (const b of r.band) {
    lo = Math.min(lo, b.p5);
    hi = Math.max(hi, b.p95);
  }
  const ticks = niceTicks(lo, hi);
  const d0 = ticks[0];
  const d1 = ticks[ticks.length - 1];
  const x = (t: number) => ((t / n) * W).toFixed(1);
  const y = (v: number) => (H * (1 - (v - d0) / (d1 - d0))).toFixed(1);
  const line = (points: { t: number; v: number }[]) => points.map((p, k) => `${k ? 'L' : 'M'}${x(p.t)} ${y(p.v)}`).join('');
  const band =
    line(r.band.map((b) => ({ t: b.trade, v: b.p95 }))) +
    r.band
      .slice()
      .reverse()
      .map((b) => `L${x(b.trade)} ${y(b.p5)}`)
      .join('') +
    'Z';
  const label = `Equity curves of ${r.paths.length} of ${formatCount(input.runs)} simulated runs over ${formatCount(n)} trades, starting at ${money(start)}. The median ends at ${money(r.final.p50)}; 90% of runs end between ${money(r.final.p5)} and ${money(r.final.p95)}.`;

  return (
    <figure className="mt-6">
      <div className="my-2 flex gap-2">
        <div className="relative w-12 shrink-0 text-right text-xs text-muted-foreground" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="num absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(1 - (t - d0) / (d1 - d0)) * 100}%` }}>
              {axisLabel(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-56 w-full sm:h-64" role="img" aria-label={label}>
            {ticks.map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={band} fill="currentColor" fillOpacity={0.15} className="text-primary" />
            {r.paths.map((p, k) => (
              <path
                key={k}
                d={line(p.map((v, t) => ({ t, v })))}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.4}
                className="text-muted-foreground"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line x1={0} x2={W} y1={y(start)} y2={y(start)} stroke="currentColor" strokeDasharray="6 4" className="text-foreground" vectorEffect="non-scaling-stroke" />
            <path
              d={line(r.band.map((b) => ({ t: b.trade, v: b.p50 })))}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="text-primary"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
      {/* Outside the row above, so the y labels span exactly the plot; ml-14 = the label column plus the gap. */}
      <div className="ml-14 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>0</span>
        {n >= 4 && <span>{formatCount(Math.round(n / 2))}</span>}
        <span>{formatCount(n)} trades</span>
      </div>
      <figcaption>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-primary" />
            Median
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-4 bg-primary/15" />
            5th to 95th percentile
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-px w-4 bg-muted-foreground" />
            {r.paths.length} sample {r.paths.length === 1 ? 'run' : 'runs'}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block w-4 border-t border-dashed border-foreground" />
            Starting balance
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">The scale follows the band, so a run far outside it can leave the chart.</p>
      </figcaption>
    </figure>
  );
}

export function EquityCurveSimulatorPage() {
  const [text, setText] = useState(DEFAULTS);
  const [sizing, setSizing] = useState<Sizing>('percent');
  const set = (f: Field) => (v: string) => setText((t) => ({ ...t, [f]: v }));

  const input = useMemo<EquityInput>(
    () => ({
      startBalance: parseDecimal(text.start),
      winRatePct: parseDecimal(text.win),
      avgWinR: parseDecimal(text.avgWin),
      avgLossR: parseDecimal(text.avgLoss),
      sizing,
      riskPct: parseDecimal(text.riskPct),
      riskAmount: parseDecimal(text.riskAmount),
      costPerTrade: parseDecimal(text.cost),
      trades: parseDecimal(text.trades),
      runs: parseDecimal(text.runs),
      drawdownPct: parseDecimal(text.drawdown),
      seed: parseDecimal(text.seed),
    }),
    [text, sizing],
  );
  // A full 2,000 × 1,000 simulation takes tens of milliseconds; typing stays responsive while it runs.
  const simulated = useDeferredValue(input);
  const outcome = useMemo(() => simulateEquity(simulated), [simulated]);

  const errorText = (e: EquityError) => (e === 'risk' && simulated.sizing === 'amount' ? AMOUNT_RISK_ERROR : ERRORS[e]);
  const fieldError = (e: EquityError) => (outcome.status === 'error' && outcome.error === e ? errorText(e) : null);
  const newSeed = () => set('seed')(String(Math.floor(Math.random() * 4294967296)));

  const r = outcome.status === 'ok' ? outcome : null;
  const summary = outcome.status === 'ok'
    ? `Median final balance ${money(r.final.p50)} (${formatPercent((r.final.p50 / simulated.startBalance - 1) * 100, 1, { sign: true })}); 5th to 95th percentile ${money(r.final.p5)} to ${money(r.final.p95)}; ${share(r.belowStartShare)} of runs end below the start; ${share(r.drawdownHitShare)} reach a ${simulated.drawdownPct}% drawdown.`
    : errorText(outcome.error);

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Equity curve simulator</h1>
      <p className="mb-6 text-base text-foreground-soft">
        A Monte Carlo trading simulator: it plays your win rate, average win and loss and risk per trade forward over many runs and shows the spread of
        equity curves, drawdowns and losing streaks.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          An equity curve simulator draws many possible trade sequences from the same statistics, a Monte Carlo simulation, to show how far apart results
          can land. With 45% winners averaging 2R, losers averaging 1R and 1% of the current balance at risk, 1,000 runs of 100 trades from 10,000 end with
          a median of 14,026; 1 run in 20 ends at or below 10,722, and 20.5% fall 10% or more from a peak on the way. The odds are the same in every run;
          only luck changes: how many trades win, and in what order.
        </ShortAnswer>
      </div>

      <CalcLayout
        inputs={
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ecs-start" className={calcLabelClass}>Starting balance</label>
                <DecimalInput id="ecs-start" value={text.start} onChange={set('start')} error={fieldError('start')} />
              </div>
              <div>
                <label htmlFor="ecs-win" className={calcLabelClass}>Win rate (%)</label>
                <DecimalInput id="ecs-win" value={text.win} onChange={set('win')} error={fieldError('win-rate')} />
              </div>
              <div>
                <label htmlFor="ecs-avg-win" className={calcLabelClass}>Average win (R)</label>
                <DecimalInput id="ecs-avg-win" value={text.avgWin} onChange={set('avgWin')} error={fieldError('avg-win')} />
              </div>
              <div>
                <label htmlFor="ecs-avg-loss" className={calcLabelClass}>Average loss (R)</label>
                <DecimalInput id="ecs-avg-loss" value={text.avgLoss} onChange={set('avgLoss')} error={fieldError('avg-loss')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              R is the amount risked on a trade. For a reward:risk of 1:2 enter an average win of 2 and an average loss of 1; an average loss below 1 means
              losers are often cut before the stop.
            </p>
            <fieldset>
              <legend className={calcLabelClass}>Risk per trade is</legend>
              <div className="flex gap-2">
                {(
                  [
                    ['percent', '% of current balance'],
                    ['amount', 'A fixed amount'],
                  ] as const
                ).map(([m, label]) => (
                  <label
                    key={m}
                    className={cn(
                      'flex h-10 max-md:h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      sizing === m ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
                    )}
                  >
                    <input type="radio" name="ecs-sizing" value={m} checked={sizing === m} onChange={() => setSizing(m)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              {sizing === 'percent' ? (
                <div>
                  <label htmlFor="ecs-risk-pct" className={calcLabelClass}>Risk per trade (% of balance)</label>
                  <DecimalInput id="ecs-risk-pct" value={text.riskPct} onChange={set('riskPct')} error={fieldError('risk')} />
                </div>
              ) : (
                <div>
                  <label htmlFor="ecs-risk-amount" className={calcLabelClass}>Risk per trade (amount)</label>
                  <DecimalInput id="ecs-risk-amount" value={text.riskAmount} onChange={set('riskAmount')} error={fieldError('risk')} />
                </div>
              )}
              <div>
                <label htmlFor="ecs-cost" className={calcLabelClass}>Cost per trade (optional)</label>
                <DecimalInput id="ecs-cost" value={text.cost} onChange={set('cost')} error={fieldError('cost')} />
              </div>
              <div>
                <label htmlFor="ecs-trades" className={calcLabelClass}>Trades per run (1 to {MAX_TRADES_TEXT})</label>
                <DecimalInput id="ecs-trades" value={text.trades} onChange={set('trades')} error={fieldError('trades')} />
              </div>
              <div>
                <label htmlFor="ecs-runs" className={calcLabelClass}>Runs (1 to {MAX_RUNS_TEXT})</label>
                <DecimalInput id="ecs-runs" value={text.runs} onChange={set('runs')} error={fieldError('runs')} />
              </div>
              <div>
                <label htmlFor="ecs-drawdown" className={calcLabelClass}>Drawdown to count (% from peak)</label>
                <DecimalInput id="ecs-drawdown" value={text.drawdown} onChange={set('drawdown')} error={fieldError('drawdown')} />
              </div>
              <div>
                <label htmlFor="ecs-seed" className={calcLabelClass}>Seed</label>
                <DecimalInput id="ecs-seed" value={text.seed} onChange={set('seed')} error={fieldError('seed')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cost is the money paid on every trade, winners and losers: spread and commission, or brokerage, taxes and exchange charges.
            </p>
            <button
              type="button"
              onClick={newSeed}
              className="inline-flex h-10 max-md:h-11 w-full items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:w-auto"
            >
              Re-run with a new seed
            </button>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {r ? (
              <>
                <p className="text-sm text-muted-foreground">Median final balance</p>
                <p className="num text-2xl font-semibold text-foreground">{money(r.final.p50)}</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  {formatPercent((r.final.p50 / simulated.startBalance - 1) * 100, 1, { sign: true })} from {money(simulated.startBalance)} after{' '}
                  {formatCount(simulated.trades)} {simulated.trades === 1 ? 'trade' : 'trades'}
                </p>
                <p className="mb-4 text-sm text-foreground-soft">
                  Half the runs end at or above {money(r.final.p50)} and 1 in 20 ends at or below {money(r.final.p5)}; {share(r.belowStartShare)} finish
                  below the start and {share(r.drawdownHitShare)} fall {simulated.drawdownPct}% or more from a peak on the way.
                </p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">5th to 95th percentile</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {money(r.final.p5)} to {money(r.final.p95)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Runs ending below the start</dt>
                    <dd className={cn('num text-base font-semibold', r.belowStartShare >= 0.5 ? 'text-loss' : 'text-foreground')}>{share(r.belowStartShare)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Runs reaching a {simulated.drawdownPct}% drawdown</dt>
                    <dd className="num text-base font-semibold text-foreground">{share(r.drawdownHitShare)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Median max drawdown</dt>
                    <dd className="num text-base font-semibold text-foreground">{share(r.maxDrawdown.p50)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Median longest losing streak</dt>
                    <dd className="num text-base font-semibold text-foreground">{r.losingStreak.p50}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Expectancy per trade</dt>
                    <dd className={cn('num text-base font-semibold', expectancyR(simulated) < 0 ? 'text-loss' : 'text-foreground')}>{formatR(expectancyR(simulated))}</dd>
                  </div>
                  {r.zeroShare > 0 && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Runs that lost the whole balance</dt>
                      <dd className="num text-base font-semibold text-loss">{share(r.zeroShare)}</dd>
                    </div>
                  )}
                </dl>
                <EquityChart r={r} input={simulated} />
                <p className="mt-4 text-xs text-muted-foreground">
                  Seed {simulated.seed}: {formatCount(simulated.runs)} {simulated.runs === 1 ? 'run' : 'runs'} of {formatCount(simulated.trades)}{' '}
                  {simulated.trades === 1 ? 'trade' : 'trades'}. The same seed and inputs always give the same result.
                </p>
              </>
            ) : (
              <p className="text-sm text-foreground-soft">{summary}</p>
            )}
            <FormulaDisclosure>
              <p>Expectancy per trade E = p × W − (1 − p) × L − c ÷ risk, with win rate p, average win W and loss L in R, cost c and the risk on the first trade.</p>
              <p>Fixed amount A: a win adds A × W, a loss takes A × L, and c comes off every trade.</p>
              <p>% of current balance f: a win multiplies the balance by (1 + f × W), a loss by (1 − f × L), then c comes off.</p>
              <p>Max drawdown is the largest fall from a running peak, as a share of that peak. A run that reaches 0 stops there.</p>
              <p>
                Percentiles are nearest-rank across the runs; the band is the 5th to 95th at each trade.
                {r && <> The average final balance of this model, without the stop at 0, is {money(expectedFinal(simulated))}.</>}
              </p>
              <p>
                Trades are independent draws from a seeded generator (mulberry32). At most {MAX_RUNS_TEXT} runs of {MAX_TRADES_TEXT} trades, so the page recalculates
                as you type.
              </p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      {r && (
        <section aria-labelledby="ecs-spread" className="mb-12">
          <h2 id="ecs-spread" className="mb-3 text-base font-semibold text-foreground">
            Spread across the {formatCount(simulated.runs)} runs
          </h2>
          <Table
            caption={`Percentiles across ${formatCount(simulated.runs)} simulated runs, seed ${simulated.seed}. For drawdown and streaks a higher percentile is worse.`}
            head={['', '5th', '25th', 'Median', '75th', '95th']}
            rows={[
              ['Final balance', money(r.final.p5), money(r.final.p25), money(r.final.p50), money(r.final.p75), money(r.final.p95)],
              ['Max drawdown from the peak', share(r.maxDrawdown.p5), share(r.maxDrawdown.p25), share(r.maxDrawdown.p50), share(r.maxDrawdown.p75), share(r.maxDrawdown.p95)],
              ['Longest losing streak', r.losingStreak.p5, r.losingStreak.p25, r.losingStreak.p50, r.losingStreak.p75, r.losingStreak.p95],
            ]}
          />
        </section>
      )}

      <div className="max-w-[72ch]">
        <H2>How to read the chart</H2>
        <P>
          Each thin line is one simulated run: the balance after every trade. The shaded band holds the middle 90% of runs at each trade, from the 5th to
          the 95th percentile, and the solid line is the median, the balance that half the runs are above at that trade. The median line is not a single
          run: at each trade it is the middle balance across all runs. The band widens as trades accumulate, because each run&apos;s luck carries forward.
        </P>
        <P>
          The dashed line is the starting balance. Where the bottom of the band sits against it shows how often the same edge is still under water after
          that many trades. The table under the calculator gives the same spread for the final balance, the deepest drawdown of each run and its longest
          losing streak.
        </P>

        <H2>What a Monte Carlo simulation shows, and what it does not</H2>
        <P>
          It shows the range of outcomes a set of statistics allows when the edge is real by construction: how far two traders with identical numbers can
          end up apart, how deep an ordinary drawdown gets and how long a losing streak can last without anything being wrong. It does not model:
        </P>
        <UL>
          <li>
            Clustering. Every trade is independent and the odds never change. Real results cluster: a market that stops suiting a setup, or trading worse
            after a loss, makes losing runs longer than this model shows.
          </li>
          <li>
            Uneven trade sizes. Every win is the average win and every loss the average loss. A few large winners, or a loss well past the stop, widen the
            real spread.
          </li>
          <li>
            Uncertain inputs. The win rate and payoff are taken as exact. From 100 trades a 45% win rate has a 95% range of about 35% to 55% (±2 × √(0.45 ×
            0.55 ÷ 100) = ±9.9 points), so run the simulator at both ends of that range.
          </li>
          <li>Daily loss limits, cutting size after a drawdown, gaps, swaps and financing, beyond the cost per trade you enter.</li>
        </UL>
        <Callout title="A model, not a forecast">
          The curves describe the numbers you typed played forward under these assumptions. They are not a forecast for any account and say nothing about
          which trades to take.
        </Callout>

        <H2>The formulas</H2>
        <P>
          Expectancy per trade in R is E = p × W − (1 − p) × L − c ÷ risk, with win rate p, average win W and average loss L in R, cost per trade c and
          the money at risk. With 45% winners at 2R, losers at 1R and no cost, E = 0.45 × 2 − 0.55 × 1 = +0.35R. The{' '}
          <A to="/resources/expectancy-calculator">expectancy calculator</A> works it out from money amounts, and the{' '}
          <A to="/blog/trading-expectancy-formula">trading expectancy formula</A> article explains each term.
        </P>
        <H3>Fixed amount per trade</H3>
        <P>
          Every trade risks the same money A. After n trades with k winners the balance is B₀ + A × (k × W − (n − k) × L) − n × c, and its average is B₀ +
          n × (A × (p × W − (1 − p) × L) − c). A losing streak costs the same money at any balance, so the balance grows in a straight line on average and
          the median sits close to the average.
        </P>
        <H3>Percent of the current balance</H3>
        <P>
          Every trade risks a share f of the balance, so a win multiplies it by (1 + f × W) and a loss by (1 − f × L). Without costs the final balance is
          B₀ × (1 + f × W)^k × (1 − f × L)^(n − k): the order of wins and losses changes the path and the drawdown, not the end point. The average grows by
          a factor of 1 + f × (p × W − (1 − p) × L) a trade, but the median grows more slowly, by about p × ln(1 + f × W) + (1 − p) × ln(1 − f × L) in log terms. In the
          default example the median run has 45 wins and ends at 10,000 × 1.02^45 × 0.99^55 = 14,026, while the average is 10,000 × 1.0035^100 = 14,182.
        </P>
        <P>
          Max drawdown here is the largest fall from a running peak, as a share of that peak. The{' '}
          <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A> measures its ruin level from the starting balance instead, so the two
          figures differ once an account is above its start.
        </P>

        <H2>Two worked scenarios</H2>
        <H3>Forex: the same edge at four risk sizes</H3>
        <P>
          A 10,000 account, 45% winners at 2R, losers at 1R, risk as a % of the current balance, no costs, 200 trades, 1,000 runs, seed {DEFAULT_SEED},
          counting a 20% drawdown:
        </P>
        <Table
          caption="Simulated, hypothetical inputs"
          head={['Risk per trade', 'Median final', '1 run in 20 ends at or below', 'Median max drawdown', 'Max drawdown, 95th percentile', 'Runs reaching a 20% drawdown']}
          rows={[
            ['0.5%', '14,108', '11,789', '4.9%', '8.2%', '0.0%'],
            ['1%', '19,674', '13,750', '9.6%', '15.8%', '1.0%'],
            ['2%', '36,972', '18,121', '18.3%', '29.6%', '36.8%'],
            ['5%', '188,338', '32,427', '40.6%', '60.8%', '100.0%'],
          ]}
        />
        <P>
          Every row uses the same seed, so the wins and losses fall in the same order and the longest losing streak is the same in each (a median of 8, and
          12 at the 95th percentile); only the size changes. Larger risk multiplies the median and the drawdowns together: at 5% the median max drawdown
          is 40.6%. The model assumes the same win rate and the same size all the way through such a fall. The{' '}
          <A to="/blog/track-reduce-drawdown">guide to tracking and reducing drawdown</A> covers what to watch in your own curve.
        </P>
        <H3>Indian options: a fixed amount and charges</H3>
        <P>
          A Nifty options trader with ₹2,00,000 risks a fixed ₹2,000 a trade, with 40% winners at 1.8R and losers at 1R, over 200 trades (1,000 runs, seed{' '}
          {DEFAULT_SEED}, counting a 10% drawdown). Before charges E = 0.4 × 1.8 − 0.6 × 1 = +0.12R, ₹240 a trade. With ₹80 of charges on every trade (an
          example figure; your contract notes give the real one) it is 0.12 − 80 ÷ 2,000 = +0.08R, ₹160 a trade: a third of the edge goes to charges.
        </P>
        <Table
          caption="Simulated, hypothetical inputs"
          head={['Charges per trade', 'Expectancy', 'Median final', '1 run in 20 ends at or below', 'Runs ending below the start', 'Runs reaching a 10% drawdown']}
          rows={[
            ['₹0', '+0.12R', '₹2,48,000', '₹1,86,400', '11.9%', '69.4%'],
            ['₹80', '+0.08R', '₹2,32,000', '₹1,70,400', '24.3%', '79.8%'],
          ]}
        />
        <P>
          With a fixed amount the median lands on the average, ₹2,00,000 + 200 × ₹160 = ₹2,32,000, and charges double the share of runs that finish below
          the start. The <A to="/resources/fo-charges-rates">F&amp;O charges and STT rate history</A> lists what goes into the charges on an Indian
          contract note.
        </P>

        <H2>Getting the inputs from your journal</H2>
        <OL>
          <li>Win rate: winning trades ÷ closed trades, for one setup or one period, not a mix of strategies you no longer trade.</li>
          <li>
            Average win and average loss in R: each trade&apos;s result divided by what it risked at the stop, averaged over the winners and over the
            losers. An average loss below 1R means losers are cut early; above 1R, slippage or moved stops.
          </li>
          <li>Risk per trade: what you actually lose at the stop, as a % of the balance or as a fixed amount, whichever matches how you size.</li>
          <li>
            Cost per trade: the average charges of one round trip from your statements, spread and commission in forex, brokerage, STT and exchange charges
            in Indian F&amp;O.
          </li>
          <li>
            Sample size: the 95% range of a win rate from n trades is about ±2 × √(p × (1 − p) ÷ n), ±14 points from 50 trades at 45% and ±7 from 200.
          </li>
        </OL>
        <P>
          A <A to="/forex-trading-journal">trading journal</A> gives all of these from your own trades. In TradeQut, Analytics shows the win rate with its
          range, the payoff and the expectancy in R for the trades you import or log, and its Risk tab shows the longest loss streak, the max drawdown and a
          &quot;next 100 trades&quot; scenario that redraws your own trade results 5,000 times, so it keeps the uneven sizes of real wins and losses that
          this two-outcome model leaves out. That scenario needs at least 50 trades.
        </P>

        <Faq items={FAQ} />
        <RelatedLinks
          links={[
            { to: '/resources/risk-of-ruin-calculator', label: 'Risk of ruin calculator' },
            { to: '/resources/expectancy-calculator', label: 'Expectancy and break-even win rate calculator' },
            { to: '/blog/trading-expectancy-formula', label: 'Trading expectancy formula' },
            { to: '/blog/track-reduce-drawdown', label: 'How to track and reduce drawdown' },
            { to: '/resources/compounding-calculator', label: 'Forex compounding calculator' },
            { to: '/resources/position-size', label: 'Position size calculator' },
          ]}
        />
        <Disclaimer>
          Educational simulator. It plays the numbers you enter forward with a fixed-odds model and does not forecast results. TradeQut is a journaling and
          analytics tool, not an investment adviser, and nothing here is a recommendation to trade.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
