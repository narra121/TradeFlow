import { PortfolioStats } from '@/types/trade';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, BarChart3, Flame, Snowflake } from 'lucide-react';

interface QuickStatsProps {
  stats: PortfolioStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const formatSignedCurrency0 = (amount: number) => {
    const abs = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${abs.toFixed(0)}`;
  };

  const items = [
    {
      label: 'Profit Factor',
      value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
      icon: Target,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Avg R:R',
      value: stats.avgRiskReward.toFixed(2),
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Best Trade',
      value: formatSignedCurrency0(stats.bestTrade),
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Worst Trade',
      value: formatSignedCurrency0(stats.worstTrade),
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Win Streak',
      value: stats.consecutiveWins.toString(),
      icon: Flame,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Max Drawdown',
      value: `${stats.maxDrawdown.toFixed(2)}%`,
      icon: Snowflake,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
  ];

  return (
    <div className="glass-card p-5 animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.bgColor)}>
                <Icon className={cn("w-4 h-4", item.color)} />
              </div>
              <div>
                <p className={cn("font-semibold font-mono text-sm", item.color)}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
