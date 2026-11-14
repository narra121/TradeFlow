import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Money } from '@/components/ui/money';
import { MetricInfo } from '@/components/stats/MetricInfo';
import { useAnalysisQueryQuery, type AnalysisScope } from '@/store/api/analysisApi';
import { MIN_VERDICT_TRADES, plural } from '@/lib/evidence';
import { formatDateShort, formatPercent, formatR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Dimension, QueryResult, SampleLabel, Verdict } from '@/types/analysis';
import { EvidenceText } from './EvidenceText';
import { DIMENSION_LABEL } from './OverviewPanels';
import { segmentHref } from './drill';
import { mixedCurrencies } from './useAnalysis';
import { PickAccountNotice } from './AnalysisGate';

/** A segment key from its display name, for the links of two-way cells (the query returns names only). */
function keyFromName(dim: Dimension, name: string): string {
  if (dim === 'hour') return name.slice(0, 2);
  return name.toLowerCase();
}

function pairHref(a: Dimension, an: string, b: Dimension, bn: string, zone: string): string | null {
  const ha = segmentHref(a, { key: keyFromName(a, an), name: an }, zone);
  const hb = segmentHref(b, { key: keyFromName(b, bn), name: bn }, zone);
  if (!ha || !hb) return null;
  const q = new URLSearchParams(ha.split('?')[1]);
  new URLSearchParams(hb.split('?')[1]).forEach((v, k) => q.set(k, v));
  return `/app/tradelog?${q.toString()}`;
}

interface Cell {
  a: string;
  b: string;
  trades: number;
  winRate: number;
  net: number;
  avgR: number | null;
  verdict: Verdict;
  label: SampleLabel;
}

/** Rows of a `stats` query with two `groupBy` dimensions, read by column name. */
export function twoWayCells(r: QueryResult): Cell[] {
  const col = (name: string) => r.columns.indexOf(name);
  const [ti, wi, ni, ri, vi, li] = ['trades', 'winRate', 'net', 'avgR', 'verdict', 'label'].map(col);
  return r.rows.map((row) => ({
    a: String(row[0] ?? ''),
    b: String(row[1] ?? ''),
    trades: Number(row[ti] ?? 0),
    winRate: Number(row[wi] ?? 0),
    net: Number(row[ni] ?? 0),
    avgR: row[ri] == null ? null : Number(row[ri]),
    verdict: (row[vi] as Verdict) ?? 'watch',
    label: (row[li] as SampleLabel) ?? 'too-few',
  }));
}

function QueryState({ q, scopeWhat }: { q: { isLoading: boolean; isFetching: boolean; isError: boolean; error?: unknown; refetch: () => void }; scopeWhat: string }) {
  if (q.isError) {
    const mixed = mixedCurrencies(q.error);
    if (mixed) return <div className="p-4"><PickAccountNotice currencies={mixed} what={scopeWhat} /></div>;
    return <div className="p-4"><ErrorState title="Couldn't load this table." error={q.error} onRetry={q.refetch} /></div>;
  }
  return <div className="p-4"><Skeleton role="status" className="h-40" aria-label="Loading" /></div>;
}

/** Group by × then by: for exploring only, cells under 30 trades greyed and never coloured (report §3.3 rule 4). */
export function TwoWayPanel({ scope, by, then, currency, zone }: { scope: AnalysisScope; by: Dimension; then: Dimension; currency?: string; zone: string }) {
  const q = useAnalysisQueryQuery({ ...scope, query: { kind: 'stats', groupBy: [by, then] } });
  const cells = useMemo(() => (q.currentData ? twoWayCells(q.currentData) : []), [q.currentData]);
  const title = `${DIMENSION_LABEL[by]} then by ${DIMENSION_LABEL[then].toLowerCase()}`;
  const enough = cells.filter((c) => c.trades >= MIN_VERDICT_TRADES).length;
  return (
    <Panel title={title} description={`${plural(enough, 'cell')} with ${MIN_VERDICT_TRADES} or more trades; the rest are greyed. For exploring only.`} padded={false}>
      {!q.currentData ? (
        <QueryState q={q} scopeWhat="this breakdown" />
      ) : cells.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No trade has both values in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="h-8 border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 font-medium">{DIMENSION_LABEL[by]}</th>
                <th scope="col" className="px-3 font-medium">{DIMENSION_LABEL[then]}</th>
                <th scope="col" className="px-3 text-right font-medium">Trades</th>
                <th scope="col" className="hidden px-3 text-right font-medium sm:table-cell">Win %</th>
                <th scope="col" className="px-3 text-right font-medium">Net P&amp;L</th>
                <th scope="col" className="hidden px-3 text-right font-medium sm:table-cell">Avg R</th>
                <th scope="col" className="hidden px-3 font-medium md:table-cell">Evidence</th>
                <th scope="col" className="w-10"><span className="sr-only">Open trades</span></th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c) => {
                const small = c.trades < MIN_VERDICT_TRADES;
                const href = pairHref(by, c.a, then, c.b, zone);
                return (
                  <tr key={`${c.a}\u0000${c.b}`} className={cn('h-9 border-b border-border/60 last:border-0', small && 'text-muted-foreground')}>
                    <th scope="row" className="max-w-[12rem] truncate px-4 text-left font-normal">{c.a}</th>
                    <td className="max-w-[12rem] truncate px-3">{c.b}</td>
                    <td className="px-3 text-right font-mono tabular-nums">{c.trades}</td>
                    <td className="hidden px-3 text-right font-mono tabular-nums sm:table-cell">{formatPercent(c.winRate * 100)}</td>
                    <td className="px-3 text-right"><Money value={c.net} currency={currency} neutral={small} /></td>
                    <td className="hidden px-3 text-right font-mono tabular-nums sm:table-cell">{formatR(c.avgR)}</td>
                    <td className="hidden px-3 md:table-cell"><EvidenceText verdict={c.verdict} trades={c.trades} inline className="text-xs" /></td>
                    <td className="px-1">
                      {href && (
                        <Link to={href} aria-label={`Open ${plural(c.trades, 'trade')} for ${c.a} and ${c.b} in Trades`} className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted-foreground">
            {q.currentData.note ?? ''} <MetricInfo metric="twoWay" label="About this table" />
          </p>
        </div>
      )}
    </Panel>
  );
}

const periodName = (p: { from: string; to: string }) => `${formatDateShort(p.from, true)} – ${formatDateShort(p.to, true)}`;

/** The compare verdict in words: better or worse in R only when the server judged it so. */
function compareVerdict(v: string | number | null, label: SampleLabel): string {
  if (v === 'edge') return 'This period is better in R';
  if (v === 'leak') return 'This period is worse in R';
  return label === 'too-few' || label === 'early' ? 'Too early to tell' : 'No clear difference';
}

function compareValue(measure: string, v: string | number | null, currency?: string): React.ReactNode {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (measure === 'Win rate') return formatPercent(v * 100);
  if (measure.startsWith('Net P&L')) return <Money value={v} currency={currency} />;
  if (measure === 'Average R') return formatR(v);
  if (measure === 'Payoff') return v.toFixed(2);
  return v.toLocaleString('en-US');
}

/** This period against the one before it (POST /analysis/query, kind compare). */
export function ComparePanel({ scope, previous, currency }: { scope: AnalysisScope; previous: { from: string; to: string } | null; currency?: string }) {
  const q = useAnalysisQueryQuery(previous ? { ...scope, query: { kind: 'compare', a: { from: scope.from, to: scope.to }, b: previous } } : skipToken);
  const a = { from: scope.from, to: scope.to };
  return (
    <Panel title="This period against the one before" description={previous ? `${periodName(a)} against ${periodName(previous)}` : undefined} padded={false}>
      {!previous ? (
        <p className="p-4 text-sm text-muted-foreground">Pick a period other than All time in the top bar to compare it with the period before.</p>
      ) : !q.currentData ? (
        <QueryState q={q} scopeWhat="the comparison" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <caption className="sr-only">This period against the one before</caption>
            <thead>
              <tr className="h-8 border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 font-medium">Measure</th>
                <th scope="col" className="px-3 text-right font-medium">This period</th>
                <th scope="col" className="px-4 text-right font-medium">Period before</th>
              </tr>
            </thead>
            <tbody>
              {q.currentData.rows.map((row) => {
                const measure = String(row[0]);
                const verdictRow = measure.startsWith('Verdict');
                return (
                  <tr key={measure} className="h-9 border-b border-border/60 last:border-0">
                    <th scope="row" className="px-4 text-left font-normal">{verdictRow ? 'Difference in R' : measure}</th>
                    {verdictRow ? (
                      <td colSpan={2} className="px-4 text-right">{compareVerdict(row[1], q.currentData!.label)}</td>
                    ) : (
                      <>
                        <td className="px-3 text-right font-mono tabular-nums">{compareValue(measure, row[1], currency)}</td>
                        <td className="px-4 text-right font-mono tabular-nums">{compareValue(measure, row[2], currency)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted-foreground">A difference is named only with 30 trades with a stop in each period, a clear gap in R, and the same direction in both halves. Net P&amp;L is after fees; R is before fees.</p>
        </div>
      )}
    </Panel>
  );
}

