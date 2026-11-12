import { cn } from '@/lib/utils';

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

const TONE = { positive: 'text-profit', negative: 'text-loss', neutral: 'text-foreground' } as const;

/** Render inside a <dl>. */
export function Stat({ label, value, hint, tone = 'neutral', className }: StatProps) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-border bg-card px-4 py-3', className)}>
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 truncate font-mono text-[22px] font-medium leading-7 tabular-nums', TONE[tone])}>{value}</dd>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
