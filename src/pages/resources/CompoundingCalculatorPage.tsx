import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcInputClass, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Table } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney, formatPercent } from '@/lib/format';
import { compound, requiredRatePct, yearlyEquivalentPct, type CompoundError, type Period } from '@/lib/forex/compounding';

const PATH = '/resources/compounding-calculator';
const NAME = 'Forex compounding calculator';
const TITLE = 'Forex Compounding Calculator: Daily to Monthly | TradeQut';
const DESCRIPTION =
  'Grow a balance at a steady return per day, week or month, with optional deposits; see the yearly rate that implies and the rate needed for a target.';

const PERIOD_LABEL: Record<Period, string> = { day: 'trading day', week: 'week', month: 'month' };
const ERRORS: Record<CompoundError, string> = {
  start: 'Enter a starting balance above 0 (or a deposit).',
  rate: 'The return per period must be above −100%.',
  periods: 'Enter a whole number of periods from 1 to 1,000.',
  deposit: 'The deposit cannot be negative.',
};

const FAQ: FaqItem[] = [
  {
    question: 'How do you calculate compounding in forex?',
    answer:
      'Final balance = start × (1 + r)^n, where r is the return per period and n the number of periods. $10,000 at 2% a month for 12 months is $10,000 × 1.02^12 = $12,682.42. With a deposit each period, each deposit then compounds for the periods left.',
  },
  {
    question: 'What does 1% a day compound to?',
    answer:
      'Over 260 trading days (52 weeks of 5 days) 1% a day is 1.01^260 − 1 = 1,229% a year: $10,000 would become about $132,900. That is why a small daily figure is a very large claim, and why a compounding table built on one is arithmetic, not a plan.',
  },
  {
    question: 'What return do I need to double an account in a year?',
    answer:
      '(2)^(1/12) − 1 = 5.95% a month, every month, or about 0.27% every trading day. To reach 10% in a year it is 0.80% a month. The calculator works out the rate for any target.',
  },
  {
    question: 'Does compounding work with losing months?',
    answer:
      'Losses compound too: a 10% loss followed by a 10% gain leaves you 1% down (0.9 × 1.1 = 0.99). Enter a negative rate to see a losing run. Real results move up and down, so a steady rate is only an average, and the same average with bigger swings ends lower.',
  },
  {
    question: 'How do I compound in practice?',
    answer:
      'By sizing each trade as a fixed percentage of the current balance, so position size grows with the account and shrinks after losses. The position size calculator turns a percentage into lots; the risk of ruin calculator shows how that choice changes the chance of a deep drawdown.',
  },
  {
    question: 'Can TradeQut show my real growth?',
    answer:
      'Yes, for the trades you import or log: TradeQut shows net P&L on a calendar by day, week, month and year, and as an equity curve. Those are your past results; nothing in TradeQut forecasts future growth.',
  },
];

export function CompoundingCalculatorPage() {
  const [startText, setStartText] = useState('10000');
  const [rateText, setRateText] = useState('2');
  const [period, setPeriod] = useState<Period>('month');
  const [periodsText, setPeriodsText] = useState('12');
  const [depositText, setDepositText] = useState('0');
  const [targetText, setTargetText] = useState('20000');

  const start = parseDecimal(startText);
  const rate = parseDecimal(rateText);
  const periods = Math.round(parseDecimal(periodsText));
  const r = useMemo(() => compound({ start, ratePct: rate, periods, deposit: parseDecimal(depositText) }), [start, rate, periods, depositText]);
  const target = parseDecimal(targetText);
  const needed = requiredRatePct(start, target, periods);
  const yearly = rate > -100 ? yearlyEquivalentPct(rate, period) : null;
  const shown = r.status === 'ok' ? (r.rows.length <= 24 ? r.rows : r.rows.filter((x, i) => i % Math.ceil(r.rows.length / 24) === 0 || i === r.rows.length - 1)) : [];
  const summary = r.status === 'error' ? ERRORS[r.error] : `Final balance ${formatMoney(r.final)} after ${periods} ${PERIOD_LABEL[period]}s.`;

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Forex compounding calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">What a steady return per day, week or month grows a balance to, and what that rate means over a year.</p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Final balance = start × (1 + r)^n. $10,000 at 2% a month for 12 months is $12,682.42 (+26.8% for the year); at 1% a trading day for a year
          (260 days) it would be about $132,900 (+1,229%). Doubling in a year takes 5.95% every month.
        </ShortAnswer>
      </div>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="cp-start" className={calcLabelClass}>Starting balance</label>
              <DecimalInput id="cp-start" value={startText} onChange={setStartText} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cp-rate" className={calcLabelClass}>Return per period (%)</label>
                <DecimalInput id="cp-rate" value={rateText} onChange={setRateText} />
              </div>
              <div>
                <label htmlFor="cp-period" className={calcLabelClass}>Period</label>
                <select id="cp-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={calcInputClass}>
                  <option value="day">Trading day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="cp-periods" className={calcLabelClass}>Number of periods</label>
              <DecimalInput id="cp-periods" value={periodsText} onChange={setPeriodsText} />
            </div>
            <div>
              <label htmlFor="cp-deposit" className={calcLabelClass}>Deposit each period (optional)</label>
              <DecimalInput id="cp-deposit" value={depositText} onChange={setDepositText} />
            </div>
            <div>
              <label htmlFor="cp-target" className={calcLabelClass}>Target balance (optional)</label>
              <DecimalInput id="cp-target" value={targetText} onChange={setTargetText} />
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
                <p className="text-sm text-muted-foreground">Final balance</p>
                <p className="num mb-4 text-2xl font-semibold text-foreground">{formatMoney(r.final)}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Total gain</dt>
                    <dd className="num text-base font-semibold text-foreground">{formatMoney(r.totalGain, undefined, { sign: true })}</dd>
                    <dd className="text-xs text-muted-foreground">{formatPercent(r.totalGainPct, 1, { sign: true })} of what was put in</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Deposits</dt>
                    <dd className="num text-base font-semibold text-foreground">{formatMoney(r.deposits)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">The rate as a yearly return</dt>
                    <dd className="num text-base font-semibold text-foreground">{yearly === null ? 'n/a' : formatPercent(yearly, 1, { sign: true })}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Rate needed for the target</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {needed === null ? 'n/a' : `${formatPercent(needed, 2, { sign: true })} a ${PERIOD_LABEL[period]}`}
                    </dd>
                  </div>
                </dl>
              </>
            )}
            <FormulaDisclosure>
              <p>Each period: balance = balance × (1 + r) + deposit. Without deposits that is start × (1 + r)^n.</p>
              <p>Yearly return = (1 + r)^k − 1, with k = 260 trading days, 52 weeks or 12 months.</p>
              <p>Rate for a target = (target ÷ start)^(1 ÷ n) − 1, without deposits.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      {r.status === 'ok' && (
        <section aria-labelledby="cp-table" className="mb-12 max-w-[72ch]">
          <h2 id="cp-table" className="mb-2 text-2xl font-bold text-foreground">
            Balance by {PERIOD_LABEL[period]}
          </h2>
          {r.rows.length > 24 && <p className="mb-2 text-sm text-foreground-soft">Every {Math.ceil(r.rows.length / 24)}th period, and the last one.</p>}
          <Table
            head={[PERIOD_LABEL[period][0].toUpperCase() + PERIOD_LABEL[period].slice(1), 'Return that period', 'Balance']}
            rows={shown.map((x) => [String(x.period), formatMoney(x.gain, undefined, { sign: true }), formatMoney(x.balance)])}
          />
        </section>
      )}

      <div className="max-w-[72ch]">
        <H2>What a steady rate implies over a year</H2>
        <Table
          head={['Return per period', 'Over a year', '$10,000 becomes']}
          rows={[
            ['0.5% a trading day', '+265.7%', '$36,574'],
            ['1% a trading day', '+1,229.1%', '$132,910'],
            ['1% a week', '+67.8%', '$16,777'],
            ['2% a month', '+26.8%', '$12,682'],
            ['5% a month', '+79.6%', '$17,959'],
          ]}
        />
        <P>
          Trading results are not a steady rate: they come as wins and losses of different sizes, with losing weeks between good ones. A compounding table is
          a way to see what a number means, not a target to trade towards; chasing a fixed daily percentage is how accounts take risks the strategy does not
          justify.
        </P>
        <Callout title="Volatility drags compounding">
          +10% then −10% is −1%, and +20% then −20% is −4%: the same average return with bigger swings leaves less. Two traders with the same average month
          end the year apart when one has the larger swings. The <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A> shows the other side
          of sizing up.
        </Callout>

        <H2>Measure the rate you actually have</H2>
        <P>
          The only rate worth compounding is the one your own trades produce, net of spread, commission and swap. A{' '}
          <A to="/forex-trading-journal">forex trading journal</A> gives it: TradeQut imports your <A to="/mt5-trading-journal">MT5</A> or{' '}
          <A to="/mt4-trading-journal">MT4</A> report with commission and swap included, and shows net P&amp;L by day, week and month. Size trades to a fixed
          share of the balance with the <A to="/resources/position-size">position size calculator</A>.
        </P>

        <Faq items={FAQ} />
        <Disclaimer>
          Educational calculator. A steady return is an assumption, not a forecast or a promise. TradeQut is a journaling and analytics tool, not an investment
          adviser, and nothing here is a recommendation to trade.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
