import * as React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padded?: boolean;
}

export const Panel = React.forwardRef<HTMLElement, PanelProps>(
  ({ title, description, actions, padded = true, className, children, ...rest }, ref) => (
    <section ref={ref} className={cn('rounded-lg border border-border bg-card', className)} {...rest}>
      {(title || actions) && (
        <div className={cn('flex items-start justify-between gap-3 px-4', padded ? 'pt-4' : 'border-b border-border py-3')}>
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && 'p-4', padded && (title || actions) && 'pt-3')}>{children}</div>
    </section>
  ),
);
Panel.displayName = 'Panel';
