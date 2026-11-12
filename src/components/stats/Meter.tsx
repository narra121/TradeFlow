import { cn } from '@/lib/utils';

interface MeterProps {
  value: number;
  max: number;
  label: string;
  /** Limit meters turn red once exceeded; target meters stay neutral. */
  limit?: boolean;
  className?: string;
}

/** 80 × 4 px track with a tick at 80 % of the maximum; the figure next to it carries the numbers. */
export function Meter({ value, max, label, limit = false, className }: MeterProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const over = limit && max > 0 && value > max;
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn('relative inline-block h-1 w-20 shrink-0 overflow-hidden rounded-full bg-muted', className)}
    >
      <span className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-loss' : limit && ratio >= 0.8 ? 'bg-warning' : 'bg-foreground-soft')} style={{ width: `${ratio * 100}%` }} />
      <span aria-hidden="true" className="absolute inset-y-0 left-[80%] w-px bg-border-strong" />
    </span>
  );
}
