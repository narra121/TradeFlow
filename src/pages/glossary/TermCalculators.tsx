import { useState, type ReactNode } from 'react';
import {
  CalcLayout,
  DecimalInput,
  DirectionRadios,
  FormulaDisclosure,
  LiveResult,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { formatMoney, formatPercent, formatPrice, formatR } from '@/lib/format';
import {
  maxDrawdown,
  parseSeries,
  profitFactor,
  rMultiple,
  termExpectancy,
  winRate,
  type Direction,
  type SeriesKind,
  type TermExpectancyError,
} from '@/lib/glossaryCalc';
import { cn } from '@/lib/utils';

const MINUS = '−';
const signed = (n: number, digits: number) => {
  const rounded = Number(n.toFixed(digits));
  return `${rounded < 0 ? MINUS : rounded > 0 ? '+' : ''}${Math.abs(rounded).toFixed(digits)}`;
};
const signedPrice = (n: number) => `${n < 0 ? MINUS : n > 0 ? '+' : ''}${formatPrice(Math.abs(n))}`;

function Field({ id, label, hint, value, onChange, error }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; error?: string | null }) {
  return (
    <div>
      <label htmlFor={id} className={calcLabelClass}>
        {label}
      </label>
      <DecimalInput id={id} value={value} onChange={onChange} error={error} />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ResultPanel({ label, value, tone, children, formula, summary }: { label: string; value: string; tone?: 'profit' | 'loss'; children?: ReactNode; formula: ReactNode; summary: string }) {
  return (
    <>
      <h3 className="mb-4 text-base font-semibold text-foreground">Result</h3>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p data-testid="term-result" className={cn('num mb-2 text-2xl font-semibold', tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-foreground')}>
        {value}
      </p>
      {children}
      <FormulaDisclosure>{formula}</FormulaDisclosure>
      <LiveResult text={summary} />
    </>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-sm text-muted-foreground">{k}</dt>
          <dd className="num text-base font-semibold text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfitFactorCalculator() {
  const [profitText, setProfitText] = useState('465');
  const [lossText, setLossText] = useState('255');
  const r = profitFactor(parseDecimal(profitText), parseDecimal(lossText));

  let value = 'Not defined';
  let note: string;
  let tone: 'profit' | 'loss' | undefined;
  if (r.status === 'error') {
    value = '—';
    note = 'Gross profit is the sum of the winning trades, so it cannot be negative.';
  } else if (r.status === 'undefined') {
    note =
      r.reason === 'no-losses'
        ? 'There are no losing trades, so there is nothing to divide by. Some tools, the TradeQut dashboard among them, show ∞ instead.'
        : 'Both totals are 0, so there are no results to compare.';
  } else {
    value = r.profitFactor.toFixed(2);
    tone = r.net > 0 ? 'profit' : r.net < 0 ? 'loss' : undefined;
    note = `The winners made ${r.profitFactor.toFixed(2)} for each 1.00 the losers lost: ${r.net > 0 ? 'the set made money' : r.net < 0 ? 'the set lost money' : 'the set broke even'}.`;
  }

  return (
    <CalcLayout
      inputs={
        <>
          <Field
            id="pf-gross-profit"
            label="Gross profit"
            hint="The sum of every winning trade, after charges."
            value={profitText}
            onChange={setProfitText}
            error={r.status === 'error' ? 'Gross profit cannot be negative.' : null}
          />
          <Field id="pf-gross-loss" label="Gross loss" hint="The sum of every losing trade, after charges; a minus sign is ignored." value={lossText} onChange={setLossText} />
        </>
      }
      result={
        <ResultPanel
          label="Profit factor"
          value={value}
          tone={tone}
          formula={<p>Profit factor = gross profit ÷ gross loss. Net result = gross profit − gross loss.</p>}
          summary={`Profit factor ${value}. ${note}`}
        >
          <p className="text-sm text-foreground-soft">{note}</p>
          {r.status !== 'error' && <Stats items={[['Net result', formatMoney(r.net, undefined, { sign: true })]]} />}
        </ResultPanel>
      }
    />
  );
}

const EXPECTANCY_ERRORS: Record<TermExpectancyError, string> = {
  'win-rate-range': 'Win rate must be between 0 and 100 percent.',
  'loss-rate-range': 'Loss rate must be between 0 and 100 percent.',
  'rates-over-100': 'Win rate and loss rate together cannot be more than 100 percent.',
  'negative-win': 'Average win cannot be negative.',
  'negative-risk': 'Risk per trade cannot be negative.',
  'not-a-number': 'Enter numbers only.',
};

export function ExpectancyTermCalculator() {
  const [winText, setWinText] = useState('40');
  const [lossRateText, setLossRateText] = useState('50');
  const [avgWinText, setAvgWinText] = useState('1925');
  const [avgLossText, setAvgLossText] = useState('900');
  const [riskText, setRiskText] = useState('1000');
  const r = termExpectancy({
    winRatePct: parseDecimal(winText),
    lossRatePct: lossRateText.trim() === '' ? undefined : parseDecimal(lossRateText),
    avgWin: parseDecimal(avgWinText),
    avgLoss: parseDecimal(avgLossText),
    riskPerTrade: riskText.trim() === '' ? undefined : parseDecimal(riskText),
  });
  const err = (e: TermExpectancyError) => (r.status === 'error' && r.error === e ? EXPECTANCY_ERRORS[e] : null);
  const value = r.status === 'ok' ? formatMoney(r.expectancy, undefined, { sign: true }) : '—';
  const inR = r.status === 'ok' ? (r.expectancyR === null ? 'n/a, no risk unit' : formatR(r.expectancyR)) : '—';

  return (
    <CalcLayout
      inputs={
        <>
          <Field id="exp-win-rate" label="Win rate (%)" value={winText} onChange={setWinText} error={err('win-rate-range')} />
          <Field
            id="exp-loss-rate"
            label="Loss rate (%)"
            hint="Share of all trades that lost. Blank means 100 minus the win rate; enter less if some trades closed at zero."
            value={lossRateText}
            onChange={setLossRateText}
            error={err('loss-rate-range') ?? err('rates-over-100')}
          />
          <Field id="exp-avg-win" label="Average win" value={avgWinText} onChange={setAvgWinText} error={err('negative-win')} />
          <Field id="exp-avg-loss" label="Average loss" hint="The size of the average losing trade; a minus sign is ignored." value={avgLossText} onChange={setAvgLossText} />
          <Field
            id="exp-risk"
            label="Risk per trade, 1R (optional)"
            hint="The money lost at the stop. Blank uses the average loss as 1R."
            value={riskText}
            onChange={setRiskText}
            error={err('negative-risk')}
          />
        </>
      }
      result={
        <ResultPanel
          label="Expectancy per trade"
          value={value}
          tone={r.status === 'ok' ? (r.expectancy < 0 ? 'loss' : 'profit') : undefined}
          formula={
            <>
              <p>Expectancy = win rate × average win − loss rate × average loss.</p>
              <p>Expectancy in R = expectancy ÷ risk per trade, or ÷ average loss when no risk is entered.</p>
            </>
          }
          summary={r.status === 'ok' ? `Expectancy ${value} per trade, ${inR}.` : EXPECTANCY_ERRORS[r.error]}
        >
          {r.status === 'error' ? (
            <p className="text-sm text-foreground-soft">{EXPECTANCY_ERRORS[r.error]}</p>
          ) : (
            <>
              <Stats
                items={[
                  ['In R', inR],
                  ['Trades at zero', formatPercent(r.zeroPct, 1)],
                  ['Win part', formatMoney(r.winPart, undefined, { sign: true })],
                  ['Loss part', formatMoney(r.lossPart, undefined, { sign: true })],
                ]}
              />
              {r.rUnit === 'avg-loss' && <p className="mt-3 text-xs text-muted-foreground">R here uses the average loss as 1R.</p>}
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

export function RMultipleCalculator() {
  const [direction, setDirection] = useState<Direction>('short');
  const [entryText, setEntryText] = useState('1450');
  const [stopText, setStopText] = useState('1470');
  const [exitText, setExitText] = useState('1412');
  const r = rMultiple(direction, parseDecimal(entryText), parseDecimal(stopText), parseDecimal(exitText));
  const wrongSide = direction === 'long' ? 'For a long trade the stop must be below the entry.' : 'For a short trade the stop must be above the entry.';

  let value = '—';
  let note: string;
  if (r.status === 'error') note = r.error === 'stop-wrong-side' ? wrongSide : 'Enter numbers only.';
  else if (r.status === 'undefined') {
    value = 'Not defined';
    note = 'The stop is at the entry, so there is no risk to divide by.';
  } else {
    value = formatR(r.r);
    const rounded = Number(r.r.toFixed(2));
    note =
      rounded < -1
        ? 'A loss larger than 1R: the exit was beyond the stop, through slippage, a gap or a stop that was moved.'
        : rounded === -1
          ? 'Closed at the stop: the planned loss.'
          : rounded < 0
            ? 'A loss cut before the stop.'
            : rounded === 0
              ? 'Closed at the entry.'
              : `The trade made ${Math.abs(rounded).toFixed(2)} times the risk it took.`;
  }

  return (
    <CalcLayout
      inputs={
        <>
          <DirectionRadios value={direction} onChange={setDirection} />
          <Field id="r-entry" label="Entry price" value={entryText} onChange={setEntryText} />
          <Field
            id="r-stop"
            label="Initial stop"
            hint="The stop set at entry, not where it was moved to."
            value={stopText}
            onChange={setStopText}
            error={r.status === 'error' && r.error === 'stop-wrong-side' ? wrongSide : null}
          />
          <Field id="r-exit" label="Exit price" hint="The actual fill, not the planned target." value={exitText} onChange={setExitText} />
        </>
      }
      result={
        <ResultPanel
          label="R-multiple"
          value={value}
          tone={r.status === 'ok' ? (r.r < 0 ? 'loss' : r.r > 0 ? 'profit' : undefined) : undefined}
          formula={<p>R = (exit − entry) ÷ (entry − stop), per unit and before charges.</p>}
          summary={`R-multiple ${value}. ${note}`}
        >
          <p className="text-sm text-foreground-soft">{note}</p>
          {r.status === 'ok' && (
            <Stats
              items={[
                ['Risk per unit', formatPrice(r.riskPerUnit)],
                ['Result per unit', signedPrice(r.resultPerUnit)],
              ]}
            />
          )}
        </ResultPanel>
      }
    />
  );
}

export function WinRateCalculator() {
  const [winsText, setWinsText] = useState('9');
  const [lossesText, setLossesText] = useState('10');
  const [zeroText, setZeroText] = useState('1');
  const [payoffText, setPayoffText] = useState('1.6');
  const r = winRate({ wins: parseDecimal(winsText), losses: parseDecimal(lossesText), zero: parseDecimal(zeroText), payoff: parseDecimal(payoffText) });
  const errors = { 'not-whole': 'Enter whole numbers of trades, 0 or more.', 'no-trades': 'Enter at least one trade.', 'negative-payoff': 'Payoff cannot be negative.', 'not-a-number': 'Enter numbers only.' };

  const value = r.status === 'ok' ? formatPercent(r.winRatePct, 1) : '—';
  let against = 'Enter a payoff';
  if (r.status === 'ok' && r.marginPts !== null) {
    const pts = Number(r.marginPts.toFixed(1));
    against = pts === 0 ? 'At break-even' : `${signed(pts, 1)} points`;
  } else if (r.status === 'ok' && r.breakEvenPct !== null) against = 'n/a, no wins or losses';

  return (
    <CalcLayout
      inputs={
        <>
          <Field id="wr-wins" label="Winning trades" value={winsText} onChange={setWinsText} error={r.status === 'error' && r.error !== 'negative-payoff' ? errors[r.error] : null} />
          <Field id="wr-losses" label="Losing trades" value={lossesText} onChange={setLossesText} />
          <Field id="wr-zero" label="Trades closed at zero (optional)" value={zeroText} onChange={setZeroText} />
          <Field
            id="wr-payoff"
            label="Payoff: average win ÷ average loss (optional)"
            hint="Realised, from the same trades; 1.6 means the average win was 1.6 times the average loss."
            value={payoffText}
            onChange={setPayoffText}
            error={r.status === 'error' && r.error === 'negative-payoff' ? errors['negative-payoff'] : null}
          />
        </>
      }
      result={
        <ResultPanel
          label="Win rate, all trades"
          value={value}
          formula={
            <>
              <p>Win rate = wins ÷ all trades × 100. Without trades at zero = wins ÷ (wins + losses) × 100.</p>
              <p>Break-even win rate = 1 ÷ (1 + payoff) × 100, compared with the rate without trades at zero.</p>
            </>
          }
          summary={
            r.status === 'ok'
              ? `Win rate ${value}; break-even ${r.breakEvenPct === null ? 'not shown' : formatPercent(r.breakEvenPct, 1)}; ${against}.`
              : errors[r.error]
          }
        >
          {r.status === 'error' ? (
            <p className="text-sm text-foreground-soft">{errors[r.error]}</p>
          ) : (
            <>
              <p className="text-sm text-foreground-soft">
                {parseDecimal(winsText)} of {r.trades} {r.trades === 1 ? 'trade' : 'trades'} won.
              </p>
              <Stats
                items={[
                  ['Without trades at zero', r.decisiveWinRatePct === null ? 'n/a' : formatPercent(r.decisiveWinRatePct, 1)],
                  ['Break-even win rate', r.breakEvenPct === null ? 'Enter a payoff' : formatPercent(r.breakEvenPct, 1)],
                  ['Against break-even', against],
                ]}
              />
            </>
          )}
        </ResultPanel>
      }
    />
  );
}

const SERIES_EXAMPLE: Record<SeriesKind, string> = {
  balances: '10,000 10,400 10,100 10,900 10,250 9,800 10,300 11,200 13,000 11,800 12,600',
  returns: '+5 −3 −4 +2 +6 −8 +3',
};

function SeriesKindRadios({ value, onChange }: { value: SeriesKind; onChange: (k: SeriesKind) => void }) {
  return (
    <fieldset>
      <legend className={calcLabelClass}>The list holds</legend>
      <div className="flex gap-2">
        {(
          [
            ['balances', 'Balances'],
            ['returns', 'Returns (%)'],
          ] as const
        ).map(([k, label]) => (
          <label
            key={k}
            className={cn(
              'flex h-10 max-md:h-11 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === k ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
            )}
          >
            <input type="radio" name="series-kind" value={k} checked={value === k} onChange={() => onChange(k)} className="sr-only" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MaxDrawdownCalculator() {
  const [kind, setKind] = useState<SeriesKind>('balances');
  const [text, setText] = useState(SERIES_EXAMPLE.balances);
  const changeKind = (k: SeriesKind) => {
    setKind(k);
    setText(SERIES_EXAMPLE[k]);
  };

  const parsed = parseSeries(text);
  const r = parsed.status === 'ok' ? maxDrawdown(parsed.values, kind) : null;
  const errorText =
    parsed.status === 'error'
      ? `“${parsed.token}” is not a number. Separate values with spaces, new lines or semicolons.`
      : r?.status === 'error'
        ? {
            'too-few': kind === 'balances' ? 'Enter at least two balances.' : 'Enter at least one return.',
            'non-positive-start': 'The first balance must be above 0.',
            'negative-balance': 'Balances cannot be negative.',
            'return-below-minus-100': `A return cannot be below ${MINUS}100%: that would lose more than the whole account.`,
          }[r.error]
        : null;

  const at = (i: number) => (kind === 'balances' ? `value ${i + 1}` : i === 0 ? 'the start' : `period ${i}`);
  const level = (n: number) => formatPrice(n, 2);
  const ok = r?.status === 'ok' ? r : null;
  const dd = ok?.maxByPct ?? null;
  const value = ok ? formatPercent(dd?.pct ?? 0, 2) : '—';
  const note = !ok
    ? (errorText ?? '')
    : !dd
      ? 'The series never falls below an earlier peak.'
      : `${level(dd.amount)} from ${level(dd.peak)} at ${at(dd.peakIndex)} to ${level(dd.trough)} at ${at(dd.troughIndex)}${kind === 'returns' ? ', on a series that starts at 100' : ''}.`;
  const helpId = 'dd-series-help';

  return (
    <CalcLayout
      inputs={
        <>
          <SeriesKindRadios value={kind} onChange={changeKind} />
          <div>
            <label htmlFor="dd-series" className={calcLabelClass}>
              {kind === 'balances' ? 'Balances, oldest first' : 'Returns per period in %, oldest first'}
            </label>
            <textarea
              id="dd-series"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              aria-invalid={errorText ? true : undefined}
              aria-describedby={errorText ? `${helpId} dd-series-error` : helpId}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-error"
            />
            {errorText && (
              <p id="dd-series-error" className="mt-1 text-xs text-error">
                {errorText}
              </p>
            )}
            <p id={helpId} className="mt-1 text-xs text-muted-foreground">
              Separate values with spaces, new lines or semicolons. Commas are read as thousands separators, so 10,000 is one value.
              {kind === 'returns' && ' Returns compound from a start of 100.'}
            </p>
          </div>
        </>
      }
      result={
        <ResultPanel
          label="Maximum drawdown, % of the peak"
          value={value}
          tone={dd ? 'loss' : undefined}
          formula={
            <>
              <p>Drawdown at each value = (running peak − value) ÷ running peak. Maximum drawdown = the largest of these.</p>
              <p>Gain to recover = peak ÷ low − 1. Returns are turned into a series: each value = the previous × (1 + return ÷ 100).</p>
            </>
          }
          summary={ok ? `Maximum drawdown ${value}. ${note}` : note}
        >
          <p className="text-sm text-foreground-soft">{note}</p>
          {ok && dd && (
            <Stats
              items={[
                ['Back to the peak', ok.recoveredAt === null ? 'Not by the last value' : `At ${at(ok.recoveredAt)}`],
                ['Gain needed from the low', ok.recoveryGainPct === Infinity ? 'Not possible from 0' : formatPercent(ok.recoveryGainPct, 2)],
                ...(kind === 'balances' && ok.maxByAmount
                  ? ([['Largest fall in money', `${level(ok.maxByAmount.amount)} (${formatPercent(ok.maxByAmount.pct, 2)})`]] as [string, string][])
                  : []),
                ['Values read', String(parsed.status === 'ok' ? parsed.values.length : 0)],
              ]}
            />
          )}
        </ResultPanel>
      }
    />
  );
}
