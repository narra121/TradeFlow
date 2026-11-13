import { cn } from '@/lib/utils';
import type { RowStatus, RowSummary } from '@/lib/import/rows';
import { STATUS_LABEL } from '@/lib/import/labels';
import { formatCount } from '@/lib/format';

export type ChipFilter = 'all' | RowStatus;

interface StatusChipsProps {
  value: ChipFilter;
  onChange: (v: ChipFilter) => void;
  summary: RowSummary;
}

const ORDER: ChipFilter[] = ['all', 'ready', 'fix', 'duplicate', 'excluded', 'saved'];

/** The status filters are a radio group with counts in the names; empty ones are not drawn (except All). */
export function StatusChips({ value, onChange, summary }: StatusChipsProps) {
  const chips = ORDER.filter((k) => k === 'all' || summary[k] > 0 || value === k);
  const move = (from: number, delta: number) => {
    const next = chips[(from + delta + chips.length) % chips.length];
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`chip-${next}`)?.focus());
  };
  return (
    <div role="radiogroup" aria-label="Show rows" className="flex flex-wrap items-center gap-1.5">
      {chips.map((k, i) => {
        const count = k === 'all' ? summary.all : summary[k];
        const label = k === 'all' ? 'All' : STATUS_LABEL[k];
        const on = value === k;
        return (
          <button
            key={k}
            id={`chip-${k}`}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${label}, ${count} ${count === 1 ? 'row' : 'rows'}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              'h-7 rounded-sm border px-2 text-xs',
              on ? 'border-primary bg-muted text-foreground' : 'border-border text-foreground-soft hover:bg-muted',
              k === 'fix' && count > 0 && !on && 'text-loss',
            )}
          >
            {label} <span className="font-mono tabular-nums">{formatCount(count)}</span>
          </button>
        );
      })}
    </div>
  );
}
