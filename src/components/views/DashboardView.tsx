import { useMemo } from 'react';
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
import { calculateTradeStats, getEligibleTrades } from '@/lib/tradeCalculations';
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
  
  // Prepare query params
  const queryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [filters.accountId, filters.startDate, filters.endDate]);
  
  const { data: trades = [], isLoading: tradesLoading } = useGetTradesQuery(queryParams);
  
  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset);
    dispatch(setDateRangeFilter({
      startDate: range.from.toISOString().split('T')[0],
      endDate: range.to.toISOString().split('T')[0],
      datePreset: preset
    }));
  };

  const filteredTrades = useMemo(() => getEligibleTrades(trades), [trades]);

  // Calculate all stats using centralized function
  const filteredStats = useMemo(() => {
    return calculateTradeStats(filteredTrades);
  }, [filteredTrades]);

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
        <div className="flex items-center gap-4">
          <DateRangeFilter
            selectedPreset={filters.datePreset}
            onPresetChange={handleDatePresetChange}
          />
          <AccountFilter />
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
            trend={{ value: 12.5, isPositive: filteredStats.totalPnl >= 0 }}
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
