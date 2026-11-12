import { holdingMinutes, plannedRR, realisedR, riskAmount } from '@/lib/tradeFilters';
import type { Trade, TradingAccount } from '@/types/trade';

/** The fixed 32-column export schema (E-046): the same order and names every time, so spreadsheets keep working. */
export const EXPORT_COLUMNS = [
  'trade_id', 'account', 'currency', 'symbol', 'asset_class', 'side', 'quantity', 'lot_size', 'entry_price', 'exit_price',
  'stop_loss', 'take_profit', 'opened_at', 'closed_at', 'hold_minutes', 'fees', 'gross_pnl', 'net_pnl', 'risk_amount', 'r_multiple',
  'planned_rr', 'outcome', 'strategy', 'session', 'market_condition', 'mistakes', 'broken_rules', 'tags', 'key_lesson', 'notes',
  'screenshots', 'import_source',
] as const;

/** Cells starting with = + - @ tab or CR are read as formulas by spreadsheet apps; prefix them with a quote. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function tradeToRow(t: Trade, accounts: Map<string, TradingAccount>): unknown[] {
  const acc = t.accountId ? accounts.get(t.accountId) : undefined;
  return [
    t.id, acc?.name ?? '', acc?.currency ?? '', t.symbol, t.assetClass ?? '', t.direction === 'LONG' ? 'long' : 'short', t.size, t.contractMultiplier ?? '',
    t.entryPrice, t.exitPrice, t.stopLoss || '', t.takeProfit || '', t.entryDate, t.exitDate, holdingMinutes(t) ?? '', t.fees ?? '', t.grossPnl ?? '', t.pnl,
    riskAmount(t) ?? '', realisedR(t) ?? '', plannedRR(t) ?? '', t.outcome, t.strategy || t.setup || '', t.session ?? '', t.marketCondition ?? '',
    (t.mistakes ?? []).join('; '), (t.brokenRuleIds ?? []).length, (t.tags ?? []).join('; '), t.keyLesson ?? '', t.notes ?? '', t.images?.length ?? 0, t.importSource ?? '',
  ];
}

/** UTF-8 with a BOM so Excel opens it correctly; CRLF line ends. */
export function tradesToCsv(trades: Trade[], accounts: Map<string, TradingAccount>): string {
  const lines = [EXPORT_COLUMNS.join(',')];
  for (const t of trades) lines.push(tradeToRow(t, accounts).map(csvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function exportFileName(scope: 'view' | 'selection' | 'scope', now: Date = new Date()): string {
  return `tradequt-trades-${scope}-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(csv: string, name: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
