import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'danger' | 'accent';
  className?: string;
  /** Show directional arrow next to the value (for P&L displays) */
  showArrow?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  prefix = '',
  suffix = '',
  variant = 'default',
  className,
  showArrow,
}: StatCardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-secondary',
      iconColor: 'text-foreground',
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    danger: {
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    accent: {
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "stat-card group animate-fade-in",
      className
    )}>
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div className={cn(
          "w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0",
          styles.iconBg
        )}>
          <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", styles.iconColor)} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full",
            trend.isPositive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          )}>
            <span>{trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-xs sm:text-sm mb-0.5 sm:mb-1 truncate">{title}</p>
      <p className="text-lg sm:text-2xl font-semibold text-foreground font-mono tracking-tight truncate flex items-center gap-1">
        {showArrow && (
          variant === 'success'
            ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
            : variant === 'danger'
            ? <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-destructive shrink-0" />
            : null
        )}
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
    </div>
  );
}
