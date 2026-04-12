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
      value: stats.profitFactor == null || stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
      icon: Target,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Avg R:R',
      value: (stats.avgRiskReward ?? 0).toFixed(2),
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
      value: `${(stats.maxDrawdown ?? 0).toFixed(2)}%`,
      icon: Snowflake,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
  ];

  return (
    <div className="glass-card p-3 sm:p-5 animate-fade-in">
      <h3 className="font-semibold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Quick Stats</h3>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={cn("w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0", item.bgColor)}>
                <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", item.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn("font-semibold font-mono text-xs sm:text-sm truncate", item.color)}>{item.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
