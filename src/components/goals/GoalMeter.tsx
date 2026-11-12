import { cn } from '@/lib/utils';
import type { StatusTone } from '@/components/goals/goalMath';

interface GoalMeterProps {
  label: string;
  /** Spoken value, e.g. `$380.00 of $500.00, on pace`. */
  valueText: string;
  fill: number;
  tone: StatusTone;
  /** Targets: where the period is today. */
  pace?: number;
  /** Limits: where the warning zone starts. */
  tick?: number;
  className?: string;
}

const FILL: Record<StatusTone, string> = {
  good: 'bg-primary',
  warn: 'bg-warning',
  bad: 'bg-loss',
  neutral: 'bg-foreground-soft',
};

/** 6 px bullet bar: fill toward the target, a 2 px pace marker or an 80 % limit tick. Status is never colour alone. */
export function GoalMeter({ label, valueText, fill, tone, pace, tick, className }: GoalMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, fill)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText}
      className={cn('relative h-1.5 w-full max-w-[240px] rounded-full bg-secondary', className)}
    >
      <div className={cn('h-full rounded-full', FILL[tone])} style={{ width: `${pct}%` }} />
      {pace !== undefined && <span aria-hidden="true" className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground" style={{ left: `calc(${Math.round(pace * 100)}% - 1px)` }} />}
      {tick !== undefined && <span aria-hidden="true" className="absolute -top-0.5 h-2.5 w-px bg-foreground-soft" style={{ left: `${Math.round(tick * 100)}%` }} />}
    </div>
  );
}
