import { cn } from '@/lib/utils';
import { evidenceOf, type Verdict } from '@/lib/evidence';

/** The evidence of a judged row: colour only for an edge or a leak, so a small sample never looks like a finding. */
export function EvidenceText({ verdict, trades, className, inline }: { verdict: Verdict; trades: number; className?: string; inline?: boolean }) {
  const e = evidenceOf(verdict, trades);
  const tone = e.tone === 'edge' ? 'text-profit' : e.tone === 'leak' ? 'text-loss' : 'text-foreground-soft';
  if (inline) return <span className={cn('whitespace-nowrap', tone, className)}>{e.text}</span>;
  return (
    <span className={cn('block leading-4', className)}>
      <span className={cn('block whitespace-nowrap text-[13px]', tone, e.tone !== 'neutral' && 'font-medium')}>{e.text}</span>
      <span className="block whitespace-nowrap text-[11px] text-muted-foreground">{e.detail}</span>
    </span>
  );
}
