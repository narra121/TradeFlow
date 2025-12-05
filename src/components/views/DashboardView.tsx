import { Trade, PortfolioStats } from '@/types/trade';
import { StatCard } from '@/components/dashboard/StatCard';
import { TradeList } from '@/components/dashboard/TradeList';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { WinRateRing } from '@/components/dashboard/WinRateRing';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { Button } from '@/components/ui/button';
import { Plus, Upload, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';

interface DashboardViewProps {
  trades: Trade[];
  stats: PortfolioStats;
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function DashboardView({ trades, stats, onAddTrade, onImportTrades }: DashboardViewProps) {
  const openTrades = trades.filter(t => t.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={stats.totalPnl.toFixed(2)}
          prefix="$"
          icon={DollarSign}
          variant={stats.totalPnl >= 0 ? 'success' : 'danger'}
          trend={{ value: 12.5, isPositive: stats.totalPnl >= 0 }}
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
          title="Open Positions"
          value={openTrades.length}
          icon={BarChart3}
          variant="accent"
          className="stagger-4"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - spans 2 columns */}
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>

        {/* Win Rate Ring */}
        <div>
          <WinRateRing 
            winRate={stats.winRate}
            wins={trades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) > 0).length}
            losses={trades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) < 0).length}
          />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades - spans 2 columns */}
        <div className="lg:col-span-2">
          <TradeList trades={trades} limit={5} />
        </div>

        {/* Quick Stats */}
        <div>
          <QuickStats stats={stats} />
        </div>
      </div>
    </div>
  );
}
