import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

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
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  prefix = '', 
  suffix = '',
  variant = 'default',
  className 
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
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
          styles.iconBg
        )}>
          <Icon className={cn("w-5 h-5", styles.iconColor)} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            trend.isPositive 
              ? "bg-success/10 text-success" 
              : "bg-destructive/10 text-destructive"
          )}>
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className="text-2xl font-semibold text-foreground font-mono tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
    </div>
  );
}
