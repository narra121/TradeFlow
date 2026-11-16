import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { METRICS, type MetricKey } from './metricDefs';

interface MetricInfoProps {
  metric: MetricKey;
  /** Overrides the label printed on the trigger (`Avg R` becomes `Planned R:R` while R is not available). */
  label?: string;
  /** Sample behind the figure, e.g. `24 trades`; printed in the popover. */
  sample?: string;
  className?: string;
}

/**
 * A statistic's label as a button: it opens a popover with the definition, the formula, the sample and the glossary link.
 * Render it inside `dt` (or a table header).
 */
export function MetricInfo({ metric, label, sample, className }: MetricInfoProps) {
  const def = METRICS[metric];
  const text = label ?? def.label;
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          'inline-flex max-w-full items-center truncate rounded-sm text-left underline [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 decoration-dotted decoration-border-strong underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-haspopup="dialog"
      >
        {text}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 text-sm" aria-label={`About ${text}`}>
        <p className="font-semibold text-foreground">{text}</p>
        <p className="text-foreground-soft">{def.definition}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground-soft">Formula</span>
          <br />
          {def.formula}
        </p>
        {sample && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground-soft">Sample</span>
            <br />
            {sample}
          </p>
        )}
        {def.glossary && (
          <Link to={`/glossary#${def.glossary}`} className="inline-block text-xs text-primary hover:underline">
            Read more in the glossary
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
