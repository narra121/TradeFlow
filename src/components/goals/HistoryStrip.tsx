import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { glyphName, type Glyph, type GoalType, type PeriodRef } from '@/components/goals/goalMath';

interface Cell {
  period: PeriodRef;
  glyph: Glyph;
}

/** Eight glyph cells, oldest first: ✓ met, ✕ missed, · nothing to judge. Each cell carries its text name. */
export function HistoryStrip({ type, cells, loading, label }: { type: GoalType; cells: Cell[]; loading: boolean; label: string }) {
  if (loading && cells.every((c) => c.glyph === 'none')) return <Skeleton className="h-4 w-36" aria-label={`${label}, loading`} />;
  return (
    <ul className="flex items-center gap-0.5" aria-label={label}>
      {cells.map((c) => (
        <li
          key={c.period.key}
          title={glyphName(type, c.glyph, c.period)}
          className={cn('flex h-4 w-4 items-center justify-center text-xs', c.glyph === 'met' && 'text-profit', c.glyph === 'missed' && 'text-loss', c.glyph === 'none' && 'text-muted-foreground')}
        >
          <span className="sr-only">{glyphName(type, c.glyph, c.period)}</span>
          {c.glyph === 'met' ? <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" /> : c.glyph === 'missed' ? <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" /> : <span aria-hidden="true">·</span>}
        </li>
      ))}
    </ul>
  );
}
