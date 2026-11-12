import { cn } from '@/lib/utils';
import { useCompare } from './useCompare';

/** `Compare: previous period [on]` for the scope bar. Hidden by the caller for All time. */
export function CompareSwitch({ className }: { className?: string }) {
  const [on, setOn] = useCompare();
  return (
    <div className={cn('flex shrink-0 items-center gap-2 text-xs text-muted-foreground', className)}>
      <span id="compare-label">Compare: previous period</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="compare-label"
        onClick={() => setOn(!on)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          on ? 'bg-primary' : 'bg-input',
        )}
      >
        <span aria-hidden="true" className={cn('absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform', on && 'translate-x-4')} />
      </button>
    </div>
  );
}
