import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Money, RMultiple } from '@/components/ui/money';
import { MetricInfo } from '@/components/stats/MetricInfo';
import { evidenceFindings, type Finding } from '@/lib/analyticsRows';
import { ACCOUNT_SAMPLE_TEXT, evidencePhrase, MIN_RANGE_TRADES, plural, rangeExcludesZero, rateRangeText, rRangeText } from '@/lib/evidence';
import { formatDateShort, formatMoney, formatPercent, formatR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Analysis, Dimension } from '@/types/analysis';
import { AnalysisGate, AnalysisPanel } from './AnalysisGate';
import { ChartFrame } from './ChartFrame';
import { EvidenceText } from './EvidenceText';
import { segmentHref, type AnalyticsContext } from './drill';
import { useOpenTrades, type AnalysisState } from './useAnalysis';

const AXIS = { fontSize: 11, fill: 'hsl(var(--chart-axis))' } as const;
const pct = (fraction: number | null | undefined, d = 1) => (fraction == null ? '—' : formatPercent(fraction * 100, d));

export const DIMENSION_LABEL: Record<Dimension, string> = {
  symbol: 'Symbol', setup: 'Strategy', session: 'Session', direction: 'Direction', assetClass: 'Asset class', weekday: 'Weekday', hour: 'Hour',
  marketCondition: 'Market condition', newsEvent: 'News event', tag: 'Tag', plannedRR: 'Planned R:R', holding: 'Holding time',
  tradeNumber: 'Trade number in the day', optionType: 'Option type', expiryDay: 'Expiry day',
};

function Fact({ metric, label, value, note, sample }: { metric: Parameters<typeof MetricInfo>[0]['metric']; label?: string; value: React.ReactNode; note?: React.ReactNode; sample?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground"><MetricInfo metric={metric} label={label} sample={sample} /></dt>
      <dd className="mt-1">
        <span className="block font-mono text-xl font-medium leading-7 tabular-nums">{value}</span>
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

function winRateSentence(a: Analysis): string {
  const { winRateRange: r, breakEvenWinRate: be } = a.edge;
  if (be == null) return 'Break-even needs both wins and losses in the period.';
  if (!r) return `Too few trades for a range (${a.tradeCount} of ${MIN_RANGE_TRADES}).`;
  if (r.lo > be) return 'Above break-even even at the low end of its range.';
  if (r.hi < be) return 'Below break-even even at the top of its range.';
  return 'Break-even lies inside the range, so this is not settled yet.';
}

function expectancySentence(a: Analysis): string {
  const e = a.edge;
  if (e.expectancyR == null) return 'No trade has a stop loss, so there is no R.';
  if (!e.expectancyRRange) return `Too few trades with a stop for a range (${e.tradesWithR} of ${MIN_RANGE_TRADES}).`;
  if (rangeExcludesZero(e.expectancyRRange)) return e.expectancyRRange.lo > 0 ? 'The whole range is above zero.' : 'The whole range is below zero.';
  return e.tradesNeeded != null
    ? `Not proven yet: about ${e.tradesNeeded.toLocaleString('en-US')} trades with a stop would be needed at this spread; you have ${e.tradesWithR}.`
    : 'Not proven yet: the range includes zero.';
}

/** "Do I have an edge?": win rate with its range against break-even, expectancy in R with its range. */
export function EdgeSummaryPanel({ state, currency }: { state?: AnalysisState; currency?: string }) {
  const label = state?.data ? `${ACCOUNT_SAMPLE_TEXT[state.data.label]} · ${plural(state.data.tradeCount, 'trade')}` : undefined;
  return (
    <AnalysisPanel title="Do I have an edge?" description={label} state={state} loadingHeight="h-28" what="the edge figures">
      {(a) => (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          <Fact metric="winRate" value={pct(a.edge.winRate)} note={a.edge.winRateRange ? `Range ${rateRangeText(a.edge.winRateRange)} · ${plural(a.tradeCount, 'trade')}` : plural(a.tradeCount, 'trade')} />
          <Fact metric="breakEvenWinRate" value={pct(a.edge.breakEvenWinRate)} note={<>{a.edge.payoff != null ? <>At a <MetricInfo metric="payoff" label="payoff" /> of {a.edge.payoff.toFixed(2)}. </> : ''}{winRateSentence(a)}</>} />
          <Fact
            metric="expectancyR"
            value={<RMultiple value={a.edge.expectancyR} />}
            note={<>{a.edge.expectancyRRange ? `Range ${rRangeText(a.edge.expectancyRRange)}. ` : ''}{expectancySentence(a)}</>}
            sample={`${a.edge.tradesWithR} of ${a.tradeCount} trades have a stop and an exit price. Before fees.`}
          />
          <Fact metric="expectancy" label="Expectancy in money" value={<Money value={a.edge.expectancyMoney} currency={currency} />} note="Per trade, after fees" />
        </dl>
      )}
    </AnalysisPanel>
  );
}

function BridgeRow({ label, value, max, currency, note }: { label: string; value: number; max: number; currency?: string; note?: string }) {
  const width = max > 0 ? `${Math.min(100, (Math.abs(value) / max) * 100)}%` : '0%';
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[12rem_minmax(0,1fr)_8rem]">
      <span className="text-[13px] text-foreground-soft">
        {label}
        {note && <span className="block text-[11px] text-muted-foreground">{note}</span>}
      </span>
      <span aria-hidden="true" className="order-last col-span-2 h-1.5 rounded-sm bg-muted sm:order-none sm:col-span-1">
        <span className={cn('block h-full rounded-sm', value >= 0 ? 'bg-profit' : 'bg-loss')} style={{ width }} />
      </span>
      <Money value={value} currency={currency} className="text-right text-[13px]" />
    </li>
  );
}

/** Gross profit → losses within plan → losses beyond the stop → (no stop) → fees → net. */
export function ResultBridgePanel({ state, currency, pro }: { state?: AnalysisState; currency?: string; pro: boolean }) {
  const open = useOpenTrades();
  return (
    <AnalysisPanel title="Where the result came from" state={state} loadingHeight="h-40" what="the result split">
      {(a) => {
        const b = a.bridge;
        const max = Math.max(b.grossProfit, Math.abs(b.lossesWithinPlan), Math.abs(b.lossesBeyondStop), Math.abs(b.lossesWithoutStop), Math.abs(b.fees), Math.abs(b.net));
        return (
          <div className="space-y-2">
            <ul aria-label="Result split" className="divide-y divide-border/60">
              <BridgeRow label="Gross profit" value={b.grossProfit} max={max} currency={currency} />
              <BridgeRow label="Losses within the planned risk" value={b.lossesWithinPlan} max={max} currency={currency} />
              <BridgeRow label="Losses beyond the stop" value={b.lossesBeyondStop} max={max} currency={currency} note={`${b.beyondStopTrades} of ${plural(b.losingTrades, 'losing trade')}`} />
              {b.lossesWithoutStop !== 0 && <BridgeRow label="Losses without a stop" value={b.lossesWithoutStop} max={max} currency={currency} note="Risk unknown, so not split" />}
              <BridgeRow label="Fees" value={b.fees} max={max} currency={currency} note={b.fees === 0 ? 'None recorded' : undefined} />
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-border-strong pt-2 sm:grid-cols-[12rem_minmax(0,1fr)_8rem]">
                <span className="text-[13px] font-medium">Net P&amp;L</span>
                <span className="hidden sm:block" />
                <Money value={b.net} currency={currency} className="text-right text-[13px] font-medium" />
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              {b.losingTrades === 0
                ? 'No losing trade in this period.'
                : `${b.beyondStopTrades} of ${plural(b.losingTrades, 'losing trade')} went past the stop; the part beyond the stop cost ${formatMoney(Math.abs(b.lossesBeyondStop), currency)}.`}{' '}
              <MetricInfo metric="resultBridge" label="How this is split" />
            </p>
            {pro && a.risk.beyondStop.tradeIds.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => open(a.risk.beyondStop.tradeIds)}>
                Open the {plural(a.risk.beyondStop.tradeIds.length, 'trade')} past the stop
              </Button>
            )}
          </div>
        );
      }}
    </AnalysisPanel>
  );
}

/** Share of profit from the best trades, and the net without them (and without the worst). */
export function ConcentrationPanel({ state, currency, pro }: { state?: AnalysisState; currency?: string; pro: boolean }) {
  const open = useOpenTrades();
  return (
    <AnalysisPanel title="Dependence on a few trades" state={state} loadingHeight="h-40" what="how much rests on a few trades">
      {(a) => {
        const c = a.concentration;
        if (c.top === 0) return <p className="text-sm text-muted-foreground">No winning trade in this period.</p>;
        return (
          <div className="space-y-3">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact metric="concentration" label={`Share from the ${c.top} best`} value={pct(c.bestShareOfProfit, 0)} note="of gross profit" />
              <Fact metric="netPnl" label={`Net without the ${c.top} best`} value={<Money value={c.netWithoutBest} currency={currency} />} note={`instead of ${formatMoney(a.bridge.net, currency, { sign: true })}`} />
            </dl>
            {c.worstTradeIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Without the {plural(c.worstTradeIds.length, 'worst trade')}: <span className="font-mono">{formatMoney(c.netWithoutWorst, currency, { sign: true })}</span>
                {c.worstShareOfLosses != null ? ` (they are ${pct(c.worstShareOfLosses, 0)} of all losses).` : '.'}
              </p>
            )}
            {pro && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => open(c.bestTradeIds)}>Open the {c.bestTradeIds.length} best</Button>
                {c.worstTradeIds.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => open(c.worstTradeIds)}>Open the {c.worstTradeIds.length} worst</Button>}
              </div>
            )}
          </div>
        );
      }}
    </AnalysisPanel>
  );
}

/** Average R of the last 20 trades with a stop, one point per day, under the equity curve. */
export function RollingExpectancyChart({ state }: { state?: AnalysisState }) {
  const points = state?.data?.rolling;
  const data = useMemo(() => points ?? [], [points]);
  const last = data[data.length - 1];
  if (!state?.data || data.length === 0 || state.data.tradeCount === 0) {
    return (
      <Panel title="Rolling expectancy" description="Average R of the last 20 trades with a stop">
        <AnalysisGate
          state={state}
          what="the rolling expectancy"
          min={20}
          count={(a) => a.edge.tradesWithR}
          tooFew={(have) => <p className="text-sm text-muted-foreground">Shown from 20 trades with a stop; this period has {have}.</p>}
        >
          {() => <p className="text-sm text-muted-foreground">Shown from 20 trades with a stop.</p>}
        </AnalysisGate>
      </Panel>
    );
  }
  return (
    <ChartFrame
      title="Rolling expectancy"
      description="Average R of the last 20 trades with a stop, after each day. Before fees."
      summary={`Rolling expectancy over ${plural(data.length, 'day')}, latest ${formatR(last.avgR)}`}
      table={{ head: ['Date', 'Average R of the last 20'], rows: [...data].reverse().map((p) => [p.date, formatR(p.avgR)]) }}
      chart={
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(d: string) => formatDateShort(d)} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `${v.toFixed(1)}R`} />
              <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
              <Tooltip formatter={(v: number) => [formatR(v), 'Last 20 trades']} labelFormatter={(d: string) => formatDateShort(d, true)} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 4, boxShadow: 'var(--shadow-overlay)', fontSize: 12 }} />
              <Line type="monotone" dataKey="avgR" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      }
    />
  );
}

function FindingRow({ f, zone, currency, pro }: { f: Finding; zone: string; currency?: string; pro: boolean }) {
  const open = useOpenTrades();
  const href = pro || f.dim === 'symbol' ? segmentHref(f.dim, f.seg, zone) : null;
  const judged = f.seg.verdict !== 'watch';
  const arrow = f.seg.verdict === 'edge' ? '▲' : f.seg.verdict === 'leak' ? '▼' : '·';
  const name = `${f.seg.name}, ${DIMENSION_LABEL[f.dim].toLowerCase()}: ${evidencePhrase(f.seg.verdict, f.seg.trades)}, average ${formatR(f.seg.avgR)}, net ${formatMoney(f.seg.net, currency, { sign: true })}. Open its trades`;
  const body = (
    <>
      <span aria-hidden="true" className={cn('text-muted-foreground', judged && (f.seg.verdict === 'edge' ? 'text-profit' : 'text-loss'))}>{arrow}</span>
      <span className="min-w-0">
        <span className="block truncate"><span className="font-medium">{f.seg.name}</span> <span className="text-muted-foreground">· {DIMENSION_LABEL[f.dim].toLowerCase()}</span></span>
        <span className="block text-[11px] text-muted-foreground sm:hidden">{evidencePhrase(f.seg.verdict, f.seg.trades)}</span>
      </span>
      <span className="hidden sm:block"><EvidenceText verdict={f.seg.verdict} trades={f.seg.trades} /></span>
      {/* Colour only where the evidence rule allows it: a pattern to watch is printed neutral. */}
      <span className="text-right font-mono text-[13px] tabular-nums">{judged ? <RMultiple value={f.seg.avgR} /> : formatR(f.seg.avgR)}</span>
      <Money value={f.seg.net} currency={currency} neutral={!judged} className="hidden text-right text-[13px] sm:block" />
      <span aria-hidden="true" className="hidden text-muted-foreground sm:block">{href || pro ? '→' : ''}</span>
    </>
  );
  const cls = 'grid min-h-10 [@media(pointer:coarse)]:min-h-11 w-full grid-cols-[1rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 rounded-sm px-1 text-left text-[13px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1rem_minmax(0,1fr)_10rem_4.5rem_7rem_1rem]';
  // Links and buttons are named by their visible text plus where they lead (WCAG 2.5.3, label in name).
  if (href) return <li><Link to={href} className={cls}>{body}<span className="sr-only">. Open its trades in Trades</span></Link></li>;
  if (pro) return <li><button type="button" className={cls} onClick={() => open(f.seg.tradeIds)}>{body}<span className="sr-only">. Open its trades</span></button></li>;
  return <li><div aria-label={name.replace('. Open its trades', '')} role="group" className={cn(cls, 'hover:bg-transparent')}>{body}</div></li>;
}

/** Edges and leaks only as the server judged them; otherwise the patterns to watch, ranked by evidence. */
export function WorkingPanel({ ctx }: { ctx: AnalyticsContext }) {
  const { analysis: state, pro, currency } = ctx;
  return (
    <AnalysisPanel
      title="What is working · what is not"
      description={pro ? 'Judged by evidence across every breakdown, not by net P&L' : 'Judged by evidence; results by symbol only'}
      state={state}
      loadingHeight="h-32"
      what="what is working"
      padded={false}
    >
      {(a) => <WorkingList a={a} ctx={ctx} currency={currency} pro={pro} />}
    </AnalysisPanel>
  );
}

function WorkingList({ a, ctx, currency, pro }: { a: Analysis; ctx: AnalyticsContext; currency?: string; pro: boolean }) {
  const zone = a.period.timeZone || ctx.zone;
  const f = useMemo(() => {
    const dims = (pro ? (Object.keys(a.segments) as Dimension[]) : (['symbol'] as Dimension[]));
    return evidenceFindings(a.segments, dims, a.edge.expectancyR, a.tradeCount);
  }, [a, pro]);
  // The group nearest to 30 in and 30 out, to show how far the period is from any verdict.
  const closest = useMemo(() => {
    let best: { name: string; inside: number; outside: number } | null = null;
    for (const segs of Object.values(a.segments)) {
      for (const s of segs) {
        const outside = a.tradeCount - s.trades;
        if (!best || Math.min(s.trades, outside) > Math.min(best.inside, best.outside)) best = { name: s.name, inside: s.trades, outside };
      }
    }
    return best && Math.min(best.inside, best.outside) > 0 ? best : null;
  }, [a]);
  const judged = [...f.edges, ...f.leaks];
  return (
    <div className="px-4 pb-3 pt-3">
      {judged.length > 0 ? (
        <ul className="space-y-0.5" aria-label="Edges and leaks">
          {judged.map((x) => <FindingRow key={`${x.dim}-${x.seg.key}`} f={x} zone={zone} currency={currency} pro={pro} />)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing meets the evidence rule yet. A finding needs 30 trades in a group and 30 outside it{closest ? `; the closest is ${closest.name}, with ${closest.inside} in and ${closest.outside} outside` : ''}. <MetricInfo metric="evidence" label="How evidence is judged" />
        </p>
      )}
      {f.watch.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Patterns to watch</h3>
          <ul className="space-y-0.5" aria-label="Patterns to watch">
            {f.watch.map((x) => <FindingRow key={`${x.dim}-${x.seg.key}`} f={x} zone={zone} currency={currency} pro={pro} />)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Ranked by how far the average R sits from your {formatR(a.edge.expectancyR)}, weighted by trades. Too small to act on alone.</p>
        </>
      )}
    </div>
  );
}
