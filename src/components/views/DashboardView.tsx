import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Money, RMultiple } from '@/components/ui/money';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ScopeBarSlot } from '@/components/shell/chrome';
import { EquityChart } from '@/components/dashboard/EquityChart';
import { GoalsSummary } from '@/components/dashboard/GoalsSummary';
import { MonthHeat } from '@/components/dashboard/MonthHeat';
import { NeedsAttention } from '@/components/dashboard/NeedsAttention';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { TodayStrip } from '@/components/dashboard/TodayStrip';
import { useWeekGoals } from '@/components/dashboard/useWeekGoals';
import { FirstRunPage } from '@/components/onboarding/FirstRunPage';
import { CompareSwitch } from '@/components/stats/CompareSwitch';
import { CurrencySwitch } from '@/components/stats/CurrencySwitch';
import { useCurrencyView } from '@/components/stats/useCurrencyView';
import { Delta } from '@/components/stats/Delta';
import { StatCell, StatStrip } from '@/components/stats/StatStrip';
import { usePeriodStats } from '@/components/stats/usePeriodStats';
import { useScopeCapital } from '@/components/stats/useScopeCapital';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { appToday, appTodayKey } from '@/lib/appTimeZone';
import { equitySeries, needsAttention, todaySummary } from '@/lib/dashboard';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { formatDateShort, formatPercent, formatProfitFactor, parseLocalDate } from '@/lib/format';
import { getDateRangeFromPreset } from '@/lib/scope';

interface DashboardViewProps {
  onAddTrade?: () => void;
  onImportTrades?: () => void;
}

const MAX_CURRENCY_LINES = 2;

export function DashboardView(_props: DashboardViewProps = {}) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.trades.filters);
  const { accounts, selectedAccountId, accountsLoading, accountsError, accountsErrorDetail, drawdownBasis } = useScopeCapital();
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const trade = useTradeParam();
  const scope = useScopeTrades();
  const { trades } = scope;
  const ps = usePeriodStats({ includeEquityCurve: true });
  const { stats, prev, prevRange } = ps;

  const todayKey = appTodayKey();
  const todayScope = useScopeTrades({ accountId: filters.accountId, startDate: todayKey, endDate: todayKey });
  const week = useWeekGoals();
  const isMobile = useIsMobile();

  const view = useCurrencyView(stats, prev);
  const byCurrency = (stats as { byCurrency?: Record<string, { totalPnl: number; totalTrades: number; profitFactor: number | null; wins: number }> } | undefined)?.byCurrency;
  const currencies = useMemo(
    () => (view.currencies.length > 1 ? view.currencies.map((c) => ({ currency: c, net: byCurrency?.[c]?.totalPnl ?? 0, trades: byCurrency?.[c]?.totalTrades ?? 0, profitFactor: byCurrency?.[c]?.profitFactor ?? null, wins: byCurrency?.[c]?.wins ?? 0 })).sort((a, b) => b.trades - a.trades) : []),
    [view.currencies, byCurrency],
  );
  const mixed = currencies.length > 1;
  const selectedAccount = selectedAccountId ? accountMap.get(selectedAccountId) : undefined;
  const currency = mixed ? undefined : view.currency ?? selectedAccount?.currency;
  const chartCurrency = mixed ? view.currency : currency;
  const today = useMemo(() => todaySummary(todayScope.trades, accountMap), [todayScope.trades, accountMap]);
  const attention = useMemo(() => needsAttention(trades), [trades]);
  const points = useMemo(() => equitySeries((mixed ? view.stats : stats)?.dailyPnl, (d) => d), [mixed, view.stats, stats]);
  const heatAnchor = useMemo(() => {
    const end = parseLocalDate(filters.endDate);
    const today = appToday();
    return Number.isNaN(end.getTime()) || end > today ? today : end;
  }, [filters.endDate]);

  const showAllTime = () => {
    const range = getDateRangeFromPreset('all');
    dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(range.from), endDate: formatLocalDateOnly(range.to), datePreset: 'all' }));
  };

  if (accountsError) return <ErrorState title="Couldn't load your accounts." description="Your data is safe." error={accountsErrorDetail} onRetry={() => window.location.reload()} />;
  if (!accountsLoading && accounts.length === 0) return <FirstRunPage tradeCount={0} />;

  // Phones: the scope bar has no room for the switch beside the account and period, so it sits in the page.
  const compareSlot = ps.canCompare ? (
    isMobile ? (
      <div className="flex justify-end"><CompareSwitch /></div>
    ) : (
      <ScopeBarSlot side="right">
        <CompareSwitch />
      </ScopeBarSlot>
    )
  ) : null;

  const statsLoading = ps.isLoading || !ps.accountsReady;
  const noTradesInPeriod = !scope.isLoading && !scope.isError && trades.length === 0;

  const quiet = noTradesInPeriod && !statsLoading;
  if (quiet && filters.datePreset === 'all' && filters.accountId === 'ALL') return <FirstRunPage tradeCount={0} />;
  const emptyPeriod = (
    <div className="flex flex-col items-start gap-2 py-2">
      <p className="text-sm text-muted-foreground">{filters.datePreset === 'all' ? 'No trades for this account yet.' : 'No trades in this period.'}</p>
      {filters.datePreset !== 'all' && <Button size="sm" variant="outline" onClick={showAllTime}>Show all time</Button>}
    </div>
  );

  const s = stats;
  const wins = s?.wins ?? 0;
  const total = s?.totalTrades ?? 0;
  const hasRealisedR = typeof s?.avgR === 'number';
  const avgR = hasRealisedR ? (s?.avgR as number) : undefined;
  const prevAvgR = prev && typeof prev.avgR === 'number' ? (prev.avgR as number) : undefined;
  const name = prevRange?.name ?? '';
  const spoken = prevRange?.spokenName;

  const deltaProps = { name, spokenName: spoken };
  const sinceStart = selectedAccount && selectedAccount.initialBalance > 0 ? ((selectedAccount.balance - selectedAccount.initialBalance) / selectedAccount.initialBalance) * 100 : null;

  const strip = ps.isError ? (
    <ErrorState title="Couldn't load your statistics." description="Your data is safe." error={ps.error} onRetry={ps.refetch} />
  ) : quiet ? (
    <StatStrip label="Period statistics" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {(['netPnl', 'winRate', 'profitFactor', 'plannedRR', 'maxDrawdown'] as const).map((m) => <StatCell key={m} metric={m} value="—" />)}
    </StatStrip>
  ) : (
    <StatStrip label="Period statistics" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {selectedAccount && (
        <StatCell
          metric="balance"
          value={<Money value={selectedAccount.balance} currency={selectedAccount.currency} sign={false} neutral />}
          hint={sinceStart === null ? undefined : `${formatPercent(sinceStart, 1, { sign: true })} since start`}
        />
      )}
      <StatCell
        metric="netPnl"
        to={statsLoading ? undefined : '/app/analytics'}
        className={mixed ? 'col-span-2 sm:col-span-1' : undefined}
        value={
          statsLoading ? <Skeleton className="h-5 w-24" /> : mixed ? (
            <span className="flex flex-col text-sm leading-5">
              {currencies.slice(0, MAX_CURRENCY_LINES).map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}
              {currencies.length > MAX_CURRENCY_LINES && <span className="text-xs text-muted-foreground">+{currencies.length - MAX_CURRENCY_LINES} more</span>}
            </span>
          ) : (
            <Money value={s?.totalPnl ?? 0} currency={currency} />
          )
        }
        hint={mixed ? 'One line per currency' : undefined}
        delta={!mixed && prev ? <Delta kind="money" current={s?.totalPnl} previous={prev.totalPnl} currency={currency} {...deltaProps} /> : undefined}
      />
      <StatCell
        metric="winRate"
        to={statsLoading ? undefined : '/app/analytics'}
        value={statsLoading ? <Skeleton className="h-5 w-16" /> : formatPercent(s?.winRate ?? 0)}
        hint={statsLoading ? undefined : `${wins}W · ${s?.losses ?? 0}L · ${total} ${total === 1 ? 'trade' : 'trades'}`}
        sample={`${total} ${total === 1 ? 'trade' : 'trades'}`}
        delta={prev ? <Delta kind="pts" current={s?.winRate} previous={prev.winRate} {...deltaProps} /> : undefined}
      />
      <StatCell
        metric="profitFactor"
        to={statsLoading ? undefined : '/app/analytics'}
        value={
          statsLoading ? <Skeleton className="h-5 w-12" /> : mixed ? (
            <span className="flex flex-col text-sm leading-5">
              {currencies.slice(0, MAX_CURRENCY_LINES).map((c) => <span key={c.currency}><span className="text-xs text-muted-foreground">{c.currency}</span> {formatProfitFactor(c.profitFactor, c.wins, c.trades)}</span>)}
            </span>
          ) : formatProfitFactor(s?.profitFactor, wins, total)
        }
        hint={mixed ? 'One line per currency' : undefined}
        delta={!mixed && prev ? <Delta kind="ratio" current={s?.profitFactor} previous={prev.profitFactor} {...deltaProps} /> : undefined}
      />
      <StatCell
        // While loading, the label the figure usually ends as (Avg R): no flip from Planned R:R when the stats arrive.
        metric={statsLoading || hasRealisedR ? 'avgR' : 'plannedRR'}
        to={statsLoading ? undefined : '/app/analytics?tab=risk'}
        value={statsLoading ? <Skeleton className="h-5 w-12" /> : hasRealisedR ? <RMultiple value={avgR} /> : s?.avgRiskReward ? s.avgRiskReward.toFixed(2) : '—'}
        hint={statsLoading || hasRealisedR ? undefined : 'Planned, not realised'}
        delta={prev ? (hasRealisedR ? <Delta kind="r" current={avgR} previous={prevAvgR} {...deltaProps} /> : <Delta kind="ratio" current={s?.avgRiskReward} previous={prev.avgRiskReward} {...deltaProps} />) : undefined}
      />
      <StatCell
        metric="maxDrawdown"
        to={statsLoading ? undefined : '/app/analytics?tab=risk'}
        value={statsLoading ? <Skeleton className="h-5 w-12" /> : mixed || drawdownBasis !== 'ok' ? '—' : formatPercent(s?.maxDrawdown ?? 0)}
        hint={mixed || drawdownBasis === 'mixed' ? 'Per account only' : drawdownBasis === 'balance' ? 'Set a starting balance' : undefined}
        delta={!mixed && drawdownBasis === 'ok' && prev ? <Delta kind="pts" current={s?.maxDrawdown} previous={prev.maxDrawdown} lowerIsBetter {...deltaProps} /> : undefined}
      />
    </StatStrip>
  );

  return (
    <div className="space-y-4">
      {compareSlot}
      <TodayStrip today={today} todayLoading={todayScope.isLoading} week={week} todayKey={todayKey} />
      {/* Compare is on but the equal earlier period is empty: say so, as Analytics does, instead of showing nothing. */}
      {ps.prevEmpty && prevRange && !quiet && (
        <p className="text-xs text-muted-foreground">
          No trades in the previous period ({formatDateShort(prevRange.startDate, true)} – {formatDateShort(prevRange.endDate, true)}), so there is nothing to compare with.
        </p>
      )}
      {strip}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <section className={`flex flex-col rounded-lg border border-border bg-card p-4 max-md:order-1 xl:col-span-7`}>
          {ps.isError ? (
            <ErrorState title="Couldn't load your statistics." error={ps.error} onRetry={ps.refetch} />
          ) : statsLoading ? (
            <Skeleton className="h-[320px]" aria-busy="true" />
          ) : quiet ? (
            <>
              <h3 className="mb-2 text-[13px] font-semibold">Equity</h3>
              {emptyPeriod}
            </>
          ) : mixed ? (
            <>
              <div className="mb-2"><CurrencySwitch currencies={view.currencies} value={view.currency ?? view.currencies[0]} onChange={view.select} /></div>
              <EquityChart points={points} currency={chartCurrency} fill />
            </>
          ) : (
            <EquityChart points={points} currency={currency} fill />
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 max-md:order-4 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1 [&>*]:min-w-0">
          <MonthHeat accountId={filters.accountId} accounts={accountMap} anchor={heatAnchor} />
          <GoalsSummary week={week} currency={currency} mixed={mixed} />
        </div>

        <div className="max-md:order-3 xl:col-span-7">
          {scope.isError ? (
            <ErrorState title="Couldn't load your trades." error={scope.error} onRetry={() => void scope.refetch()} />
          ) : scope.isLoading ? (
            <Skeleton className="h-64" aria-busy="true" />
          ) : quiet ? (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Recent trades</h2>
              {emptyPeriod}
            </section>
          ) : (
            <RecentTrades trades={trades} accounts={accountMap} onOpen={(id) => trade.openTrade(id)} />
          )}
        </div>

        <div className="max-md:order-2 xl:col-span-5">
          {scope.isLoading ? <Skeleton className="h-64" /> : <NeedsAttention rows={attention} truncated={scope.truncated} accountId={filters.accountId} noTrades={quiet} />}
        </div>
      </div>

    </div>
  );
}
