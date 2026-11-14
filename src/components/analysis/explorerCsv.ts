import { csvCell } from '@/lib/exportCsv';
import type { DistributionRow } from '@/lib/analyticsRows';
import { evidenceOf } from '@/lib/evidence';

/** One row per segment, raw values (dot decimals, no symbols), as the visible breakdown shows them. */
export function explorerCsv(dimension: string, rows: DistributionRow[], currency: string | undefined): string {
  const withR = rows.some((r) => r.avgR !== undefined);
  const withEvidence = rows.some((r) => r.verdict !== undefined);
  const header = [dimension, 'trades', 'wins', 'win_rate_pct', 'net_pnl', 'currency', 'expectancy', ...(withR ? ['avg_r'] : []), ...(withEvidence ? ['profit_factor', 'evidence'] : [])];
  const lines = rows.map((r) => [
    r.name,
    r.trades,
    r.wins,
    r.winRate.toFixed(1),
    r.net.toFixed(2),
    currency ?? '',
    r.trades ? (r.net / r.trades).toFixed(2) : '',
    ...(withR ? [r.avgR ?? ''] : []),
    ...(withEvidence ? [r.profitFactor ?? '', r.verdict ? evidenceOf(r.verdict, r.trades).text : ''] : []),
  ]);
  return [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\r\n');
}

export function downloadExplorerCsv(dimension: string, rows: DistributionRow[], currency: string | undefined): void {
  const blob = new Blob(['﻿', explorerCsv(dimension, rows, currency)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-by-${dimension.toLowerCase().replace(/[^a-z]+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
