import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { attentionLink, type Attention } from '@/lib/dashboard';
import { LatestInsight } from './LatestInsight';

interface NeedsAttentionProps {
  rows: Attention[];
  /** The tallies come from the loaded scope, which stops at the 5,000-trade ceiling. */
  truncated: boolean;
  accountId?: string;
  /** The period has no trades: there is nothing to complete yet. */
  noTrades?: boolean;
  /** The trades failed to load: the tallies are unknown, never "Journal is complete". */
  failed?: boolean;
}

/** Housekeeping tallies that drive a complete journal; each row opens Trades with that filter. */
export function NeedsAttention({ rows, truncated, accountId, noTrades = false, failed = false }: NeedsAttentionProps) {
  return (
    <Panel title="Needs attention" description={truncated ? 'From the newest 5,000 trades' : undefined} padded={false}>
      <ul className="px-4 pb-1 pt-2">
        {rows.length === 0 && <li className="flex min-h-9 items-center text-[13px] text-muted-foreground">{failed ? '—' : noTrades ? 'No trades in this period.' : 'Journal is complete for this period.'}</li>}
        {rows.map((a) => (
          <li key={a.key} className="border-b border-border/60 last:border-0">
            <Link to={attentionLink(a.key)} className="flex min-h-9 [@media(pointer:coarse)]:min-h-11 items-center justify-between gap-2 rounded-sm text-[13px] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span><span className="font-mono tabular-nums">{a.count}</span> {a.label.replace(/^\d+ /, '')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-4 py-1">
        <LatestInsight accountId={accountId} />
      </div>
    </Panel>
  );
}
