import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { Money } from '@/components/ui/money';
import { useGetRulesQuery } from '@/store/api';
import { distributionRows, type DistributionRow } from '@/lib/analyticsRows';
import { tradesHref, type AnalyticsContext, type DrillParam } from './drill';

function BehaviourTable({ title, rows, param, ctx, empty }: { title: string; rows: DistributionRow[]; param: DrillParam; ctx: AnalyticsContext; empty: string }) {
  const navigate = useNavigate();
  const showCost = ctx.pro;
  const columns: DataColumn<DistributionRow>[] = [
    { id: 'name', header: 'Name', cell: (r) => <span className="block max-w-[18rem] truncate" title={r.name}>{r.name}</span> },
    { id: 'count', header: 'Count', align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.trades}</span> },
    {
      id: 'cost',
      header: 'Cost',
      align: 'right',
      cell: (r) => (showCost ? <Money value={r.net} currency={ctx.currency} /> : <span className="text-xs text-accent-text">Pro</span>),
    },
    {
      id: 'open',
      header: 'Open trades',
      srHeader: true,
      width: 'w-10',
      cell: (r) => (
        <Link to={tradesHref(param, r.key)} aria-label={`Open ${r.trades} ${r.trades === 1 ? 'trade' : 'trades'} for ${r.name} in Trades`} className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ),
    },
  ];
  return (
    <Panel title={title} padded={false}>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <DataTable caption={title} rows={rows} columns={columns} getRowId={(r) => r.key} onRowOpen={(r) => navigate(tradesHref(param, r.key))} />
      )}
    </Panel>
  );
}

/** What you do wrong and what it costs: mistake and broken-rule tables (cost is Pro), most repeated lessons. */
export function BehaviourTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats } = ctx;
  const { data: rules = [] } = useGetRulesQuery();
  const ruleName = useMemo(() => new Map(rules.map((r) => [r.ruleId, r.rule])), [rules]);
  const mistakes = useMemo(() => distributionRows(stats.mistakesDistribution).sort((a, b) => a.net - b.net), [stats.mistakesDistribution]);
  const broken = useMemo(() => distributionRows(stats.brokenRulesDistribution, { resolveName: (id) => ruleName.get(id) ?? 'Rule removed' }).sort((a, b) => a.net - b.net), [stats.brokenRulesDistribution, ruleName]);
  const lessons = useMemo(() => Object.entries((stats.lessonsDistribution ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 10), [stats.lessonsDistribution]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 2xl:grid-cols-2">
        <BehaviourTable title="Mistakes" rows={mistakes} param="mistake" ctx={ctx} empty="No mistakes tagged in this period." />
        <BehaviourTable title="Broken rules" rows={broken} param="rule" ctx={ctx} empty="No rules broken in this period." />
      </div>
      <Panel title="Most repeated lessons">
        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-[13px]">
            {lessons.map(([lesson, count]) => (
              <li key={lesson} className="flex justify-between gap-3"><span className="min-w-0 break-words">{lesson}</span><span className="font-mono text-xs text-muted-foreground">×{count}</span></li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
