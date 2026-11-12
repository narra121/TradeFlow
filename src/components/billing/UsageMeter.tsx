import { cn } from '@/lib/utils';
import { QUOTA_LABEL, type UsageRow } from '@/hooks/useEntitlements';
import { formatDay } from '@/components/billing/planState';

interface UsageMeterProps {
  row: UsageRow;
  resetsAt?: string;
  className?: string;
}

/** Label, `{used} of {limit}` and a 120 × 4 px bar: neutral below 80 %, amber from 80 %, red at the limit. Unlimited shows the count and the word, no bar. */
export function UsageMeter({ row, resetsAt, className }: UsageMeterProps) {
  const unlimited = row.limit === null;
  const atLimit = row.ratio !== null && row.ratio >= 1;
  const tone = atLimit ? 'bg-loss' : row.ratio !== null && row.ratio >= 0.8 ? 'bg-warning' : 'bg-muted-foreground';
  const label = QUOTA_LABEL[row.feature];
  const reset = resetsAt ? formatDay(resetsAt, false) : '';
  const valueText = unlimited ? `${row.used} used, unlimited` : `${row.used} of ${row.limit}`;
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-3 text-13">
        <span>{label}</span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{unlimited ? `${row.used} · unlimited` : valueText}</span>
          {!unlimited && (
            <span
              role="progressbar"
              aria-label={`${label} used`}
              aria-valuemin={0}
              aria-valuemax={row.limit ?? 0}
              aria-valuenow={Math.min(row.used, row.limit ?? 0)}
              aria-valuetext={`${valueText} ${label.toLowerCase()} this month`}
              className="block h-1 w-[120px] shrink-0 overflow-hidden rounded-full bg-muted max-sm:w-20"
            >
              <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.round((row.ratio ?? 0) * 100)}%` }} />
            </span>
          )}
        </span>
      </div>
      {atLimit && <p className="text-xs text-loss">Limit reached{reset ? ` — resets ${reset}` : ''}</p>}
    </div>
  );
}
