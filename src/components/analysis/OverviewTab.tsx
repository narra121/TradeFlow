import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { Money, RMultiple } from '@/components/ui/money';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { availableDimensions, DIMENSIONS, explorerRows, MIN_SEGMENT_TRADES, whatIsWorking, type Standout } from '@/lib/analyticsRows';
import { equitySeries } from '@/lib/dashboard';
import { formatPercent } from '@/lib/format';
import { StatementPanel } from './StatementPanel';
import { rowLink, type AnalyticsContext } from './drill';

function StandoutRow({ s, up, currency }: { s: Standout; up: boolean; currency?: string }) {
  const { row } = s;
  return (
    <li>
      <Link
        to={rowLink(s.dimId, row) ?? '/app/tradelog'}
        className="grid min-h-9 grid-cols-[1rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-sm text-[13px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1rem_minmax(0,1fr)_5rem_4rem_7rem_4rem_1rem]"
      >
        <span aria-hidden="true" className="text-muted-foreground">{up ? '▲' : '▼'}</span>
        <span className="truncate"><span className="font-medium">{row.name}</span> <span className="text-muted-foreground">· {s.dimension.replace(' (UTC)', '').toLowerCase()}</span></span>
        <span className="hidden text-right font-mono tabular-nums text-muted-foreground sm:block">{row.trades} trades</span>
        <span className="hidden text-right font-mono tabular-nums sm:block">{formatPercent(row.winRate)}</span>
        <Money value={row.net} currency={currency} className="text-right" />
        <span className="hidden text-right sm:block">{row.avgR !== undefined ? <RMultiple value={row.avgR} /> : null}</span>
        <span aria-hidden="true" className="hidden text-muted-foreground sm:block">→</span>
      </Link>
    </li>
  );
}

/** Statement of twelve figures, equity with drawdown, and the segments that earn and cost the most. */
export function OverviewTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, pro, currency } = ctx;
  const points = useMemo(() => equitySeries(stats.dailyPnl, (d) => d), [stats.dailyPnl]);
  const standouts = useMemo(() => {
    const dims = pro ? availableDimensions(stats) : DIMENSIONS.filter((d) => d.free);
    return whatIsWorking(dims.map((dim) => ({ dim, rows: explorerRows(stats, dim.id) })));
  }, [stats, pro]);

  return (
    <div className="space-y-4">
      <StatementPanel ctx={ctx} />
      {ctx.multi && (
        <p className="text-xs text-muted-foreground">
          Figures are for {currency}; switch currency in the bar above. Max drawdown needs one account, because a percentage of two currencies' starting balances means nothing.
        </p>
      )}
      <Panel>
        <EquityChart points={points} currency={currency} title="Equity and drawdown" />
      </Panel>
      <Panel title="What is working · what is not" description={`Segments with at least ${MIN_SEGMENT_TRADES} trades${pro ? '' : ' (symbols on Free)'}`} padded={false}>
        {standouts.working.length === 0 && standouts.notWorking.length === 0 ? (
          <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">No segment has {MIN_SEGMENT_TRADES} trades with a clear result yet.</p>
        ) : (
          <ul className="space-y-0.5 px-4 pb-3 pt-2">
            {standouts.working.map((s) => <StandoutRow key={`w-${s.dimId}-${s.row.key}`} s={s} up currency={currency} />)}
            {standouts.notWorking.map((s) => <StandoutRow key={`n-${s.dimId}-${s.row.key}`} s={s} up={false} currency={currency} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
