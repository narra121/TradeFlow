import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TradeOutcome } from '@/types/trade';

/** `↑ Long` / `↓ Short` as text with an arrow: direction is not a result, so it carries no profit / loss colour (E-039). */
export function DirectionChip({ direction, className }: { direction: string; className?: string }) {
  const long = direction.toUpperCase() === 'LONG';
  const Icon = long ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs text-foreground-soft', className)}>
      <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
      {long ? 'Long' : 'Short'}
    </span>
  );
}

export const OUTCOME_LABEL: Record<TradeOutcome, string> = {
  TP: 'TP hit',
  PARTIAL: 'Partial',
  SL: 'SL hit',
  BREAKEVEN: 'Breakeven',
};

/** Neutral text chip: the result colour belongs to the P&L figure, not to a pill. */
export function OutcomeChip({ outcome, className }: { outcome: string; className?: string }) {
  return (
    <span className={cn('inline-flex h-5 items-center rounded-sm border border-border px-1.5 text-xs text-foreground-soft', className)}>
      {OUTCOME_LABEL[outcome as TradeOutcome] ?? outcome}
    </span>
  );
}
