import { format, startOfWeek } from 'date-fns';
import { realisedR } from '@/lib/tradeFilters';
import { tradeDayKey } from '@/lib/calendar';
import { parseLocalDate } from '@/lib/format';
import type { Trade, TradingAccount } from '@/types/trade';

export type GroupBy = 'none' | 'day' | 'week' | 'month' | 'symbol' | 'side' | 'account' | 'asset' | 'outcome' | 'strategy' | 'session' | 'market';

export const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'side', label: 'Side' },
  { value: 'account', label: 'Account' },
  { value: 'asset', label: 'Asset class' },
  { value: 'outcome', label: 'Outcome' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'session', label: 'Session' },
  { value: 'market', label: 'Market' },
];

const DATE_GROUPS: GroupBy[] = ['day', 'week', 'month'];
const OUTCOME_LABEL: Record<string, string> = { TP: 'TP hit', SL: 'SL hit', PARTIAL: 'Partial', BREAKEVEN: 'Breakeven' };

export interface TradeGroup {
  key: string;
  label: string;
  trades: Trade[];
  wins: number;
  losses: number;
  /** Net per currency; a group never sums two currencies. */
  net: { currency: string; value: number }[];
  /** Sum of R over trades with an R; null when none has one. */
  totalR: number | null;
}

function keyOf(t: Trade, by: GroupBy, accounts: Map<string, TradingAccount>): { key: string; label: string } {
  switch (by) {
    case 'day': {
      const k = tradeDayKey(t);
      return { key: k, label: k ? format(parseLocalDate(k), 'EEE d MMM yyyy') : 'No date' };
    }
    case 'week': {
      const w = startOfWeek(new Date(t.exitDate || t.entryDate), { weekStartsOn: 1 });
      return { key: format(w, 'yyyy-MM-dd'), label: `Week of ${format(w, 'd MMM yyyy')}` };
    }
    case 'month': {
      const d = new Date(t.exitDate || t.entryDate);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
    }
    case 'symbol':
      return { key: t.symbol, label: t.symbol };
    case 'side':
      return { key: t.direction, label: t.direction === 'LONG' ? 'Long' : 'Short' };
    case 'account': {
      const a = t.accountId ? accounts.get(t.accountId) : undefined;
      return { key: a?.id ?? 'none', label: a?.name ?? 'No account' };
    }
    case 'asset':
      return { key: t.assetClass ?? 'unknown', label: t.assetClass ? t.assetClass[0].toUpperCase() + t.assetClass.slice(1) : 'Not set' };
    case 'outcome':
      return { key: t.outcome, label: OUTCOME_LABEL[t.outcome] ?? t.outcome };
    case 'strategy':
      return { key: t.strategy || t.setup || '', label: t.strategy || t.setup || 'No strategy' };
    case 'session':
      return { key: t.session ?? '', label: t.session || 'No session' };
    case 'market':
      return { key: t.marketCondition ?? '', label: t.marketCondition || 'No market condition' };
    default:
      return { key: 'all', label: 'All trades' };
  }
}

/**
 * Splits trades into groups with W / L, net per currency and summed R. Date groups keep the incoming order
 * (newest first from the list's sort); other groups are ordered by net, worst first, so leaks come first.
 */
export function groupTrades(trades: Trade[], by: GroupBy, accounts: Map<string, TradingAccount>): TradeGroup[] {
  if (by === 'none') return [];
  const map = new Map<string, TradeGroup>();
  const order: string[] = [];
  for (const t of trades) {
    const { key, label } = keyOf(t, by, accounts);
    let g = map.get(key);
    if (!g) {
      g = { key, label, trades: [], wins: 0, losses: 0, net: [], totalR: null };
      map.set(key, g);
      order.push(key);
    }
    g.trades.push(t);
    if (t.pnl > 0) g.wins += 1;
    else if (t.pnl < 0) g.losses += 1;
    const cur = (t.accountId && accounts.get(t.accountId)?.currency) || null;
    if (cur) {
      const row = g.net.find((n) => n.currency === cur);
      if (row) row.value += t.pnl;
      else g.net.push({ currency: cur, value: t.pnl });
    }
    const r = realisedR(t);
    if (r !== null) g.totalR = (g.totalR ?? 0) + r;
  }
  const groups = order.map((k) => map.get(k)!);
  if (DATE_GROUPS.includes(by)) return groups;
  const total = (g: TradeGroup) => g.net.reduce((s, n) => s + n.value, 0);
  return groups.sort((a, b) => total(a) - total(b));
}
