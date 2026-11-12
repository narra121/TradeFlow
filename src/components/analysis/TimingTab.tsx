import { useMemo } from 'react';
import { Panel } from '@/components/ui/panel';
import { BreakdownExplorer } from '@/components/stats/BreakdownExplorer';
import { explorerRows, timingGrid } from '@/lib/analyticsRows';
import { formatDurationMinutes, formatPercent } from '@/lib/format';
import { TimingGrid } from './TimingGrid';
import { rowLink, type AnalyticsContext } from './drill';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Panel title={title} description={description} padded={false}>
      {children}
    </Panel>
  );
}

/** When you trade well: weekday × hour grid (or ranked hour and weekday lists until the matrix exists), sessions, holding time. */
export function TimingTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, currency, zone } = ctx;
  const grid = useMemo(() => timingGrid(stats.weekdayHour), [stats.weekdayHour]);
  const hours = useMemo(() => explorerRows(stats, 'hour'), [stats]);
  const weekdays = useMemo(() => explorerRows(stats, 'weekday'), [stats]);
  const sessions = useMemo(() => explorerRows(stats, 'session'), [stats]);
  const buckets = (stats.durationBuckets ?? []).filter((b) => b.total > 0);

  return (
    <div className="space-y-4">
      {grid ? (
        <Section title="Weekday and hour" description="Net P&L per cell; select a cell to open its trades">
          <div className="p-4"><TimingGrid grid={grid} currency={currency} zone={zone} /></div>
        </Section>
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
          <Section title="By hour" description={`Times in ${zone}`}>
            {hours.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">No trades with a time in this period.</p> : (
              <BreakdownExplorer dimension="Hour" rows={hours} currency={currency} caption="Breakdown by hour" rowHref={(r) => rowLink('hour', r)} />
            )}
          </Section>
          <Section title="By weekday">
            {weekdays.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">No trades in this period.</p> : (
              <BreakdownExplorer dimension="Weekday" rows={weekdays} currency={currency} caption="Breakdown by weekday" rowHref={(r) => rowLink('weekday', r)} />
            )}
          </Section>
        </div>
      )}

      <Section title="By session">
        {sessions.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">Tag trades with a session to see this table.</p> : (
          <BreakdownExplorer dimension="Session" rows={sessions} currency={currency} caption="Breakdown by session" rowHref={(r) => rowLink('session', r)} />
        )}
      </Section>

      <Section title="Holding time" description={`Average ${formatDurationMinutes((stats.avgHoldingTime ?? 0) * 60)}`}>
        {buckets.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">No closed trades with entry and exit times.</p> : (
          <table className="w-full text-[13px]">
            <caption className="sr-only">Holding time buckets</caption>
            <thead>
              <tr className="h-8 border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 font-medium">Duration</th>
                <th scope="col" className="px-3 text-right font-medium">Trades</th>
                <th scope="col" className="px-4 text-right font-medium">Win %</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.range} className="h-9 border-b border-border/60 last:border-0">
                  <th scope="row" className="px-4 text-left font-normal">{b.range}</th>
                  <td className="px-3 text-right font-mono tabular-nums">{b.total}</td>
                  <td className="px-4 text-right font-mono tabular-nums">{formatPercent(b.total ? (b.wins / b.total) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
