import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { Money } from '@/components/ui/money';
import { useGetRulesQuery } from '@/store/api';
import { distributionRows, type DistributionRow } from '@/lib/analyticsRows';
import { sampleLabel, SAMPLE_TEXT } from '@/lib/evidence';
import { formatR } from '@/lib/format';
import type { TagStats } from '@/types/stats';
import { LockedPreview } from '@/components/billing/ProGate';
import { useEntitlements } from '@/hooks/useEntitlements';
import { DetectorBoard, WhatIfPanel } from './BehaviourPanels';
import { MixedCurrencyPanel } from './AnalysisGate';
import { tradesHref, type AnalyticsContext, type DrillParam } from './drill';

/** The tag's average R against the baseline's, with the smaller of the two samples and its evidence band. */
function VsUntagged({ row, base }: { row: DistributionRow; base: TagStats }) {
  if (row.avgR === undefined) return <span className="whitespace-nowrap text-xs text-muted-foreground">No trade with a stop</span>;
  const baseR = typeof base.avgR === 'number' ? base.avgR : null;
  const n = Math.min(row.rCount ?? 0, baseR === null ? Infinity : (base.rCount ?? 0));
  return (
    <span className="block">
      <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">
        {/* Neutral: this comparison carries no verdict, so neither side is coloured as good or bad. */}
        <span>{formatR(row.avgR)}</span> <span className="text-muted-foreground">vs</span> {baseR === null ? <span className="text-muted-foreground">—</span> : <span>{formatR(baseR)}</span>}
      </span>
      <span className="block text-[11px] leading-4 text-muted-foreground">
        {row.rCount ?? 0} with a stop · {SAMPLE_TEXT[sampleLabel(n)]}
      </span>
    </span>
  );
}

interface BehaviourTableProps {
  title: string;
  rows: DistributionRow[];
  param: DrillParam;
  ctx: AnalyticsContext;
  empty: string;
  /** Trades without the tag; absent from servers that send no R per tag, and then the comparison is not drawn. */
  baseline?: TagStats;
  /** Who the baseline is, for the panel's description. */
  baselineName: string;
}

function BehaviourTable({ title, rows, param, ctx, empty, baseline, baselineName }: BehaviourTableProps) {
  const navigate = useNavigate();
  const pro = ctx.pro;
  const compare = pro && baseline ? baseline : null;
  const columns: DataColumn<DistributionRow>[] = [
    { id: 'name', header: 'Name', cell: (r) => <span className="block max-w-[18rem] truncate" title={r.name}>{r.name}</span> },
    { id: 'count', header: 'Count', align: 'right', hideBelow: compare ? 'sm' : undefined, cell: (r) => <span className="font-mono tabular-nums">{r.trades}</span> },
    {
      id: 'net',
      header: 'Net P&L',
      align: 'right',
      cell: (r) => (pro ? <Money value={r.net} currency={ctx.currency} /> : <span className="text-xs text-accent-text">Pro</span>),
    },
    ...(compare ? [{ id: 'vsUntagged', header: 'vs untagged', align: 'right' as const, cell: (r: DistributionRow) => <VsUntagged row={r} base={compare} /> }] : []),
    {
      id: 'open',
      header: 'Open trades',
      srHeader: true,
      width: 'w-10',
      cell: (r) => (
        <Link to={tradesHref(param, r.key)} aria-label={`Open ${r.trades} ${r.trades === 1 ? 'trade' : 'trades'} for ${r.name} in Trades`} className="flex h-6 w-6 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ),
    },
  ];
  const baseText = typeof compare?.avgR === 'number' ? `${formatR(compare.avgR)} over ${compare.rCount ?? 0} with a stop` : 'none of them has a stop';
  const description = compare && rows.length > 0 ? `vs untagged: average R of the trades with the tag against ${baselineName} (${baseText}). R is before fees.` : undefined;
  return (
    <Panel title={title} description={description} padded={false}>
      {rows.length === 0 ? (
        <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <DataTable caption={title} rows={rows} columns={columns} getRowId={(r) => r.key} onRowOpen={(r) => navigate(tradesHref(param, r.key))} />
      )}
    </Panel>
  );
}

/**
 * What you do that costs money: the detector board and the what-if replay (from `GET /analysis`; money, R and the replay
 * are Pro), then the mistake and broken-rule tables (net P&L and R comparison are Pro) and the most repeated lessons.
 */
export function BehaviourTab({ ctx }: { ctx: AnalyticsContext }) {
  const { stats, analysis, pro } = ctx;
  const ent = useEntitlements();
  const money = analysis?.data?.currency ?? ctx.currency;
  const { data: rules = [] } = useGetRulesQuery();
  const ruleName = useMemo(() => new Map(rules.map((r) => [r.ruleId, r.rule])), [rules]);
  const mistakes = useMemo(() => distributionRows(stats.mistakesDistribution).sort((a, b) => a.net - b.net), [stats.mistakesDistribution]);
  const broken = useMemo(() => distributionRows(stats.brokenRulesDistribution, { resolveName: (id) => ruleName.get(id) ?? 'Rule removed' }).sort((a, b) => a.net - b.net), [stats.brokenRulesDistribution, ruleName]);
  const lessons = useMemo(() => Object.entries((stats.lessonsDistribution ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 10), [stats.lessonsDistribution]);

  return (
    <div className="space-y-4">
      {analysis?.mixed ? (
        <MixedCurrencyPanel currencies={analysis.mixed} what="the behaviour checks and the what-if replay" />
      ) : (
        <>
          <DetectorBoard state={analysis} currency={money} pro={pro} />
          {pro ? <WhatIfPanel state={analysis} currency={money} /> : <LockedPreview title="What if I had followed a rule?" question="How would the period have ended without the trades a rule would have blocked?" currency={ent.currency} />}
        </>
      )}
      <div className="grid gap-4 2xl:grid-cols-2 [&>*]:min-w-0">
        <BehaviourTable title="Mistakes" rows={mistakes} param="mistake" ctx={ctx} empty="No mistakes tagged in this period." baseline={stats.noMistakeTrades} baselineName="trades with no mistake tag" />
        <BehaviourTable title="Broken rules" rows={broken} param="rule" ctx={ctx} empty="No rules broken in this period." baseline={stats.noBrokenRuleTrades} baselineName="trades that broke no rule" />
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
