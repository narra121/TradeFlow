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
        className="inline-flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11"
      >
        {/* The 36x20 track is the look; on touch the button around it is the 44 px target (DESIGN-SHARED S10). */}
        <span aria-hidden="true" className={cn('relative h-5 w-9 rounded-full border border-border-strong transition-colors', on ? 'bg-primary' : 'bg-input')}>
          <span className={cn('absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform', on && 'translate-x-4')} />
        </span>
      </button>
    </div>
  );
}
