import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TradeList } from '@/components/dashboard/TradeList';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { WinRateRing } from '@/components/dashboard/WinRateRing';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { AccountFilter } from '@/components/account/AccountFilter';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Plus, Upload, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { calculateTradeStats, getEligibleTrades } from '@/lib/tradeCalculations';
import { useAccounts } from '@/hooks/useAccounts';
import { useGetTradesQuery } from '@/store/api';
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
  const filters = useAppSelector((state) => state.trades.filters);
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>(
    { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() }
  );
  
  // Get accounts for balance calculations
  const { selectedAccountId, accounts } = useAccounts();
  
  // Prepare query params
  const queryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [filters.accountId, filters.startDate, filters.endDate]);
  
  const { data: trades = [], isLoading, isFetching } = useGetTradesQuery(queryParams);
  const tradesLoading = isLoading || isFetching;
  
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

  // Calculate all stats using centralized function
  const filteredStats = useMemo(() => {
    return calculateTradeStats(filteredTrades, totalCapital);
  }, [filteredTrades, totalCapital]);

  // All trades are closed - no open trades section needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your trading performance</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onImportTrades} variant="outline" size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Import
            </Button>
            <Button onClick={onAddTrade} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Trade
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
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

      {/* Stats Grid */}
      {tradesLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total P&L"
            value={filteredStats.totalPnl.toFixed(2)}
            prefix="$"
            icon={DollarSign}
            variant={filteredStats.totalPnl >= 0 ? 'success' : 'danger'}
            trend={{ 
              value: totalCapital > 0 ? Math.abs((filteredStats.totalPnl / totalCapital) * 100) : 0, 
              isPositive: filteredStats.totalPnl >= 0 
            }}
            className="stagger-1"
          />
          <StatCard
            title="Win Rate"
            value={filteredStats.winRate.toFixed(1)}
            suffix="%"
            icon={TrendingUp}
            variant="success"
            className="stagger-2"
          />
          <StatCard
            title="Total Trades"
            value={filteredStats.totalTrades}
            icon={Activity}
            variant="default"
            className="stagger-3"
          />
          <StatCard
            title="Profit Factor"
            value={filteredStats.profitFactor === Infinity ? '∞' : filteredStats.profitFactor.toFixed(2)}
            icon={BarChart3}
            variant="accent"
            className="stagger-4"
          />
        </div>
      )}

      {/* Main Content Grid */}
      {tradesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton height="h-[280px]" />
          </div>
          <WinRateRingSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - spans 2 columns */}
          <div className="lg:col-span-2">
            <PerformanceChart trades={filteredTrades} />
          </div>

          {/* Win Rate Ring */}
          <div>
            <WinRateRing 
              winRate={filteredStats.winRate}
              wins={filteredStats.wins}
              losses={filteredStats.losses}
            />
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      {tradesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTradesListSkeleton />
          </div>
          <QuickStatsSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trades - spans 2 columns */}
          <div className="lg:col-span-2">
            <TradeList trades={filteredTrades} limit={5} />
          </div>

          {/* Quick Stats */}
          <div>
            <QuickStats stats={filteredStats} />
          </div>
        </div>
      )}
    </div>
  );
}
