import { useState, useMemo, useEffect } from 'react';
import { Trade, PortfolioStats } from '@/types/trade';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { Clock, Timer } from 'lucide-react';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { subDays, isWithinInterval } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTrades } from '@/store/slices/tradesSlice';
import { 
  fetchHourlyStats, 
  fetchDailyWinRate, 
  fetchSymbolDistribution, 
  fetchStrategyDistribution 
} from '@/store/slices/analyticsSlice';

export function AnalyticsView() {
  const dispatch = useAppDispatch();
  const { trades = [], loading: tradesLoading } = useAppSelector((state) => state.trades);
  const { selectedAccountId } = useAppSelector((state) => state.accounts);
  
  useEffect(() => {
    dispatch(fetchTrades({ accountId: selectedAccountId }));
  }, [dispatch, selectedAccountId]);
  
  const [datePreset, setDatePreset] = useState<DatePreset>(30);
  const [customRange, setCustomRange] = useState({ from: subDays(new Date(), 30), to: new Date() });

  const filteredTrades = useMemo(() => {
    const range = getDateRangeFromPreset(datePreset, customRange);
    return trades.filter(trade => {
      const tradeDate = trade.exitDate || trade.entryDate;
      return isWithinInterval(tradeDate, { start: range.from, end: range.to });
    });
  }, [trades, datePreset, customRange]);

  const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
  
  // Symbol distribution (computed locally from filtered trades)
  const localSymbolDistribution = closedTrades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(localSymbolDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Strategy distribution (computed locally from filtered trades)
  const localStrategyDistribution = closedTrades.reduce((acc, trade) => {
    const strategy = trade.strategy || 'Unknown';
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const strategyPieData = Object.entries(localStrategyDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(265, 89%, 62%)', 'hsl(45, 93%, 47%)', 'hsl(200, 95%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(320, 70%, 50%)'];

  // Hourly win rate calculation (all 24 hours) - computed locally from filtered trades
  const localHourlyStats = Array.from({ length: 24 }, (_, hour) => {
    const tradesInHour = closedTrades.filter(t => {
      const entryHour = t.entryDate.getHours();
      return entryHour === hour;
    });
    const wins = tradesInHour.filter(t => (t.pnl || 0) > 0).length;
    const total = tradesInHour.length;
    return {
      hour: `${hour.toString().padStart(2, '0')}`,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      trades: total,
    };
  });

  // Daily win rate calculation (by day of week) - computed locally from filtered trades
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const localDailyWinRate = dayNames.map((day, index) => {
    const tradesOnDay = closedTrades.filter(t => t.entryDate.getDay() === index);
    const wins = tradesOnDay.filter(t => (t.pnl || 0) > 0).length;
    const total = tradesOnDay.length;
    return {
      day,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      trades: total,
    };
  });

  // Trade duration calculation (time to hit TP or SL)
  const tradeDurations = closedTrades.map(trade => {
    if (!trade.exitDate) return null;
    const durationMs = trade.exitDate.getTime() - trade.entryDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return {
      symbol: trade.symbol,
      duration: durationHours,
      pnl: trade.pnl || 0,
      isWin: (trade.pnl || 0) > 0,
    };
  }).filter(Boolean) as { symbol: string; duration: number; pnl: number; isWin: boolean }[];

  // Group durations for bar chart
  const durationRanges = [
    { range: '< 1h', min: 0, max: 1 },
    { range: '1-4h', min: 1, max: 4 },
    { range: '4-8h', min: 4, max: 8 },
    { range: '8-24h', min: 8, max: 24 },
    { range: '> 24h', min: 24, max: Infinity },
  ];

  const durationData = durationRanges.map(({ range, min, max }) => {
    const tradesInRange = tradeDurations.filter(t => t.duration >= min && t.duration < max);
    const wins = tradesInRange.filter(t => t.isWin).length;
    const losses = tradesInRange.length - wins;
    return {
      range,
      wins,
      losses,
      total: tradesInRange.length,
    };
  }).filter(d => d.total > 0);

  // Max/Min/Avg duration stats
  const maxDuration = Math.max(...tradeDurations.map(t => t.duration));
  const minDuration = Math.min(...tradeDurations.map(t => t.duration));
  const avgDuration = tradeDurations.reduce((sum, t) => sum + t.duration, 0) / tradeDurations.length;

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  // Calculate stats locally from filtered trades
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0;
  const avgRiskReward = losingTrades.length > 0 && avgLoss > 0 ? avgWin / avgLoss : 0;
  
  // Calculate consecutive wins/losses
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  closedTrades.forEach(trade => {
    if ((trade.pnl || 0) > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
    } else if ((trade.pnl || 0) < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
    }
  });
  
  // Calculate max drawdown (simplified)
  let maxDrawdown = 0;
  let peak = 0;
  let runningPnl = 0;
  closedTrades.forEach(trade => {
    runningPnl += (trade.pnl || 0);
    if (runningPnl > peak) peak = runningPnl;
    const drawdown = peak > 0 ? ((peak - runningPnl) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Daily P&L for bar chart
  const dailyPnL = [
    { day: 'Mon', pnl: 450 },
    { day: 'Tue', pnl: -120 },
    { day: 'Wed', pnl: 380 },
    { day: 'Thu', pnl: 700 },
    { day: 'Fri', pnl: 280 },
  ];

  // Performance metrics
  const metrics = [
    { label: 'Total P&L', value: `$${totalPnl.toFixed(2)}`, isPositive: totalPnl >= 0 },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, isPositive: winRate >= 50 },
    { label: 'Profit Factor', value: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), isPositive: profitFactor >= 1 },
    { label: 'Average Win', value: `$${avgWin.toFixed(2)}`, isPositive: true },
    { label: 'Average Loss', value: `$${avgLoss.toFixed(2)}`, isPositive: false },
    { label: 'Max Drawdown', value: `${maxDrawdown.toFixed(1)}%`, isPositive: false },
    { label: 'Best Trade', value: `$${bestTrade.toFixed(2)}`, isPositive: true },
    { label: 'Worst Trade', value: `$${worstTrade.toFixed(2)}`, isPositive: false },
    { label: 'Avg R:R', value: avgRiskReward.toFixed(2), isPositive: avgRiskReward >= 1.5 },
    { label: 'Total Trades', value: closedTrades.length.toString(), isPositive: true },
    { label: 'Win Streak', value: consecutiveWins.toString(), isPositive: true },
    { label: 'Loss Streak', value: consecutiveLosses.toString(), isPositive: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your trading performance</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter
            selectedPreset={datePreset}
            onPresetChange={setDatePreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            showCustomPicker
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <div 
            key={metric.label}
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className={cn(
              "text-xl font-semibold font-mono mt-1",
              metric.isPositive ? "text-success" : "text-destructive"
            )}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <PerformanceChart />

        {/* Daily P&L Bar Chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Daily P&L</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value}`, 'P&L']}
                />
                <Bar 
                  dataKey="pnl" 
                  radius={[4, 4, 0, 0]}
                  fill="hsl(160, 84%, 39%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Win Rate & Trade Duration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Win Rate */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Hourly Win Rate</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localHourlyStats} margin={{ top: 10, right: 5, left: 0, bottom: 0 }} barCategoryGap="8%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 9 }}
                  interval={0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'winRate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${label}:00`}
                />
                <Bar 
                  dataKey="winRate" 
                  radius={[2, 2, 0, 0]}
                  fill="hsl(var(--primary))"
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Win Rate - Horizontal Bar */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Daily Win Rate</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={localDailyWinRate} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" horizontal={false} />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <YAxis 
                  type="category"
                  dataKey="day"
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="winRate" 
                  radius={[0, 4, 4, 0]}
                  fill="hsl(var(--accent))"
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Duration Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <Timer className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Trade Duration (Time to TP/SL)</h3>
          </div>
          
          {/* Duration Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Fastest</p>
              <p className="font-mono font-semibold text-success">{formatDuration(minDuration)}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-mono font-semibold text-foreground">{formatDuration(avgDuration)}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Longest</p>
              <p className="font-mono font-semibold text-warning">{formatDuration(maxDuration)}</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="wins" stackId="a" fill="hsl(160, 84%, 39%)" radius={[0, 0, 0, 0]} name="Wins" />
                <Bar dataKey="losses" stackId="a" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Losses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Symbol Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Symbol Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Strategy Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={strategyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {strategyPieData.map((_, index) => (
                    <Cell key={`cell-strat-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 16%, 18%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {strategyPieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Distribution by Time */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground mb-6">Performance by Session</h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { name: 'Asian', trades: 8, winRate: 62.5, pnl: 420 },
              { name: 'London', trades: 15, winRate: 73.3, pnl: 1250 },
              { name: 'New York', trades: 12, winRate: 58.3, pnl: 780 },
            ].map((session, index) => (
              <div 
                key={session.name}
                className="p-4 bg-secondary/30 rounded-xl animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h4 className="font-medium text-foreground mb-3">{session.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-mono text-foreground">{session.trades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-mono text-success">{session.winRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">P&L</span>
                    <span className="font-mono text-success">+${session.pnl}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}