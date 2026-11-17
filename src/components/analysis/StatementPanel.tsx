import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Money, RMultiple } from '@/components/ui/money';
import { Delta } from '@/components/stats/Delta';
import { MetricInfo } from '@/components/stats/MetricInfo';
import type { MetricKey } from '@/components/stats/metricDefs';
import { useIsMobile } from '@/hooks/use-mobile';
import { realisedRStat, rNoteLine } from '@/lib/analyticsRows';
import { plural } from '@/lib/evidence';
import { formatPercent, formatProfitFactor, formatDayText } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AnalyticsContext } from './drill';

interface RowProps {
  metric: MetricKey;
  label?: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  wide?: boolean;
  /** Sample text for the popover. */
  sample?: string;
}

function Row({ metric, label, value, delta, wide, sample }: RowProps) {
  return (
    <div className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
      <dt className="truncate text-[13px] text-foreground-soft"><MetricInfo metric={metric} label={label} sample={sample} className="[@media(pointer:coarse)]:m-0 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:p-0" /></dt>
      {/* The change column is reserved only while a comparison is shown, so labels keep their room otherwise. */}
      <dd className={cn('grid items-baseline gap-x-3 text-right', !wide && delta !== undefined && 'sm:grid-cols-[7rem_7.5rem]')}>
        <span className={cn('font-mono text-[13px] font-medium tabular-nums', !wide && delta !== undefined && 'sm:col-start-1')}>{value}</span>
        {!wide && delta}
      </dd>
    </div>
  );
}

/** `note`: a line under the column's rows, so no row grows taller than its neighbours in the other columns. */
function Column({ title, children, collapsible, defaultOpen, note }: { title: string; children: React.ReactNode; collapsible: boolean; defaultOpen: boolean; note?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  return (
    <section aria-label={title} className="min-w-0 bg-card px-4 py-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {collapsible ? (
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1 uppercase tracking-wide [@media(pointer:coarse)]:min-h-11">
            {title}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
        ) : (
          title
        )}
      </h3>
      {shown && <dl className="mt-2 space-y-0.5">{children}</dl>}
      {shown && note && <p className="mt-1 text-right text-[11px] leading-4 text-muted-foreground">{note}</p>}
    </section>
  );
}

/** Twelve figures as one statement: Performance · Trades · Risk, each with its change against the previous period. */
export function StatementPanel({ ctx }: { ctx: AnalyticsContext }) {
  const mobile = useIsMobile();
  const { stats: s, prev, prevRange, multi, currency } = ctx;
  const noDrawdown = multi || !!ctx.noBalance;
  const d = { name: prevRange?.name ?? '', spokenName: prevRange?.spokenName };
  const money = (v: number | undefined) => <Money value={v} currency={currency} />;
  const wins = s.wins ?? 0;
  const r = realisedRStat(s);
  const hasR = r.avgR !== null;
  const prevR = realisedRStat(prev).avgR ?? undefined;
  const moneyDelta = (cur: number | undefined, p: number | undefined) => (prev ? <Delta kind="money" current={cur} previous={p} currency={currency} {...d} /> : undefined);

  return (
    <div className="space-y-2">
      {ctx.prevEmpty && prevRange && (
        <p className="text-xs text-muted-foreground">
          No trades in the previous period ({formatDayText(prevRange.startDate, true)} – {formatDayText(prevRange.endDate, true)}), so there is nothing to compare with.
        </p>
      )}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
        <Column title="Performance" collapsible={mobile} defaultOpen>
          <Row metric="netPnl" value={money(s.totalPnl)} delta={moneyDelta(s.totalPnl, prev?.totalPnl)} />
          <Row metric="expectancy" value={money(s.expectancy)} delta={moneyDelta(s.expectancy, prev?.expectancy)} />
          <Row metric="profitFactor" value={formatProfitFactor(s.profitFactor, wins, s.totalTrades)} delta={prev ? <Delta kind="ratio" current={s.profitFactor} previous={prev.profitFactor} {...d} /> : undefined} />
          <Row metric="winRate" value={`${formatPercent(s.winRate)} · ${plural(s.totalTrades, 'trade')}`} delta={prev ? <Delta kind="pts" current={s.winRate} previous={prev.winRate} {...d} /> : undefined} />
        </Column>
        <Column title="Trades" collapsible={mobile} defaultOpen={false}>
          <Row metric="trades" value={s.totalTrades} delta={prev ? <Delta kind="count" current={s.totalTrades} previous={prev.totalTrades} {...d} /> : undefined} />
          <Row metric="avgWin" value={money(s.avgWin)} delta={moneyDelta(s.avgWin, prev?.avgWin)} />
          <Row metric="avgLoss" value={money(-Math.abs(s.avgLoss))} delta={moneyDelta(-Math.abs(s.avgLoss), prev ? -Math.abs(prev.avgLoss) : undefined)} />
          <Row
            metric="bestWorst"
            wide
            value={
              <>
                <Money value={s.bestTrade} currency={currency} /> / <Money value={s.worstTrade} currency={currency} />
              </>
            }
          />
        </Column>
        <Column title="Risk" collapsible={mobile} defaultOpen={false} note={rNoteLine(r)}>
          <Row
            metric={hasR ? 'avgR' : 'plannedRR'}
            value={hasR ? <RMultiple value={r.avgR} /> : r.planned !== null ? r.planned.toFixed(2) : '—'}
            delta={prev ? (hasR ? <Delta kind="r" current={r.avgR as number} previous={prevR} {...d} /> : <Delta kind="ratio" current={s.avgRiskReward} previous={prev.avgRiskReward} {...d} />) : undefined}
            sample={r.sample || undefined}
          />
          <Row metric="maxDrawdown" value={noDrawdown ? '—' : formatPercent(s.maxDrawdown)} delta={!noDrawdown && prev ? <Delta kind="pts" current={s.maxDrawdown} previous={prev.maxDrawdown} lowerIsBetter {...d} /> : undefined} />
          <Row metric="winStreak" value={s.consecutiveWins ?? 0} />
          <Row metric="lossStreak" value={s.consecutiveLosses ?? 0} />
        </Column>
      </div>
    </div>
  );
}
