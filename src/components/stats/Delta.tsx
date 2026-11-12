import { cn } from '@/lib/utils';
import { describeDelta, type DeltaInput } from './deltaText';

/** Change line under a figure: neutral colour, arrow + amount + what it is compared with; spoken in words. */
export function Delta({ className, ...input }: DeltaInput & { className?: string }) {
  const d = describeDelta(input);
  if (!d) return null;
  return (
    <span className={cn('block text-xs text-muted-foreground', className)}>
      <span aria-hidden="true">{d.text}</span>
      <span className="sr-only">{d.spoken}</span>
    </span>
  );
}
