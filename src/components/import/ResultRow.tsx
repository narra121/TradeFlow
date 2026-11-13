import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaveImportedResult } from '@/types/import';
import { formatCount } from '@/lib/format';

interface ResultRowProps {
  result: SaveImportedResult;
  accountName: string;
  busy: boolean;
  error: string | null;
  onView: () => void;
  onAnother: () => void;
  onUndo: () => void;
  onRetry: () => void;
}

const count = (v: number, one: string) => `${formatCount(v)} ${v === 1 ? one : `${one}s`}`;

/** Replaces the footer after a save; the grid stays above it. */
export function ResultRow({ result, accountName, busy, error, onView, onAnother, onUndo, onRetry }: ResultRowProps) {
  const failed = result.failed > 0;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-1 py-3">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        {failed ? <X className="h-4 w-4 shrink-0 text-loss" aria-hidden="true" /> : <Check className="h-4 w-4 shrink-0 text-profit" aria-hidden="true" />}
        <span>
          {failed ? (
            <>
              {formatCount(result.created)} imported · {formatCount(result.failed)} failed to send
            </>
          ) : (
            <>
              {count(result.created, 'trade')} imported into {accountName} · 0 failed
              {result.skipped > 0 && <span className="text-muted-foreground"> · {formatCount(result.skipped)} already existed and were skipped</span>}
              {result.errors > 0 && <span className="text-loss"> · {formatCount(result.errors)} rejected by the server</span>}
            </>
          )}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {failed && <Button type="button" onClick={onRetry} disabled={busy}>Retry {formatCount(result.failed)} failed</Button>}
        {result.created > 0 && (
          <Button type="button" variant={failed ? 'outline' : 'default'} onClick={onView} disabled={busy}>
            View imported trades
          </Button>
        )}
        {!failed && <Button type="button" variant="outline" onClick={onAnother} disabled={busy}>Import another</Button>}
        {result.createdIds.length > 0 && <Button type="button" variant="ghost" onClick={onUndo} disabled={busy}>Undo import</Button>}
      </div>
      {error && <p role="alert" className="basis-full text-xs text-loss">{error}</p>}
    </div>
  );
}
