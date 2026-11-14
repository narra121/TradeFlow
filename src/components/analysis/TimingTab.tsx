import { useMemo } from 'react';
import { Panel } from '@/components/ui/panel';
import { MetricInfo } from '@/components/stats/MetricInfo';
import { BreakdownExplorer } from '@/components/stats/BreakdownExplorer';
import { explorerRows, segmentRows, timingGrid } from '@/lib/analyticsRows';
import { formatDurationMinutes, formatPercent } from '@/lib/format';
import { AnalysisGate, MixedCurrencyPanel } from './AnalysisGate';
import { TimingGrid } from './TimingGrid';
import { rowLink, type AnalyticsContext } from './drill';
import { useOpenTrades } from './useAnalysis';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Panel title={title} description={description} padded={false}>
      {children}
    </Panel>
  );
}

const ORDER = { id: 'order', dir: 'desc' } as const;

/**
 * When you trade well: weekday × hour grid (or ranked hour and weekday lists until the matrix exists), trade number in
 * the day and trades-per-day bands, sessions, holding time of winners against losers.
 */
export function TimingTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, currency, zone, analysis: state } = ctx;
  const open = useOpenTrades();
  const grid = useMemo(() => timingGrid(stats.weekdayHour), [stats.weekdayHour]);
  const hours = useMemo(() => explorerRows(stats, 'hour'), [stats]);
  const weekdays = useMemo(() => explorerRows(stats, 'weekday'), [stats]);
  const sessions = useMemo(() => explorerRows(stats, 'session'), [stats]);
  const buckets = (stats.durationBuckets ?? []).filter((b) => b.total > 0);
  const a = state?.data;
  const money = a?.currency ?? currency;
  const byNumber = useMemo(() => segmentRows(a?.timing.byTradeNumber), [a]);
  const perDay = useMemo(() => segmentRows(a?.timing.tradesPerDay), [a]);
  const holding = useMemo(() => segmentRows(a?.segments.holding), [a]);
  const pad = 'p-4';

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
              <BreakdownExplorer dimension="Hour" rows={hours} currency={currency} caption="Breakdown by hour" rowHref={(r) => rowLink('hour', r, zone)} />
            )}
          </Section>
          <Section title="By weekday">
            {weekdays.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">No trades in this period.</p> : (
              <BreakdownExplorer dimension="Weekday" rows={weekdays} currency={currency} caption="Breakdown by weekday" rowHref={(r) => rowLink('weekday', r, zone)} />
            )}
          </Section>
        </div>
      )}

      {state?.mixed ? <MixedCurrencyPanel currencies={state.mixed} what="results by trade number, trades per day and holding band" /> : <div className="grid gap-4 2xl:grid-cols-2 [&>*]:min-w-0">
        <Section title="Trade number in the day" description="Your 1st, 2nd, 3rd and later trades of each day">
          <AnalysisGate state={state} stateClassName={pad} what="results by trade number" loadingHeight="h-32">
            {() => (
              <>
                <BreakdownExplorer dimension="Trade" rows={byNumber} currency={money} caption="Results by trade number in the day" rowHref={() => null} onOpenIds={open} initialSort={ORDER} footnote={false} />
                <p className="px-3 py-2 text-xs text-muted-foreground"><MetricInfo metric="tradeNumber" label="How trades are numbered" /></p>
              </>
            )}
          </AnalysisGate>
        </Section>
        <Section title="Trades per day" description="Days grouped by how many trades you took">
          <AnalysisGate state={state} stateClassName={pad} what="results by trades per day" loadingHeight="h-32">
            {() => (
              <>
                <BreakdownExplorer dimension="Day type" rows={perDay} currency={money} caption="Results by trades per day" rowHref={() => null} onOpenIds={open} initialSort={ORDER} perDay footnote={false} />
                <p className="px-3 py-2 text-xs text-muted-foreground"><MetricInfo metric="tradesPerDay" label="What an average day is" /></p>
              </>
            )}
          </AnalysisGate>
        </Section>
      </div>}

      <Section title="By session">
        {sessions.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">Tag trades with a session to see this table.</p> : (
          <BreakdownExplorer dimension="Session" rows={sessions} currency={currency} caption="Breakdown by session" rowHref={(r) => rowLink('session', r)} />
        )}
      </Section>

      <Panel title="Holding time" description="Winners against losers, and results per holding band" padded={false}>
        {!state?.mixed && <AnalysisGate
          state={state}
          stateClassName={pad}
          what="holding times"
          loadingHeight="h-32"
          empty={<p className="text-sm text-muted-foreground">No closed trades in this period.</p>}
        >
          {(an) => (
            <>
              <dl className="grid grid-cols-2 gap-4 px-4 pb-2 pt-3 sm:max-w-md">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground"><MetricInfo metric="holdingMedian" label="Winners, median" /></dt>
                  <dd className="mt-1 font-mono text-xl font-medium tabular-nums">{formatDurationMinutes(an.timing.holding.winnersMedianMin)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground"><MetricInfo metric="holdingMedian" label="Losers, median" /></dt>
                  <dd className="mt-1 font-mono text-xl font-medium tabular-nums">{formatDurationMinutes(an.timing.holding.losersMedianMin)}</dd>
                </div>
              </dl>
              {an.timing.holding.winnersMedianMin != null && an.timing.holding.losersMedianMin != null && (
                <p className="px-4 pb-3 text-xs text-muted-foreground">
                  {an.timing.holding.losersMedianMin > an.timing.holding.winnersMedianMin ? 'Losers are held longer than winners.' : 'Losers are not held longer than winners.'}
                </p>
              )}
              {holding.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">No trade has both an entry and an exit time.</p>
              ) : (
                <BreakdownExplorer dimension="Holding time" rows={holding} currency={money} caption="Results by holding time" rowHref={() => null} onOpenIds={open} initialSort={ORDER} footnote={false} />
              )}
            </>
          )}
        </AnalysisGate>}
        {state?.mixed && buckets.length === 0 && <p className="p-4 text-sm text-muted-foreground">No closed trades with entry and exit times.</p>}
        {state?.mixed && buckets.length > 0 && (
          <table className="w-full text-[13px]">
            <caption className="sr-only">Holding time buckets</caption>
            <thead>
              <tr className="h-8 border-y border-border text-left text-xs text-muted-foreground">
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
      </Panel>
    </div>
  );
}
