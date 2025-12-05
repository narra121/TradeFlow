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
  Cell
} from 'recharts';

interface AnalyticsViewProps {
  trades: Trade[];
  stats: PortfolioStats;
}

export function AnalyticsView({ trades, stats }: AnalyticsViewProps) {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  
  // Symbol distribution
  const symbolDistribution = closedTrades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(symbolDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(265, 89%, 62%)', 'hsl(45, 93%, 47%)', 'hsl(200, 95%, 50%)', 'hsl(0, 72%, 51%)'];

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
    { label: 'Total P&L', value: `$${stats.totalPnl.toFixed(2)}`, isPositive: stats.totalPnl >= 0 },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, isPositive: stats.winRate >= 50 },
    { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), isPositive: stats.profitFactor >= 1 },
    { label: 'Average Win', value: `$${stats.avgWin.toFixed(2)}`, isPositive: true },
    { label: 'Average Loss', value: `$${stats.avgLoss.toFixed(2)}`, isPositive: false },
    { label: 'Max Drawdown', value: `${stats.maxDrawdown}%`, isPositive: false },
    { label: 'Best Trade', value: `$${stats.bestTrade.toFixed(2)}`, isPositive: true },
    { label: 'Worst Trade', value: `$${stats.worstTrade.toFixed(2)}`, isPositive: false },
    { label: 'Avg R:R', value: stats.avgRiskReward.toFixed(2), isPositive: stats.avgRiskReward >= 1.5 },
    { label: 'Total Trades', value: stats.totalTrades.toString(), isPositive: true },
    { label: 'Win Streak', value: stats.consecutiveWins.toString(), isPositive: true },
    { label: 'Loss Streak', value: stats.consecutiveLosses.toString(), isPositive: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your trading performance</p>
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

      {/* Second Charts Row */}
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

        {/* Trade Distribution by Time */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-6">Performance by Session</h3>
          <div className="grid grid-cols-3 gap-4">
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
