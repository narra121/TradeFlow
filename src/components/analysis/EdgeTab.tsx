import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScopeBarSlot } from '@/components/shell/chrome';
import { LockedPreview } from '@/components/billing/ProGate';
import { useEntitlements } from '@/hooks/useEntitlements';
import { BreakdownExplorer } from '@/components/stats/BreakdownExplorer';
import { availableDimensions, explorerRows, type DimensionId } from '@/lib/analyticsRows';
import { downloadExplorerCsv } from './explorerCsv';
import { rowLink, type AnalyticsContext } from './drill';

const QUESTION: Record<DimensionId, string> = {
  symbol: 'Which instruments make you money?',
  strategy: 'Which strategies make you money, and which cost you?',
  session: 'Which sessions are your best and worst?',
  weekday: 'Which weekdays are your best and worst?',
  hour: 'Which hours are your best and worst?',
  direction: 'Do you do better long or short?',
  assetClass: 'Which asset classes earn for you?',
};

/** Breakdown explorer: `Group by` one dimension, ranked rows with an inline bar, every row opens its trades. */
export function EdgeTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, pro, currency } = ctx;
  const ent = useEntitlements();
  const [params, setParams] = useSearchParams();
  const dims = useMemo(() => availableDimensions(stats), [stats]);
  const by = (dims.find((d) => d.id === params.get('by'))?.id ?? 'symbol') as DimensionId;
  const dim = dims.find((d) => d.id === by) ?? dims[0];
  const locked = !pro && !dim.free;
  const rows = useMemo(() => explorerRows(stats, by), [stats, by]);

  const setBy = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'edge');
    if (id === 'symbol') next.delete('by');
    else next.set('by', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <ScopeBarSlot side="left">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span id="group-by-label">Group by</span>
          <Select value={by} onValueChange={setBy}>
            <SelectTrigger aria-labelledby="group-by-label" className="h-7 w-40 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dims.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                  {!pro && !d.free ? <span className="ml-2 text-xs text-accent-text">Pro</span> : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ScopeBarSlot>
      {!locked && (
        <ScopeBarSlot side="right">
          <Button type="button" variant="outline" size="sm" disabled={rows.length === 0} onClick={() => downloadExplorerCsv(dim.label, rows, currency)}>
            Export CSV
          </Button>
        </ScopeBarSlot>
      )}
      {locked ? (
        <LockedPreview title={`Group by ${dim.label}`} question={QUESTION[by]} currency={ent.currency} />
      ) : (
        <Panel padded={false}>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{by === 'strategy' || by === 'session' ? `Tag trades with a ${by} to compare them here.` : 'No trades in this period.'}</p>
          ) : (
            <BreakdownExplorer
              dimension={dim.label}
              rows={rows}
              currency={currency}
              caption={`Breakdown by ${dim.label.toLowerCase()}`}
              rowHref={(r) => rowLink(by, r)}
            />
          )}
        </Panel>
      )}
    </div>
  );
}
