import { useMemo } from 'react';
import { format } from 'date-fns/format';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RMultiple } from '@/components/ui/money';
import { StatCell, StatStrip } from '@/components/stats/StatStrip';
import { chartSeries, equitySeries } from '@/lib/dashboard';
import { rBuckets } from '@/lib/analyticsRows';
import { formatCompactMoney, formatMoney, formatPercent, parseLocalDate } from '@/lib/format';
import { ChartFrame } from './ChartFrame';
import type { AnalyticsContext } from './drill';

const AXIS = { fontSize: 11, fill: 'hsl(var(--chart-axis))' } as const;

/** Drawdown (from the daily series), streaks and the server's distribution of realised R. */
export function RiskTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, multi, currency } = ctx;
  const drawdown = useMemo(
    () => chartSeries(equitySeries(stats.dailyPnl, (d) => d), (d) => d).points.map((p) => ({ date: p.date, drawdown: p.cumulative - p.peak })),
    [stats.dailyPnl],
  );
  const worst = drawdown.reduce((m, p) => Math.min(m, p.drawdown), 0);
  const dist = useMemo(() => rBuckets(stats.rDistribution), [stats.rDistribution]);
  const hasR = typeof stats.avgR === 'number';

  return (
    <div className="space-y-4">
      <StatStrip label="Risk statistics" className="grid-cols-2 lg:grid-cols-4">
        <StatCell metric="maxDrawdown" value={multi ? '—' : formatPercent(stats.maxDrawdown)} hint={multi ? 'Per account only' : 'of starting balance'} />
        <StatCell metric={hasR ? 'avgR' : 'plannedRR'} value={hasR ? <RMultiple value={stats.avgR as number} /> : stats.avgRiskReward ? stats.avgRiskReward.toFixed(2) : '—'} hint={hasR ? undefined : 'Planned, not realised'} />
        <StatCell metric="winStreak" value={stats.consecutiveWins ?? 0} />
        <StatCell metric="lossStreak" value={stats.consecutiveLosses ?? 0} />
      </StatStrip>

      <ChartFrame
          title="Drawdown"
          description="Distance below the highest point of the equity curve"
          summary={`Drawdown: deepest point ${formatMoney(worst, currency, { sign: true })} over ${drawdown.length} days`}
          table={{ head: ['Date', 'Below peak'], rows: [...drawdown].reverse().map((d) => [d.date, formatMoney(d.drawdown, currency, { sign: true })]) }}
          chart={
            drawdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No closed trades in this period.</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={drawdown} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(d: string) => format(parseLocalDate(d), 'd MMM')} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatCompactMoney(v)} />
                    <Tooltip formatter={(v: number) => [formatMoney(v, currency, { sign: true }), 'Below peak']} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                    <Area type="monotone" dataKey="drawdown" stroke="hsl(var(--loss))" fill="hsl(var(--loss))" fillOpacity={0.18} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          }
        />

      <ChartFrame
        title="Distribution of R"
        description={dist.sample > 0 ? `${dist.sample} trades with a stop loss${dist.noStop ? ` · ${dist.noStop} without one are not counted` : ''}` : undefined}
        summary={`Distribution of realised R over ${dist.sample} trades`}
        table={{ head: ['Result', 'Trades'], rows: dist.buckets.map((b) => [b.label, String(b.count)]) }}
        chart={
          dist.sample === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Trades need a stop loss to have an R. {dist.noStop} in this period have none.</p>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist.buckets} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={32} />
                  <Tooltip formatter={(v: number) => [`${v} ${v === 1 ? 'trade' : 'trades'}`, 'Count']} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        }
      />
    </div>
  );
}
