import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScopeBarSlot } from '@/components/shell/chrome';
import { LockedPreview } from '@/components/billing/ProGate';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { BreakdownExplorer } from '@/components/stats/BreakdownExplorer';
import { availableDimensions, explorerRows, segmentRows, type DimensionId } from '@/lib/analyticsRows';
import { previousPeriod } from '@/lib/dashboard';
import { useAppSelector } from '@/store/hooks';
import { DIMENSIONS, type Analysis, type Dimension } from '@/types/analysis';
import { downloadExplorerCsv } from './explorerCsv';
import { ComparePanel, TwoWayPanel } from './EdgePanels';
import { DIMENSION_LABEL } from './OverviewPanels';
import { PickAccountNotice } from './AnalysisGate';
import { rowLink, segmentHref, type AnalyticsContext } from './drill';
import { useOpenTrades } from './useAnalysis';

const QUESTION: Record<Dimension, string> = {
  symbol: 'Which instruments make you money?',
  setup: 'Which strategies make you money, and which cost you?',
  session: 'Which sessions are your best and worst?',
  weekday: 'Which weekdays are your best and worst?',
  hour: 'Which hours are your best and worst?',
  direction: 'Do you do better long or short?',
  assetClass: 'Which asset classes earn for you?',
  marketCondition: 'In which market conditions do you do best?',
  newsEvent: 'How do you do around news?',
  tag: 'Which of your tags go with better results?',
  plannedRR: 'Which planned reward-to-risk works for you?',
  holding: 'How long should your trades last?',
  tradeNumber: 'Which trade of the day is your best?',
  optionType: 'Calls or puts: which work for you?',
  expiryDay: 'How do you do on expiry day?',
};

/** Rows keep the server's order for these (it is the natural order); the rest rank by evidence. */
const ORDERED: Dimension[] = ['weekday', 'hour', 'plannedRR', 'holding', 'tradeNumber', 'expiryDay'];
const MULTI: Dimension[] = ['tag', 'newsEvent'];
const NONE = 'none';

/** Dimensions with segments in this period, Symbol always first (it is the Free one). */
export function analysisDimensions(a: Analysis | undefined): Dimension[] {
  return DIMENSIONS.filter((d) => d === 'symbol' || (a?.segments[d]?.length ?? 0) > 0);
}

/** `?by=strategy` from older links means the server's `setup`. */
const fromParam = (v: string | null): string | null => (v === 'strategy' ? 'setup' : v);

/** Breakdown explorer: Group by (and Pro "then by"), evidence per row, rows open their trades; periods side by side. */
export function EdgeTab({ ctx }: { ctx: AnalyticsContext }) {
  const { pro, currency, analysis: state } = ctx;
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const filters = useAppSelector((s) => s.trades.filters);
  const [params, setParams] = useSearchParams();
  const [comparing, setComparing] = useState(false);
  const open = useOpenTrades();
  const a = state?.data;
  const dims = useMemo(() => analysisDimensions(a), [a]);
  // Until the analysis arrives, the requested dimension stands (a Free user sees its lock at once); then it must have rows.
  const wanted = fromParam(params.get('by')) as Dimension | null;
  const by: Dimension = wanted && DIMENSIONS.includes(wanted) && (!a || dims.includes(wanted)) ? wanted : 'symbol';
  const then = (dims.find((d) => d === params.get('then') && d !== by) ?? null) as Dimension | null;
  const locked = !pro && by !== 'symbol';
  const rows = useMemo(() => segmentRows(a?.segments[by]), [a, by]);
  const zone = a?.period.timeZone ?? ctx.zone;
  const money = a?.currency ?? currency;
  const prev = useMemo(() => previousPeriod(filters.datePreset, filters.startDate, filters.endDate), [filters.datePreset, filters.startDate, filters.endDate]);

  const setParam = (key: 'by' | 'then', id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'edge');
    if ((key === 'by' && id === 'symbol') || (key === 'then' && id === NONE)) next.delete(key);
    else next.set(key, id);
    if (key === 'by' && next.get('then') === id) next.delete('then');
    setParams(next, { replace: true });
  };

  // All accounts in several currencies: the server will not add them, so the /stats explorer (one currency at a time) stays.
  if (state?.mixed) return <StatsEdge ctx={ctx} currencies={state.mixed} />;

  // A phone's scope bar has no room beside the account and period, so there it goes in the page.
  const exportCsv = !locked && a ? (
    <Button type="button" variant="outline" size="sm" disabled={rows.length === 0} onClick={() => downloadExplorerCsv(DIMENSION_LABEL[by], rows, money)}>
      Export CSV
    </Button>
  ) : null;

  // In the page, not the scope bar: two selects do not fit beside the account and period on narrow screens.
  const selects = (
    <div role="group" aria-label="Breakdown" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
      {/* Each label wraps together with its select, never onto a line of its own. */}
      <span className="flex items-center gap-2">
        <span id="group-by-label">Group by</span>
        <Select value={by} onValueChange={(v) => setParam('by', v)}>
          <SelectTrigger aria-labelledby="group-by-label" className="h-7 w-44 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dims.map((d) => (
              <SelectItem key={d} value={d}>
                {DIMENSION_LABEL[d]}
                {!pro && d !== 'symbol' ? <span className="ml-2 text-xs text-accent-text">Pro</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
      <span className="flex items-center gap-2 sm:ml-2">
        <span id="then-by-label">then by</span>
        <Select value={then ?? NONE} onValueChange={(v) => setParam('then', v)}>
          <SelectTrigger aria-labelledby="then-by-label" className="h-7 w-44 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nothing</SelectItem>
            {dims.filter((d) => d !== by).map((d) => (
              <SelectItem key={d} value={d}>
                {DIMENSION_LABEL[d]}
                {!pro ? <span className="ml-2 text-xs text-accent-text">Pro</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {selects}
      {exportCsv && (isMobile ? <div className="flex justify-end">{exportCsv}</div> : <ScopeBarSlot side="right">{exportCsv}</ScopeBarSlot>)}
      {locked ? (
        <LockedPreview title={`Group by ${DIMENSION_LABEL[by]}`} question={QUESTION[by]} currency={ent.currency} />
      ) : !a ? (
        state?.isError ? (
          <ErrorState title="Couldn't load this tab." description="The other tabs keep working." error={state.error} onRetry={state.refetch} />
        ) : (
          <Skeleton role="status" className="h-72" aria-label="Loading" />
        )
      ) : (
        <Panel padded={false}>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{a.tradeCount === 0 ? 'No trades in this period.' : `No trade has a ${DIMENSION_LABEL[by].toLowerCase()} in this period.`}</p>
          ) : (
            <BreakdownExplorer
              key={by}
              dimension={DIMENSION_LABEL[by]}
              rows={rows}
              currency={money}
              caption={`Breakdown by ${DIMENSION_LABEL[by].toLowerCase()}`}
              rowHref={(r) => segmentHref(by, r, zone)}
              onOpenIds={pro ? open : undefined}
              initialSort={ORDERED.includes(by) ? { id: 'order', dir: 'desc' } : undefined}
              totals={!MULTI.includes(by)}
            />
          )}
        </Panel>
      )}
      {then && a && (pro ? <TwoWayPanel scope={state!.scope} by={by} then={then} currency={money} zone={zone} /> : <LockedPreview title={`${DIMENSION_LABEL[by]} then by ${DIMENSION_LABEL[then].toLowerCase()}`} question="Which combinations work, such as a strategy in one session?" currency={ent.currency} />)}
      {a && (
        comparing ? (
          pro ? <ComparePanel scope={state!.scope} previous={prev ? { from: prev.startDate, to: prev.endDate } : null} currency={money} /> : <LockedPreview title="Compare two periods" question="Is this period better or worse than the one before?" currency={ent.currency} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setComparing(true)}>
            Compare with the period before{!pro ? <span className="ml-2 text-xs text-accent-text">Pro</span> : null}
          </Button>
        )
      )}
    </div>
  );
}

/** The `/stats` explorer, kept for All accounts in several currencies (switched one currency at a time). */
function StatsEdge({ ctx, currencies }: { ctx: AnalyticsContext; currencies: string[] }) {
  const { stats, pro, currency, zone } = ctx;
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const dims = useMemo(() => availableDimensions(stats), [stats]);
  const by = (dims.find((d) => d.id === params.get('by'))?.id ?? 'symbol') as DimensionId;
  const dim = dims.find((d) => d.id === by) ?? dims[0];
  const locked = !pro && !dim.free;
  const rows = useMemo(() => explorerRows(stats, by), [stats, by]);
  const setBy = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'edge');
    if (id === 'symbol') next.delete('by');
    else next.set('by', id);
    setParams(next, { replace: true });
  };
  const groupBy = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span id="group-by-label">Group by</span>
      <Select value={by} onValueChange={setBy}>
        <SelectTrigger aria-labelledby="group-by-label" className="h-7 w-40 text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dims.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.label}
              {!pro && !d.free ? <span className="ml-2 text-xs text-accent-text">Pro</span> : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <div className="space-y-4">
      {/* A phone's scope bar has no room beside the account and period. */}
      {isMobile ? groupBy : <ScopeBarSlot side="left">{groupBy}</ScopeBarSlot>}
      <PickAccountNotice currencies={currencies} what="evidence labels and the other breakdowns" />
      {locked ? (
        <LockedPreview title={`Group by ${dim.label}`} question={QUESTION[by === 'strategy' ? 'setup' : by]} currency={ent.currency} />
      ) : (
        <Panel padded={false}>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{by === 'strategy' || by === 'session' ? `Tag trades with a ${by} to compare them here.` : 'No trades in this period.'}</p>
          ) : (
            <BreakdownExplorer dimension={dim.label} rows={rows} currency={currency} caption={`Breakdown by ${dim.label.toLowerCase()}`} rowHref={(r) => rowLink(by, r, zone)} />
          )}
        </Panel>
      )}
    </div>
  );
}
