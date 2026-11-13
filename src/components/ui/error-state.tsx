import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { readApiError } from '@/lib/apiError';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** The failed request's error: the API's own message (or the connection message) is shown instead of `description`. */
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Could not load this', description, error, onRetry, className }: ErrorStateProps) {
  const shown = error ? readApiError(error, description ?? '').message || description : description;
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4', className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {shown && <p className="mt-0.5 text-sm text-muted-foreground">{shown}</p>}
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
