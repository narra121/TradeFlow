import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Trade } from '@/types/trade';

const accounts = [
  { id: 'a1', name: 'FTMO', currency: 'USD', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 1000, createdAt: '' },
  { id: 'a2', name: 'Zerodha', currency: 'INR', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 1000, createdAt: '' },
];

const mk = (i: number, over: Partial<Trade> = {}): Trade =>
  ({
    id: `t${i}`, symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1,
    entryDate: `2026-11-${String(i).padStart(2, '0')}T10:00:00`, exitDate: `2026-11-${String(i).padStart(2, '0')}T11:00:00`,
    outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1', ...over,
  }) as Trade;

let scope: { trades: Trade[]; isLoading: boolean; isError: boolean };
const refetch = vi.fn();
vi.mock('@/hooks/useScopeTrades', () => ({
  useScopeTrades: () => ({ ...scope, isFetching: false, refetch, truncated: false, params: {} }),
}));
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts, selectedAccountId: null, selectedAccount: null, setSelectedAccountId: vi.fn() }),
}));
vi.mock('@/store/api', async (orig) => ({ ...(await orig<object>()), useBulkDeleteTradesMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}] }));

import { TradeLogView } from '../TradeLogView';
import { ChromeProvider } from '@/components/shell/chrome';
import { ScopeBar } from '@/components/shell/ScopeBar';

const dataRows = () => screen.getAllByRole('row').filter((r) => r.hasAttribute('data-row-id'));

function Where() {
  return <p data-testid="search">{useLocation().search}</p>;
}

function setup(entry = '/app/tradelog') {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[entry]}>
          <ChromeProvider>
            <ScopeBar scoped isMobile={false} />
            <TradeLogView />
          </ChromeProvider>
          <Where />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>,
  );
}

describe('TradeLogView', () => {
  beforeEach(() => {
    sessionStorage.clear();
    scope = { trades: [], isLoading: false, isError: false };
    refetch.mockClear();
  });

  it('shows the error state with Retry, never "no trades"', async () => {
    scope = { trades: [], isLoading: false, isError: true };
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load trades");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText(/No trades/)).toBeNull();
  });

  it('shows an activation prompt when the scope is empty', () => {
    setup();
    expect(screen.getByText('No trades yet.')).toBeInTheDocument();
  });

  it('applies a drill-down from the URL as a removable chip and strips only its own parameters', async () => {
    scope = { trades: [mk(1, { strategy: 'Breakout' }), mk(2, { strategy: 'Reversal' }), mk(3, { strategy: 'Breakout' })], isLoading: false, isError: false };
    setup('/app/tradelog?src=analytics&strategy=Breakout&trade=t1');
    expect(dataRows()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Remove filter: From Analytics: Strategy = Breakout' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remove filter/ }));
    expect(dataRows()).toHaveLength(3);
    expect(screen.getByTestId('search').textContent).toBe('?trade=t1');
  });

  it('lists the newest trade first by default and exposes sort state', () => {
    scope = { trades: [mk(1), mk(9), mk(5)], isLoading: false, isError: false };
    setup();
    const rows = dataRows();
    expect(rows[0]).toHaveTextContent('11:00');
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('Mon 9 Nov 2026');
    expect(screen.getByRole('columnheader', { name: /Date/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('finds a trade that would have been on another server page', async () => {
    scope = { trades: [...Array.from({ length: 60 }, (_, i) => mk(i + 1, { id: `e${i}` })), mk(30, { id: 'gold', symbol: 'XAUUSD' })], isLoading: false, isError: false };
    setup();
    await userEvent.type(screen.getByLabelText('Find in trades'), 'xau');
    const rows = dataRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('XAUUSD');
  });

  it('summarises per currency instead of mixing them', () => {
    scope = { trades: [mk(1, { pnl: 100 }), mk(2, { pnl: 5000, accountId: 'a2' })], isLoading: false, isError: false };
    setup();
    const footer = screen.getByRole('status');
    expect(footer).toHaveTextContent('+$100.00');
    expect(footer).toHaveTextContent('+₹5,000.00');
  });

  it('opens the trade in the pane through the URL when a row is activated by keyboard', async () => {
    scope = { trades: [mk(3)], isLoading: false, isError: false };
    setup();
    const row = dataRows()[0];
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('search')).toHaveTextContent('?trade=t3');
  });

  it('selects rows and shows the bulk bar with the count', async () => {
    scope = { trades: [mk(1), mk(2), mk(3)], isLoading: false, isError: false };
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows shown' }));
    const bar = screen.getByRole('toolbar', { name: 'Selected trades' });
    expect(within(bar).getByText('3 selected')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('toolbar', { name: 'Selected trades' })).toBeNull();
  });

  it('asks before deleting and names the count', async () => {
    scope = { trades: [mk(1), mk(2)], isLoading: false, isError: false };
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows shown' }));
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }));
    expect(await screen.findByText('Delete 2 trades?')).toBeInTheDocument();
  });

  it('keeps the filters when the view is left and reopened', async () => {
    scope = { trades: [mk(1), mk(2, { symbol: 'XAUUSD' })], isLoading: false, isError: false };
    const first = setup();
    await userEvent.type(screen.getByLabelText('Find in trades'), 'xau');
    first.unmount();
    setup();
    expect(screen.getByLabelText('Find in trades')).toHaveValue('xau');
  });
});
