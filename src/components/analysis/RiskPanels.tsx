import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { MetricInfo } from '@/components/stats/MetricInfo';
import type { MetricKey } from '@/components/stats/metricDefs';
import { plural } from '@/lib/evidence';
import { formatMoney, formatPercent, formatR, formatDayText } from '@/lib/format';
import { AnalysisPanel } from './AnalysisGate';
import { useOpenTrades, type AnalysisState } from './useAnalysis';

/** Trades the next-100 scenario needs before it is shown (report §4.5). */
export const SCENARIO_MIN_TRADES = 50;

const pct = (fraction: number | null | undefined, d = 1) => (fraction == null ? '—' : formatPercent(fraction * 100, d));

function Figure({ metric, label, value, note }: { metric: MetricKey; label?: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground"><MetricInfo metric={metric} label={label} /></dt>
      <dd className="mt-1">
        <span className="block font-mono text-lg font-medium leading-6 tabular-nums">{value}</span>
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

interface Props {
  state?: AnalysisState;
  currency?: string;
}

export function BeyondStopPanel({ state, currency }: Props) {
  const open = useOpenTrades();
  return (
    <AnalysisPanel title="Losses beyond the stop" description="Losing trades that ended past the planned risk (from −1.05R)" state={state} what="losses beyond the stop">
      {(a) => {
        const b = a.risk.beyondStop;
        if (b.losingTrades === 0) return <p className="text-sm text-muted-foreground">No losing trade in this period.</p>;
        return (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-4">
              <Figure metric="beyondStop" label="Trades" value={`${b.count} of ${b.losingTrades}`} note="losing trades" />
              <Figure metric="beyondStop" label="Lost past the plan" value={<Money value={-b.amount} currency={currency} />} note="the part beyond −1R" />
            </dl>
            {b.tradeIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => open(b.tradeIds)}>Open {plural(b.tradeIds.length, 'trade')}</Button>}
          </div>
        );
      }}
    </AnalysisPanel>
  );
}

export function PlannedVsCapturedPanel({ state }: Props) {
  const open = useOpenTrades();
  return (
    <AnalysisPanel title="Planned against captured" description="Winning trades with a target and a stop" state={state} what="planned against captured">
      {(a) => {
        const p = a.risk.plannedVsCaptured;
        if (!p) return <p className="text-sm text-muted-foreground">No winning trade has both a target and a stop in this period.</p>;
        return (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-4">
              <Figure metric="plannedVsCaptured" label="Planned" value={formatR(p.plannedAvgR)} note={`average over ${plural(p.winners, 'winner')}`} />
              <Figure metric="plannedVsCaptured" label="Captured" value={formatR(p.capturedAvgR)} note={`${pct(p.captureRatio, 0)} of the plan`} />
            </dl>
            <p className="text-xs text-muted-foreground">{p.reachedTarget} of {plural(p.winners, 'winner')} reached the target.</p>
            {p.tradeIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => open(p.tradeIds)}>Open {plural(p.tradeIds.length, 'winner')}</Button>}
          </div>
        );
      }}
    </AnalysisPanel>
  );
}

export function RiskPerTradePanel({ state, currency }: Props) {
  const open = useOpenTrades();
  return (
    <AnalysisPanel title="Risk per trade" description="Money at the stop on each trade" state={state} what="risk per trade">
      {(a) => {
        const r = a.risk.riskPerTrade;
        if (!r) return <p className="text-sm text-muted-foreground">No trade has a stop loss, so the money at risk is unknown.</p>;
        const share = (v: number | null) => (v == null ? 'Set a starting balance to see the share' : `${pct(v, 2)} of the starting balance`);
        const above = r.aboveMultiple;
        return (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-4">
              <Figure metric="riskPerTrade" label="Median" value={<Money value={r.median} currency={currency} sign={false} neutral />} note={share(r.medianShareOfBalance)} />
              <Figure metric="riskPerTrade" label="Largest" value={<Money value={r.largest} currency={currency} sign={false} neutral />} note={share(r.largestShareOfBalance)} />
            </dl>
            <p className="text-xs text-muted-foreground">
              {above.count === 0
                ? `No trade risked more than ${above.multiple}× the median.`
                : `${plural(above.count, 'trade')} risked more than ${above.multiple}× the median; together they made ${formatMoney(above.net, currency, { sign: true })}.`}{' '}
              From {plural(r.trades, 'trade')} with a stop.
            </p>
            {above.tradeIds.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => open(above.tradeIds)}>Open {plural(above.tradeIds.length, 'trade')}</Button>}
          </div>
        );
      }}
    </AnalysisPanel>
  );
}

export function DrawdownFactsPanel({ state, currency }: Props) {
  return (
    <AnalysisPanel title="Drawdown facts" description="From the daily closing balance of the period" state={state} what="drawdown facts">
      {(a) => {
        const d = a.risk.drawdown;
        return (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Figure metric="drawdownNow" value={<Money value={-d.current} currency={currency} />} note={d.current > 0 && d.since ? `since ${formatDayText(d.since, true)}` : 'At the high'} />
            <Figure metric="maxDrawdown" label="Deepest" value={<Money value={-d.deepest} currency={currency} />} note="in money" />
            <Figure metric="longestUnderwater" value={plural(d.longestDays, 'day')} note="calendar days" />
          </dl>
        );
      }}
    </AnalysisPanel>
  );
}

/** The next-100-trades scenario: resampled from the trader's own results, labelled as a scenario, shown from 50 trades. */
export function ScenarioPanel({ state, currency }: Props) {
  return (
    <AnalysisPanel
      title="Next 100 trades: a scenario"
      description="If your next trades resemble your past ones. A scenario, not a forecast."
      state={state}
      what="the scenario"
      min={SCENARIO_MIN_TRADES}
      tooFew={(have, need) => <p className="text-sm text-muted-foreground">Shown from {need} trades, so the resampling has enough to draw from; this period has {have}.</p>}
    >
      {(a) => {
        const s = a.scenario;
        if (!s) return <p className="text-sm text-muted-foreground">Shown from {SCENARIO_MIN_TRADES} trades with a result; this period has too few.</p>;
        return (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Figure metric="scenario" label="Runs ending in profit" value={pct(s.profitableShare, 0)} note={`of ${s.runs.toLocaleString('en-US')} runs`} />
              <Figure metric="scenario" label="Middle run ends at" value={<Money value={s.final.p50} currency={currency} neutral />} note={`5th to 95th: ${formatMoney(s.final.p5, currency, { sign: true })} to ${formatMoney(s.final.p95, currency, { sign: true })}`} />
              <Figure metric="scenario" label="Deepest drawdown, middle run" value={<Money value={-s.maxDrawdown.p50} currency={currency} neutral />} note={`1 run in 20 is deeper than ${formatMoney(s.maxDrawdown.p95, currency)}`} />
              {s.drawdownRisk && <Figure metric="scenario" label={`Drawdown of ${formatMoney(s.drawdownRisk.amount, currency)}`} value={pct(s.drawdownRisk.share, 0)} note="of runs reach it" />}
            </dl>
            {s.targetBeforeLimit && (
              <p className="text-xs text-muted-foreground">
                +10% ({formatMoney(s.targetBeforeLimit.target, currency)}) is reached before −10% ({formatMoney(s.targetBeforeLimit.limit, currency)}) in {pct(s.targetBeforeLimit.targetFirst, 1)} of runs; −10% first in {pct(s.targetBeforeLimit.limitFirst, 1)}.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Drawn {s.runs.toLocaleString('en-US')} times from your last {plural(s.basedOn, 'trade')}, {s.horizon} trades a run. It assumes nothing changes, which is rarely true.
            </p>
          </div>
        );
      }}
    </AnalysisPanel>
  );
}
