import { Check, Minus, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useGetTradeDebriefQuery } from '@/store/api';
import { cn } from '@/lib/utils';
import type { DebriefCheck } from '@/types/trade';

const STATE = {
  met: { text: 'Met', Icon: Check, tone: 'text-profit' },
  notMet: { text: 'Not met', Icon: X, tone: 'text-loss' },
  notApplicable: { text: 'Does not apply', Icon: Minus, tone: 'text-muted-foreground' },
} as const;

const metLine = (metCount: number, total: number) => `${metCount} of ${total} ${total === 1 ? 'check' : 'checks'} met`;

function CheckRow({ check }: { check: DebriefCheck }) {
  const { text, Icon, tone } = STATE[check.state];
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <div className="min-w-0">
        <p className={cn('text-sm', check.state === 'notApplicable' && 'text-muted-foreground')}>
          <span className="sr-only">{text}: </span>
          {check.label}
        </p>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
      </div>
    </li>
  );
}

/** The trade's debrief checks; every figure in them is computed by the server's code. */
export function TradeDebrief({ tradeId }: { tradeId: string }) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetTradeDebriefQuery(tradeId);

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-2" aria-busy="true" aria-label="Loading the debrief">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  } else if (isError || !data) {
    body = <ErrorState title="Could not load the debrief" error={error} onRetry={() => void refetch()} />;
  } else {
    const applied = data.checks.filter((c) => c.state !== 'notApplicable');
    const skipped = data.checks.filter((c) => c.state === 'notApplicable');
    body = (
      <div className="space-y-3" aria-busy={isFetching || undefined}>
        {data.total > 0 ? (
          <p className="text-sm font-medium tabular-nums">{metLine(data.metCount, data.total)}</p>
        ) : (
          <p className="text-sm text-muted-foreground">None of the checks apply to this trade yet. The reasons are below.</p>
        )}
        {applied.length > 0 && <ul className="space-y-2">{applied.map((c) => <CheckRow key={c.id} check={c} />)}</ul>}
        {skipped.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Not counted</p>
            <ul className="space-y-2">{skipped.map((c) => <CheckRow key={c.id} check={c} />)}</ul>
          </div>
        )}
        {(data.sentences ?? []).length > 0 && (
          <div className="space-y-1 rounded-md border border-border bg-muted/40 p-2 text-sm">
            {data.sentences!.map((s, i) => <p key={i}>{s}</p>)}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          A count you can check, not a score. Each check compares this trade with your own trades in the same account over the 90 days up to it.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="debrief-h" className="space-y-2">
      <h3 id="debrief-h" className="text-xs font-medium text-muted-foreground">
        Debrief
      </h3>
      {body}
    </section>
  );
}
