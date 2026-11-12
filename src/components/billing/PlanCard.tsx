import { Link } from 'react-router-dom';
import { useEntitlements } from '@/hooks/useEntitlements';
import { planRowText, toPlanFacts } from '@/components/billing/planState';
import { cn } from '@/lib/utils';

const BILLING = '/app/settings/billing';

/** Sidebar footer plan row (E-010): one line, no filled button; hidden for active Pro. */
export function PlanCard({ collapsed }: { collapsed?: boolean }) {
  const ent = useEntitlements();
  if (ent.isLoading || ent.isError) return null;
  const row = planRowText(toPlanFacts(ent));
  if (!row) return null;
  const tone = row.tone === 'error' ? 'text-error' : row.tone === 'warning' ? 'text-warning' : 'text-muted-foreground';
  if (collapsed) {
    const dot = row.tone === 'error' ? 'bg-error' : row.tone === 'warning' ? 'bg-warning' : row.tone === 'upgrade' ? 'bg-accent' : 'bg-muted-foreground';
    return (
      <Link to={BILLING} aria-label={[row.text, row.action].filter(Boolean).join('. ')} className="mx-auto flex h-8 w-8 items-center justify-center rounded hover:bg-sidebar-accent">
        <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <div className="flex h-8 items-center justify-between gap-2 px-2.5 text-xs">
      <Link to={BILLING} className={cn('min-w-0 truncate hover:underline', tone)}>
        {row.text}
      </Link>
      {row.action && (
        <Link to={BILLING} className={cn('shrink-0 font-medium hover:underline', row.tone === 'upgrade' ? 'text-accent-text' : 'text-primary')}>
          {row.action}
        </Link>
      )}
    </div>
  );
}
