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
let tradingRules: { ruleId: string; rule: string }[] = [];
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: tradingRules, loading: false }) }));
const bulkUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/store/api', async (orig) => ({ ...(await orig<object>()), useBulkDeleteTradesMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}], useBulkUpdateTradesMutation: () => [bulkUpdate, {}] }));

import { TradeLogView } from '../TradeLogView';
import { ChromeProvider, useChromeState } from '@/components/shell/chrome';
import { ScopeBar } from '@/components/shell/ScopeBar';

const dataRows = () => screen.getAllByRole('row').filter((r) => r.hasAttribute('data-row-id'));

function ChromeProbe() {
  const c = useChromeState();
  return <p data-testid="chrome">{JSON.stringify({ count: c.count ?? null, badge: c.tabs?.find((t) => t.id === 'needs-journal')?.badge ?? null })}</p>;
}

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
            <ChromeProbe />
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

  it('counts journal tags in the singular for one and the plural for more', () => {
    scope = { trades: [mk(1, { tags: ['a'] }), mk(2, { tags: ['a', 'b'] })], isLoading: false, isError: false };
    setup();
    expect(screen.getByTitle('1 tag')).toBeInTheDocument();
    expect(screen.getByTitle('2 tags')).toBeInTheDocument();
  });

  it('announces the loading list as a busy status', () => {
    scope = { trades: [], isLoading: true, isError: false };
    setup();
    expect(screen.getByRole('status', { name: 'Loading trades' })).toHaveAttribute('aria-busy', 'true');
  });

  it('a failed list shows no 0 count and no Needs journal 0 in the header', () => {
    scope = { trades: [], isLoading: false, isError: true };
    setup();
    expect(JSON.parse(screen.getByTestId('chrome').textContent ?? '{}')).toEqual({ count: null, badge: null });
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

  it('on a phone shows the drill chip and the way back above the list, not in the full scope bar', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      scope = { trades: [mk(1, { strategy: 'Breakout' }), mk(2, { strategy: 'Reversal' })], isLoading: false, isError: false };
      setup('/app/tradelog?src=analytics&strategy=Breakout');
      const chip = screen.getByRole('button', { name: 'Remove filter: From Analytics: Strategy = Breakout' });
      expect(screen.getByRole('toolbar', { name: 'Data shown' })).not.toContainElement(chip);
      expect(screen.getByRole('toolbar', { name: 'Data shown' })).not.toContainElement(screen.getByRole('button', { name: 'Back to Analytics' }));
      await userEvent.click(chip);
      expect(screen.queryByRole('button', { name: /Remove filter/ })).toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('on a phone offers Save and Reset of a changed view in the Filters sheet, not in the scope bar', async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      scope = { trades: [mk(1), mk(2, { symbol: 'XAUUSD' })], isLoading: false, isError: false };
      setup();
      await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
      await userEvent.type(screen.getByRole('textbox', { name: 'Find in trades' }), 'XAU');
      const sheet = screen.getByRole('dialog', { name: 'Filters' });
      expect(within(sheet).getByText('View: All')).toBeInTheDocument();
      expect(within(sheet).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      const bar = document.querySelector('[role="toolbar"][aria-label="Data shown"]') as HTMLElement;
      expect(bar).not.toBeNull();
      expect(within(bar).queryByText('Reset')).toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });

  it('saves the changed list as a view and offers Delete view for it (a custom view has no builtIn flag)', async () => {
    scope = { trades: [mk(1), mk(2, { symbol: 'XAUUSD' })], isLoading: false, isError: false };
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Find in trades' }), 'XAU');
    await userEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'View name' }), 'Gold');
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }));
    expect(JSON.parse(localStorage.getItem('tq.tradelog.views') ?? '[]')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Delete view' }));
    expect(JSON.parse(localStorage.getItem('tq.tradelog.views') ?? '[]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Delete view' })).toBeNull();
  });

  it('names a rule copied into a goals period (<period>#<date>#<ruleId>) by its rule, not "Rule removed"', () => {
    tradingRules = [{ ruleId: 'r1', rule: 'Stick to my plan' }];
    try {
      scope = { trades: [mk(1, { brokenRuleIds: ['r1'] }), mk(2)], isLoading: false, isError: false };
      setup('/app/tradelog?broken=' + encodeURIComponent('r1,week#2026-11-09#r1'));
      expect(dataRows()).toHaveLength(1);
      expect(screen.getByRole('button', { name: /^Remove filter: .*Broken rule = Stick to my plan$/ })).toBeInTheDocument();
    } finally {
      tradingRules = [];
    }
  });

  it('a row menu item does not also open the row (the click does not bubble out of the menu to the row)', async () => {
    scope = { trades: [mk(1), mk(2)], isLoading: false, isError: false };
    setup();
    const row = dataRows().find((r) => r.getAttribute('data-row-id') === 't1')!;
    await userEvent.click(within(row).getByRole('button', { name: /^Actions for EURUSD/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('closes the pane when the trade open in it is deleted from its row menu', async () => {
    scope = { trades: [mk(1), mk(2)], isLoading: false, isError: false };
    setup();
    const row = dataRows().find((r) => r.getAttribute('data-row-id') === 't1')!;
    await userEvent.click(within(row).getAllByRole('cell')[2]);
    expect(screen.getByTestId('search').textContent).toBe('?trade=t1');
    await userEvent.click(within(row).getByRole('button', { name: /^Actions for EURUSD/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await vi.waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
  });

  it('lists the newest trade first by default and exposes sort state', () => {
    scope = { trades: [mk(1), mk(9), mk(5)], isLoading: false, isError: false };
    setup();
    const rows = dataRows();
    expect(rows[0]).toHaveTextContent('11:00');
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('Mon 09 Nov 2026');
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

  it('Shift-click selects the rows between two clicks as they are shown, not as they sort (FE-018)', async () => {
    sessionStorage.setItem('tq.tradelog.group', 'symbol');
    scope = {
      trades: [mk(1, { symbol: 'EURUSD' }), mk(2, { symbol: 'GBPUSD' }), mk(3, { symbol: 'EURUSD' }), mk(4, { symbol: 'GBPUSD' }), mk(5, { symbol: 'EURUSD' })],
      isLoading: false,
      isError: false,
    };
    setup();
    const eur = screen.getAllByRole('checkbox', { name: /^Select EURUSD/ });
    expect(eur).toHaveLength(3);
    const user = userEvent.setup();
    await user.click(eur[0]);
    await user.keyboard('{Shift>}');
    await user.click(eur[2]);
    await user.keyboard('{/Shift}');
    const bar = screen.getByRole('toolbar', { name: 'Selected trades' });
    expect(within(bar).getByText('3 selected')).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox', { name: /^Select GBPUSD/ })) expect(box).not.toBeChecked();
  });

  it('Shift-click ranges over the sorted list when nothing is grouped', async () => {
    sessionStorage.setItem('tq.tradelog.group', 'none');
    scope = { trades: [mk(1), mk(2), mk(3), mk(4)], isLoading: false, isError: false };
    setup();
    const boxes = screen.getAllByRole('checkbox', { name: /^Select EURUSD/ });
    const user = userEvent.setup();
    await user.click(boxes[0]);
    await user.keyboard('{Shift>}');
    await user.click(boxes[2]);
    await user.keyboard('{/Shift}');
    expect(within(screen.getByRole('toolbar', { name: 'Selected trades' })).getByText('3 selected')).toBeInTheDocument();
  });

  describe('bulk edit (FE-019, X-013, FE-045)', () => {
    const pickTags = async () => {
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows shown' }));
      const bar = screen.getByRole('toolbar', { name: 'Selected trades' });
      await userEvent.click(within(bar).getByRole('button', { name: 'Tags' }));
    };

    beforeEach(() => {
      bulkUpdate.mockReset();
      scope = { trades: [mk(1, { tags: ['A'] }), mk(2, { tags: [] }), mk(3, { tags: [] })], isLoading: false, isError: false };
    });

    it('sends one bulk-update with add/remove for the trades that change, not one PUT per trade', async () => {
      bulkUpdate.mockReturnValue({ unwrap: () => Promise.resolve({ updated: 2, updatedIds: ['t2', 't3'], notFound: [], failed: [] }) });
      setup();
      await pickTags();
      await userEvent.click(await screen.findByRole('option', { name: /^A/ }));
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      const arg = bulkUpdate.mock.calls[0][0];
      expect(arg).toMatchObject({ tradeIds: ['t3', 't2'], add: { tags: ['A'] } });
      expect(arg.set).toBeUndefined();
      expect(arg.patches.t2).toEqual({ tags: ['A'] });
    });

    it('a second pick while the first is still running is ignored, so it cannot overwrite the first', async () => {
      bulkUpdate.mockReturnValue({ unwrap: () => new Promise(() => undefined) });
      setup();
      await pickTags();
      await userEvent.click(await screen.findByRole('option', { name: /^A/ }));
      await userEvent.click(screen.getByRole('option', { name: /^A/ }));
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Updating 0 of 2/)).toBeInTheDocument();
    });

    it('reports the trades the API refused with its message and retries only those', async () => {
      bulkUpdate.mockReturnValueOnce({ unwrap: () => Promise.resolve({ updated: 1, updatedIds: ['t2'], notFound: [], failed: [{ tradeId: 't3', message: 'A trade can have at most 10 tags' }] }) });
      setup();
      await pickTags();
      await userEvent.click(await screen.findByRole('option', { name: /^A/ }));
      expect(await screen.findByText(/1 could not be updated\. A trade can have at most 10 tags/)).toBeInTheDocument();
      bulkUpdate.mockReturnValueOnce({ unwrap: () => Promise.resolve({ updated: 1, updatedIds: ['t3'], notFound: [], failed: [] }) });
      await userEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
      expect(bulkUpdate).toHaveBeenCalledTimes(2);
      expect(bulkUpdate.mock.calls[1][0]).toMatchObject({ tradeIds: ['t3'], add: { tags: ['A'] } });
      await vi.waitFor(() => expect(screen.queryByText(/could not be updated/)).toBeNull());
    });

    it('marks the selected trades reviewed in one bulk-update, skipping those already reviewed', async () => {
      scope = { trades: [mk(1, { reviewed: true }), mk(2), mk(3)], isLoading: false, isError: false };
      bulkUpdate.mockReturnValue({ unwrap: () => Promise.resolve({ updated: 2, updatedIds: ['t2', 't3'], notFound: [], failed: [] }) });
      setup();
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows shown' }));
      const bar = screen.getByRole('toolbar', { name: 'Selected trades' });
      await userEvent.click(within(bar).getByRole('button', { name: 'Reviewed · followed plan' }));
      await userEvent.click(await screen.findByRole('option', { name: 'Yes' }));
      expect(bulkUpdate).toHaveBeenCalledTimes(1);
      const arg = bulkUpdate.mock.calls[0][0];
      expect(arg).toMatchObject({ tradeIds: ['t3', 't2'], set: { reviewed: true } });
      expect(arg.patches.t2).toEqual({ reviewed: true });
    });
  });

  it('shows fees per currency, never one sum in the first currency (FE-055)', () => {
    scope = { trades: [mk(1, { fees: 3 }), mk(2, { fees: 200, accountId: 'a2' })], isLoading: false, isError: false };
    setup();
    const footer = screen.getByRole('status').textContent ?? '';
    expect(footer).toMatch(/Fees (₹200\.00 · \$3\.00|\$3\.00 · ₹200\.00)/);
    expect(footer).not.toContain('203');
  });
});
