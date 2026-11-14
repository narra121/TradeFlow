import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/panel';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { DirectionChip } from '@/components/ui/chips';
import { Money, RMultiple } from '@/components/ui/money';
import { formatDateTime } from '@/lib/format';
import { realisedR } from '@/lib/tradeFilters';
import type { Trade, TradingAccount } from '@/types/trade';

interface RecentTradesProps {
  trades: Trade[];
  accounts: Map<string, TradingAccount>;
  onOpen: (tradeId: string) => void;
  limit?: number;
}

/** Newest trades on the same `DataTable` as the Trades page (compact columns); a row opens the trade pane. */
export function RecentTrades({ trades, accounts, onOpen, limit = 6 }: RecentTradesProps) {
  const rows = trades.slice(0, limit);
  const currencyOf = (t: Trade) => (t.accountId ? accounts.get(t.accountId)?.currency : undefined);
  const columns: DataColumn<Trade>[] = [
    { id: 'date', header: 'Date', cell: (t) => <span className="whitespace-nowrap font-mono tabular-nums text-foreground-soft">{formatDateTime(t.exitDate || t.entryDate)}</span> },
    { id: 'symbol', header: 'Symbol', cell: (t) => <span className="font-medium">{t.symbol}</span> },
    { id: 'side', header: 'Side', cell: (t) => <DirectionChip direction={t.direction} /> },
    { id: 'net', header: 'Net P&L', align: 'right', cell: (t) => <Money value={t.pnl} currency={currencyOf(t)} /> },
    { id: 'r', header: 'R', align: 'right', hideBelow: 'sm', cell: (t) => <RMultiple value={realisedR(t)} /> },
  ];
  return (
    <Panel title="Recent trades" actions={<Link to="/app/tradelog" className="inline-flex items-center text-xs text-primary hover:underline [@media(pointer:coarse)]:min-h-11">View all →</Link>} padded={false}>
      <div className="overflow-x-auto">
        <DataTable caption="Recent trades, newest first" rows={rows} columns={columns} getRowId={(t) => t.id} onRowOpen={(t) => onOpen(t.id)} />
      </div>
    </Panel>
  );
}
