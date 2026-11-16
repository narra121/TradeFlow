import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Table } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatPercent } from '@/lib/format';
import { riskOfRuin, simulateRuin, type RiskModel, type RuinError } from '@/lib/forex/riskOfRuin';
import { cn } from '@/lib/utils';

const PATH = '/resources/risk-of-ruin-calculator';
const NAME = 'Risk of ruin calculator';
const TITLE = 'Risk of Ruin Calculator for Trading | TradeQut';
const DESCRIPTION =
  'The chance a run of losses takes your account down to a drawdown you choose, such as a prop firm\'s maximum loss, from win rate, reward:risk and risk per trade.';

const RUNS = 4000;
const ERRORS: Record<RuinError, string> = {
  'win-rate': 'Win rate must be between 0 and 100 percent.',
  'reward-risk': 'Enter the average win as a multiple of the average loss, above 0.',
  risk: 'Risk per trade must be above 0% and below 100%.',
  ruin: 'The ruin level must be a drawdown above 0% and below 100%.',
};

const FAQ: FaqItem[] = [
  {
    question: 'What is risk of ruin in trading?',
    answer:
      'The probability that a sequence of losing trades takes the account down to a level you cannot or will not trade below. Here that level is a drawdown you choose: a prop firm\'s maximum loss, or the point at which you would stop. It depends on the win rate, the size of the average win against the average loss, and the share of the account risked per trade.',
  },
  {
    question: 'How is risk of ruin calculated?',
    answer:
      'Treat each trade as a step: +b units with probability p (b = average win ÷ average loss) or −1 unit. Ruin is a fall of N units, where N = drawdown ÷ risk per trade. The chance of ever falling that far is r^N, where r is the root between 0 and 1 of p·r^(b+1) − r + (1 − p) = 0. With 45% wins at 1:2, risking 1% with a 10% limit, r = 0.713 and the risk of ruin is 0.713^10 = 3.4%.',
  },
  {
    question: 'Why does risk per trade matter so much?',
    answer:
      'Because it sets how many losses in a row the account can absorb. At 1% risk a 10% limit is 10 straight losses away; at 2% it is 5. In the example above, doubling the risk from 1% to 2% raises the risk of ruin from 3.4% to 18.5% with the same win rate and payoff.',
  },
  {
    question: 'What is the difference between the two risk models?',
    answer:
      'Fixed amount risks the same money on every trade (a % of the starting balance), which is how most prop-firm traders size. Percent of current balance risks less after losses and more after wins, so a drawdown needs a few more losses in a row; the calculator uses the same formula in log terms for it.',
  },
  {
    question: 'Why is the result 100%?',
    answer:
      'Without a positive expectancy the walk drifts down, so given enough trades the ruin level is reached for certain. 50% wins at 1:1, or 30% wins at 1:2, have no edge before costs. The figure within a set number of trades is then the more useful one.',
  },
  {
    question: 'What does the figure within N trades mean?',
    answer:
      'The share of simulated accounts that reached the ruin level within that many trades: 4,000 accounts are played forward with your win rate, payoff and risk. The simulation uses a fixed seed, so the same inputs always give the same answer. It is a model with independent trades, not a forecast.',
  },
  {
    question: 'Where do the inputs come from?',
    answer:
      'From your own closed trades over a sample large enough to mean something: the win rate, and the average win divided by the average loss. A journal gives both. In TradeQut, Analytics shows your win rate with its range, payoff and expectancy in R from the trades you import or log; those describe the past, not the next trade.',
  },
];

export function RiskOfRuinCalculatorPage() {
  const [winText, setWinText] = useState('45');
  const [rrText, setRrText] = useState('2');
  const [riskText, setRiskText] = useState('1');
  const [ruinText, setRuinText] = useState('10');
  const [tradesText, setTradesText] = useState('100');
  const [model, setModel] = useState<RiskModel>('fixed');

  const input = useMemo(
    () => ({ winRatePct: parseDecimal(winText), rewardRisk: parseDecimal(rrText), riskPct: parseDecimal(riskText), ruinPct: parseDecimal(ruinText), model }),
    [winText, rrText, riskText, ruinText, model],
  );
  const r = useMemo(() => riskOfRuin(input), [input]);
  const trades = Math.min(2000, Math.max(1, Math.round(parseDecimal(tradesText))));
  const within = useMemo(() => (r.status === 'ok' ? simulateRuin(input, trades, RUNS) : null), [input, trades, r.status]);

  const pct = (x: number) => (x > 0 && x < 0.0001 ? 'below 0.01%' : formatPercent(x * 100, x < 0.1 ? 2 : 1));
  const summary = r.status === 'error' ? ERRORS[r.error] : `Risk of ruin ${pct(r.probability)}; within ${trades} trades ${within === null ? 'n/a' : pct(within)}.`;

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Risk of ruin calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">How likely a losing run is to take the account down to a drawdown you choose, such as a prop firm&apos;s maximum loss.</p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          With 45% winners at 1:2 and 1% risk per trade, the chance of ever hitting a 10% drawdown is about 3.4%; at 2% risk it is about 18.5%. The
          calculator solves p·r^(b+1) − r + (1 − p) = 0 for r and raises it to the number of losses the drawdown allows, and simulates 4,000 accounts for a
          finite number of trades.
        </ShortAnswer>
      </div>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="ror-win" className={calcLabelClass}>Win rate (%)</label>
              <DecimalInput id="ror-win" value={winText} onChange={setWinText} />
            </div>
            <div>
              <label htmlFor="ror-rr" className={calcLabelClass}>Average win ÷ average loss (reward:risk)</label>
              <DecimalInput id="ror-rr" value={rrText} onChange={setRrText} />
            </div>
            <div>
              <label htmlFor="ror-risk" className={calcLabelClass}>Risk per trade (% of balance)</label>
              <DecimalInput id="ror-risk" value={riskText} onChange={setRiskText} />
            </div>
            <fieldset>
              <legend className={calcLabelClass}>Risk is a % of</legend>
              <div className="flex gap-2">
                {(
                  [
                    ['fixed', 'Starting balance'],
                    ['compounding', 'Current balance'],
                  ] as const
                ).map(([m, label]) => (
                  <label
                    key={m}
                    className={cn(
                      'flex h-10 max-md:h-11 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                      model === m ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
                    )}
                  >
                    <input type="radio" name="ror-model" value={m} checked={model === m} onChange={() => setModel(m)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="ror-ruin" className={calcLabelClass}>Ruin = a drawdown of (%)</label>
              <DecimalInput id="ror-ruin" value={ruinText} onChange={setRuinText} />
              <p className="mt-1 text-xs text-muted-foreground">A prop firm&apos;s maximum loss, or the point at which you would stop trading.</p>
            </div>
            <div>
              <label htmlFor="ror-trades" className={calcLabelClass}>Trades to simulate (1 to 2,000)</label>
              <DecimalInput id="ror-trades" value={tradesText} onChange={setTradesText} />
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {r.status === 'error' ? (
              <p className="text-sm text-foreground-soft">{ERRORS[r.error]}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Risk of ruin (ever)</p>
                <p className={cn('num mb-4 text-2xl font-semibold', r.probability >= 0.5 ? 'text-loss' : 'text-foreground')}>{pct(r.probability)}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Within {trades} trades</dt>
                    <dd className="num text-base font-semibold text-foreground">{within === null ? 'n/a' : pct(within)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Losses in a row to ruin</dt>
                    <dd className="num text-base font-semibold text-foreground">{r.lossesInARow}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Expectancy per trade</dt>
                    <dd className={cn('num text-base font-semibold', r.expectancyR < 0 ? 'text-loss' : 'text-foreground')}>
                      {r.expectancyR >= 0 ? '+' : '−'}
                      {Math.abs(r.expectancyR).toFixed(2)}R
                    </dd>
                  </div>
                </dl>
                {r.probability >= 1 && (
                  <p className="mt-3 text-xs text-muted-foreground">No positive expectancy: over enough trades the ruin level is reached for certain.</p>
                )}
              </>
            )}
            <FormulaDisclosure>
              <p>b = reward:risk, p = win rate. Fixed risk: N = drawdown ÷ risk per trade losses.</p>
              <p>Risk of ruin = r^N, with r the root in (0, 1) of p·r^(b+1) − r + (1 − p) = 0; 100% when p·b ≤ 1 − p.</p>
              <p>Current-balance risk: b and N in log terms, b′ = ln(1 + b·f) ÷ −ln(1 − f), N = ln(1 − D) ÷ ln(1 − f).</p>
              <p>Within N trades: {RUNS.toLocaleString('en-US')} simulated accounts with a fixed seed. Costs are not included; take them out of the average win and loss.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>Risk per trade against a 20% drawdown</H2>
        <P>50% winners at 1:1.5 (expectancy +0.25R a trade), fixed risk, ruin at a 20% drawdown:</P>
        <Table
          head={['Risk per trade', 'Losses in a row to ruin', 'Risk of ruin']}
          rows={[
            ['0.5%', '40', 'below 0.01%'],
            ['1%', '20', '0.14%'],
            ['2%', '10', '3.7%'],
            ['3%', '7', '11.2%'],
            ['5%', '4', '26.8%'],
          ]}
        />
        <P>
          The edge is the same in every row; only the size changes. Expectancy decides whether the account grows on average, and risk per trade decides
          whether it survives the losing runs on the way. The <A to="/resources/expectancy-calculator">expectancy calculator</A> gives the first number
          and the <A to="/resources/position-size">position size calculator</A> turns a risk percentage into lots.
        </P>

        <H2>For prop-firm challenges</H2>
        <P>
          Set the ruin level to the firm&apos;s maximum loss (10% on FTMO&apos;s challenges, for example) and the risk to what you actually lose at the stop, including spread and
          commission. With a daily loss limit the account can also end on a single bad day, which this model does not capture; the{' '}
          <A to="/resources/prop-firm-drawdown-calculator">prop firm drawdown calculator</A> checks today&apos;s room against both limits.
        </P>
        <Callout title="A model, not a forecast">
          The formula assumes every trade is independent and that your win rate and payoff stay what you typed. Real losing streaks cluster (one bad
          habit, one market), and a win rate from 30 trades can be far from the long-run one, so read the figure as a comparison between risk levels, not
          as your odds.
        </Callout>

        <H2>Inputs from your own trades</H2>
        <P>
          The win rate and payoff should come from your closed trades, not a backtest you hope to repeat. A <A to="/forex-trading-journal">trading journal</A>{' '}
          gives them per setup and per session, so you can see which part of your trading carries the edge; TradeQut shows win rate with its range,
          payoff and expectancy in R from the trades you import or log, and what each broken rule cost.
        </P>

        <Faq items={FAQ} />
        <Disclaimer>
          Educational calculator. It does arithmetic and a simulation on the numbers you enter and does not forecast results. TradeQut is a journaling and
          analytics tool, not an investment adviser, and nothing here is a recommendation to trade.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
