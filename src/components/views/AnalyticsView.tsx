import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { LockedPreview } from '@/components/billing/ProGate';
import { ScopeBarSlot, usePageChrome } from '@/components/shell/chrome';
import { BehaviourTab } from '@/components/analysis/BehaviourTab';
import { EdgeTab } from '@/components/analysis/EdgeTab';
import { OverviewTab } from '@/components/analysis/OverviewTab';
import { RiskTab } from '@/components/analysis/RiskTab';
import { TaxReport } from '@/components/analysis/TaxReport';
import { TimingTab } from '@/components/analysis/TimingTab';
import type { AnalyticsContext } from '@/components/analysis/drill';
import { useAnalysis } from '@/components/analysis/useAnalysis';
import { CompareSwitch } from '@/components/stats/CompareSwitch';
import { CurrencySwitch } from '@/components/stats/CurrencySwitch';
import { usePeriodStats } from '@/components/stats/usePeriodStats';
import { useCurrencyView } from '@/components/stats/useCurrencyView';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { getDateRangeFromPreset } from '@/lib/scope';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'edge', label: 'Edge' },
  { id: 'timing', label: 'Timing', pro: true },
  { id: 'risk', label: 'Risk', pro: true },
  { id: 'behaviour', label: 'Behaviour' },
  { id: 'tax', label: 'Tax', taxPro: true },
] as const;
type TabId = (typeof TABS)[number]['id'];

const LOCKED: Partial<Record<TabId, { title: string; question: string }>> = {
  timing: { title: 'Timing', question: 'When should I trade, and when should I stop? Hours, weekdays, trade number in the day and holding time.' },
  risk: { title: 'Risk', question: 'Is my risk under control? Losses past the stop, risk per trade, drawdowns and a next-100-trades scenario.' },
};

/** Minimum trades before the statistics mean anything. */
const MIN_TRADES = 3;

export function AnalyticsView() {
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const filters = useAppSelector((s) => s.trades.filters);
  const trade = useTradeParam();
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const { accounts, selectedAccountId, accountsLoading, accountsError, accountsErrorDetail, drawdownBasis } = useScopeCapital();
  const selectedCurrency = accounts.find((a) => a.id === selectedAccountId)?.currency;

  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId;
  const pro = ent.isError || ent.can('advanced_analytics');
  const taxPro = ent.isError || ent.can('tax_report');
  const tabNeedsPro = tab === 'timing' || tab === 'risk';
  const locked = tabNeedsPro && !ent.isLoading && !pro;

  usePageChrome({
    tabs: TABS.map((t) => ({
      id: t.id,
      label: t.label,
      to: t.id === 'overview' ? '/app/analytics' : `/app/analytics?tab=${t.id}`,
      active: tab === t.id,
      badge: ('pro' in t && !pro && !ent.isLoading) || ('taxPro' in t && !taxPro && !ent.isLoading) ? 'Pro' : undefined,
    })),
  });

  const skip = tab === 'tax' || locked || (tabNeedsPro && ent.isLoading);
  const ps = usePeriodStats({ skip });
  const analysis = useAnalysis({ skip });
  const view = useCurrencyView(ps.stats, ps.prev);
  const currency = view.currency ?? selectedCurrency;

  const showAllTime = () => {
    const range = getDateRangeFromPreset('all');
    dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(range.from), endDate: formatLocalDateOnly(range.to), datePreset: 'all' }));
  };

  // A phone's scope bar has no room beside the account and period: the switch would clip the period control.
  const compare = tab === 'overview' && ps.canCompare ? (
    isMobile ? (
      <div className="flex justify-end"><CompareSwitch /></div>
    ) : (
      <ScopeBarSlot side="right">
        <CompareSwitch />
      </ScopeBarSlot>
    )
  ) : null;

  if (tab === 'tax') return <TaxReport />;
  if (locked) {
    const l = LOCKED[tab]!;
    return <LockedPreview title={l.title} question={l.question} currency={ent.currency} />;
  }
  const noTradesCta = (
    <>
      <Button size="sm" onClick={() => trade.openNew()}>Add trade</Button>
      <Button asChild size="sm" variant="outline"><Link to="/app/import">Import</Link></Button>
    </>
  );
  // A failed account list is an outage, not "no trades": say so and offer Retry before any empty state.
  if (accountsError) return <ErrorState title="Couldn't load your accounts." description="Your data is safe." error={accountsErrorDetail} onRetry={() => window.location.reload()} />;
  if (!accountsLoading && accounts.length === 0) return <EmptyState title={`Add at least ${MIN_TRADES} trades to see analytics.`} action={noTradesCta} />;
  if (ps.isError) return <ErrorState title="Couldn't load this tab." description="The other tabs keep working." error={ps.error} onRetry={ps.refetch} />;
  if (ps.isLoading || !ps.stats || ent.isLoading) {
    return (
      <div role="status" className="space-y-4" aria-busy="true" aria-label="Loading analytics">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (ps.stats.totalTrades < MIN_TRADES) {
    return (
      <EmptyState
        title={`Add at least ${MIN_TRADES} trades to see analytics.`}
        description={ps.stats.totalTrades > 0 || filters.datePreset === 'all' ? undefined : 'There are none in this period.'}
        action={
          <>
            {noTradesCta}
            {filters.datePreset !== 'all' && <Button size="sm" variant="ghost" onClick={showAllTime}>Show all time</Button>}
          </>
        }
      />
    );
  }

  const ctx: AnalyticsContext = { stats: view.stats ?? ps.stats, prev: view.prev, prevRange: ps.prevRange, prevEmpty: ps.prevEmpty, currency, multi: view.currencies.length > 1, noBalance: drawdownBasis === 'balance', zone: (ps.stats.timeZone as string | undefined) ?? 'UTC', pro, analysis };

  return (
    <div className="space-y-4">
      {compare}
      {view.currency && view.currencies.length > 1 && (
        isMobile ? (
          <CurrencySwitch currencies={view.currencies} value={view.currency} onChange={view.select} />
        ) : (
          <ScopeBarSlot side="left">
            <CurrencySwitch currencies={view.currencies} value={view.currency} onChange={view.select} />
          </ScopeBarSlot>
        )
      )}
      {tab === 'overview' && <OverviewTab ctx={ctx} />}
      {tab === 'edge' && <EdgeTab ctx={ctx} />}
      {tab === 'timing' && <TimingTab ctx={ctx} />}
      {tab === 'risk' && <RiskTab ctx={ctx} />}
      {tab === 'behaviour' && <BehaviourTab ctx={ctx} />}
    </div>
  );
}
