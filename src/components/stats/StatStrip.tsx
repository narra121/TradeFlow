import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MetricInfo } from './MetricInfo';
import type { MetricKey } from './metricDefs';

interface StatStripProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** One panel of figures divided by hairlines (no gaps, no tiles). Children are `StatCell`s; it is a `dl`. */
export function StatStrip({ label, children, className }: StatStripProps) {
  return (
    <dl aria-label={label} className={cn('grid overflow-hidden rounded-lg border border-border bg-border gap-px', className)}>
      {children}
    </dl>
  );
}

interface StatCellProps {
  metric: MetricKey;
  /** Overrides the label printed for the metric. */
  label?: string;
  value: React.ReactNode;
  /** Sample line, e.g. `14W · 10L · 24 trades`. */
  hint?: React.ReactNode;
  /** Text of the sample for the popover; defaults to none. */
  sample?: string;
  /** A `Delta` (kept as a node so the cell reserves its height while the comparison loads). */
  delta?: React.ReactNode;
  /** The Analytics tab that explains the figure. */
  to?: string;
  className?: string;
}

export function StatCell({ metric, label, value, hint, sample, delta, to, className }: StatCellProps) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-3', className)}>
      <dt className="truncate text-xs font-medium text-muted-foreground">
        <MetricInfo metric={metric} label={label} sample={sample} />
      </dt>
      <dd className="mt-1">
        <div className="min-h-7 truncate font-mono text-xl font-medium leading-7 tabular-nums text-foreground">
          {to ? (
            <Link to={to} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {value}
            </Link>
          ) : (
            value
          )}
        </div>
        {hint && <p className="mt-0.5 min-h-4 truncate text-xs text-muted-foreground">{hint}</p>}
        {delta}
      </dd>
    </div>
  );
}
