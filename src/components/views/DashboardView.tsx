import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TradeList } from '@/components/dashboard/TradeList';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { WinRateRing } from '@/components/dashboard/WinRateRing';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { AccountFilter } from '@/components/account/AccountFilter';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Plus, Upload, DollarSign, TrendingUp, Activity, BarChart3, Info, AlertTriangle } from 'lucide-react';
import { RefreshButton } from '@/components/ui/refresh-button';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { getEligibleTrades } from '@/lib/tradeCalculations';
import { useAccounts } from '@/hooks/useAccounts';
import { useGetTradesQuery, useGetStatsQuery } from '@/store/api';
import { 
  DashboardStatsSkeleton, 
  ChartSkeleton, 
  WinRateRingSkeleton, 
  RecentTradesListSkeleton, 
  QuickStatsSkeleton 
} from '@/components/ui/loading-skeleton';

interface DashboardViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function DashboardView({ onAddTrade, onImportTrades }: DashboardViewProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const filters = useAppSelector((state) => state.trades.filters);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(
    { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() }
  );
  
  // Get accounts for balance calculations
  const { selectedAccountId, accounts } = useAccounts();

  // Debounce filter changes to avoid firing multiple API calls during rapid changes
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Prepare query params using debounced filters
  const queryParams = useMemo(() => ({
    accountId: debouncedFilters.accountId,
    startDate: debouncedFilters.startDate,
    endDate: debouncedFilters.endDate,
  }), [debouncedFilters.accountId, debouncedFilters.startDate, debouncedFilters.endDate]);

  const { data: trades = [], isLoading, isFetching, refetch } = useGetTradesQuery(queryParams);

  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    dispatch(setDateRangeFilter({
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
      datePreset: preset
    }));
    if (preset === 'custom') {
      setCustomRange(range);
    }
  };

  const filteredTrades = useMemo(() => getEligibleTrades(trades), [trades]);
  const unmappedCount = trades.length - filteredTrades.length;

  // Calculate total capital based on selected accounts
  const totalCapital = useMemo(() => {
    const accountId = selectedAccountId || 'ALL';
    if (accountId === 'ALL') {
      // Sum up initial balances from all accounts (excluding accountId -1 or undefined)
      return accounts
        .filter(acc => acc.id && acc.id !== '-1')
        .reduce((sum, acc) => sum + (acc.initialBalance || 0), 0);
    } else {
      // Get balance for specific account
      const account = accounts.find(acc => acc.id === accountId);
      return account?.initialBalance || 0;
    }
  }, [selectedAccountId, accounts]);

  // Fetch aggregated stats from backend using debounced filters
  const statsQueryParams = useMemo(() => ({
    accountId: debouncedFilters.accountId,
    startDate: debouncedFilters.startDate,
    endDate: debouncedFilters.endDate,
    totalCapital,
  }), [debouncedFilters.accountId, debouncedFilters.startDate, debouncedFilters.endDate, totalCapital]);

  const { data: statsData, isLoading: statsLoading, isFetching: statsFetching } = useGetStatsQuery(statsQueryParams);

  const emptyStats = {
    totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
    avgWin: 0, avgLoss: 0, profitFactor: 0, bestTrade: 0, worstTrade: 0,
    maxDrawdown: 0, avgRiskReward: 0, consecutiveWins: 0, consecutiveLosses: 0,
    grossProfit: 0, grossLoss: 0, expectancy: 0, sharpeRatio: 0, avgHoldingTime: 0,
    totalVolume: 0, dailyPnl: [] as Array<{ date: string; pnl: number; cumulativePnl: number }>,
  };

  const stats = { ...emptyStats, ...statsData };

  const totalPnlTrend = useMemo(() => ({
    value: totalCapital > 0 ? Math.abs((stats.totalPnl / totalCapital) * 100) : 0,
    isPositive: stats.totalPnl >= 0,
  }), [stats.totalPnl, totalCapital]);
  const tradesLoading = isLoading || isFetching || statsLoading || statsFetching;

  // All trades are closed - no open trades section needed

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Your trading performance at a glance</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RefreshButton onRefresh={refetch} isFetching={isFetching} />
            <Button onClick={onImportTrades} variant="outline" size="default" className="gap-2">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button onClick={onAddTrade} size="default" className="gap-2">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Trade</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 sm:flex-wrap">
          <AccountFilter />
          <DateRangeFilter
            selectedPreset={filters.datePreset}
            onPresetChange={handleDatePresetChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            showCustomPicker
          />
        </div>
      </div>

      {/* Empty State - shown when not loading and no trades */}
      {!tradesLoading && filteredTrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 text-center">
          {unmappedCount > 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-warning/60" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {unmappedCount === 1
                  ? '1 unmapped trade'
                  : `${unmappedCount} unmapped trades`}
              </h3>
              <p className="text-muted-foreground max-w-md mb-8">
                {unmappedCount === 1
                  ? 'You have a trade that isn\'t assigned to any account. Map it to an account so it shows up in your stats.'
                  : `You have ${unmappedCount} trades that aren't assigned to any account. Map them to accounts so they show up in your stats.`}
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/app/trade-log')} size="default" className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Go to Trade Log
                </Button>
                <Button onClick={onAddTrade} variant="outline" size="default" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Trade
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <BarChart3 className="w-8 h-8 text-primary/60" />
              </div>
              {filters.datePreset === 'all' ? (
                <>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to TradeQut!</h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Start by adding your first trade to see your performance dashboard come to life.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button onClick={onAddTrade} size="default" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Your First Trade
                    </Button>
                    <Button onClick={onImportTrades} variant="outline" size="default" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import Trades
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No trades in this period</h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Try selecting a different date range or account filter to see your trades.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="default"
                      className="gap-2"
                      onClick={() => handleDatePresetChange('all')}
                    >
                      View All Time
                    </Button>
                    <Button onClick={onAddTrade} size="default" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Trade
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          {tradesLoading ? (
            <DashboardStatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Total P&L"
                value={stats.totalPnl.toFixed(2)}
                prefix="$"
                icon={DollarSign}
                variant={stats.totalPnl >= 0 ? 'success' : 'danger'}
                trend={totalPnlTrend}
                className="stagger-1"
              />
              <StatCard
                title="Win Rate"
                value={stats.winRate.toFixed(1)}
                suffix="%"
                icon={TrendingUp}
                variant="success"
                className="stagger-2"
              />
              <StatCard
                title="Total Trades"
                value={stats.totalTrades}
                icon={Activity}
                variant="default"
                className="stagger-3"
              />
              <StatCard
                title="Profit Factor"
                value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                icon={BarChart3}
                variant="accent"
                className="stagger-4"
              />
            </div>
          )}

          {/* Unmapped Trades Banner */}
          {!tradesLoading && unmappedCount > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-warning/8 border-l-2 border-warning animate-fade-in">
              <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  {unmappedCount === 1
                    ? '1 trade is not mapped to any account and is excluded from stats.'
                    : `${unmappedCount} trades are not mapped to any account and are excluded from stats.`}
                </p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          {tradesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <ChartSkeleton height="h-[280px]" />
              </div>
              <WinRateRingSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Chart - spans 2 columns */}
              <div className="lg:col-span-2 min-w-0">
                <PerformanceChart dailyPnl={stats?.dailyPnl} />
              </div>

              {/* Win Rate Ring */}
              <div>
                <WinRateRing
                  winRate={stats.winRate}
                  wins={stats.wins}
                  losses={stats.losses}
                />
              </div>
            </div>
          )}

          {/* Bottom Grid */}
          {tradesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <RecentTradesListSkeleton />
              </div>
              <QuickStatsSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Recent Trades - spans 2 columns */}
              <div className="lg:col-span-2 min-w-0">
                <TradeList trades={filteredTrades} limit={5} />
              </div>

              {/* Quick Stats */}
              <div>
                <QuickStats stats={stats} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
