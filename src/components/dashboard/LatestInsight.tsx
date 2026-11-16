import { Link } from 'react-router-dom';
import { useListInsightsQuery } from '@/store/api/insightsApi';

/** One line: the headline of the newest AI insight, or a prompt to generate one. Nothing is drawn while loading or on error. */
export function LatestInsight({ accountId }: { accountId?: string }) {
  const { data, isLoading, isError } = useListInsightsQuery({ limit: 1, accountId: accountId && accountId !== 'ALL' ? accountId : undefined });
  if (isLoading || isError) return null;
  const latest = data?.insights?.[0];
  return (
    <Link to="/app/insights" className="flex min-h-9 [@media(pointer:coarse)]:min-h-11 items-center justify-between gap-2 rounded-sm text-[13px] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {latest ? (
        <span className="line-clamp-2 min-w-0" title={latest.summary}>
          <span className="text-muted-foreground">Latest insight · </span>
          {latest.summary}
        </span>
      ) : (
        <span>Generate an insight</span>
      )}
      <span className="flex shrink-0 items-center gap-2">
        <span className="rounded-sm bg-accent/15 px-1 text-[11px] font-medium text-accent-text">AI</span>
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
