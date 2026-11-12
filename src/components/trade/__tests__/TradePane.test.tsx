import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/types/trade';

const mk = (id: string, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol: `SYM${id}`, direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1', ...over }) as Trade;

const param = { trade: 't2', mode: 'view', expanded: false, date: null, from: null, ids: null as string[] | null, stepTo: vi.fn(), setEdit: vi.fn(), setExpanded: vi.fn(), close: vi.fn(), openNew: vi.fn(), openTrade: vi.fn(), openEdit: vi.fn() };
let readOnly = new Set<string>();

vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => param }));
vi.mock('@/hooks/useReadOnlyAccounts', () => ({ useReadOnlyAccounts: () => readOnly }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({ useSavedOptions: () => ({ options: { strategies: [], sessions: [], marketConditions: [], mistakes: [], tags: [] }, addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn() }) }));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
vi.mock('@/store/api', () => ({ useDeleteTradeMutation: () => [vi.fn(), { isLoading: false }], useBulkDeleteTradesMutation: () => [vi.fn()], useRestoreTradesMutation: () => [vi.fn()], useUpdateTradeMutation: () => [vi.fn()] }));

import { TradePane } from '../TradePane';

const trades = [mk('t1'), mk('t2'), mk('t3', { accountId: 'a2' })];

const setup = () =>
  render(
    <MemoryRouter>
      <TradePane trades={trades} isLoading={false} isError={false} onRetry={vi.fn()} presentation="docked" />
    </MemoryRouter>,
  );

describe('TradePane', () => {
  beforeEach(() => {
    readOnly = new Set();
    param.ids = null;
    param.stepTo.mockClear();
  });

  it('lets a writable trade be edited in place', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Edit strategy/ })).toBeInTheDocument();
  });

  it('shows the reason and no edit affordance for a trade of a read-only account', () => {
    readOnly = new Set(['a1']);
    setup();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('This account is read-only on Free');
    expect(screen.queryByRole('button', { name: /^Edit strategy/ })).toBeNull();
  });

  it('walks the cited list instead of the list on screen', async () => {
    param.ids = ['t2', 't3'];
    setup();
    expect(screen.getAllByText('1 of 2').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Previous trade' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next trade' }));
    expect(param.stepTo).toHaveBeenCalledWith('t3');
  });

  it('offers Duplicate, Copy link, Open in new tab and Delete in the more menu', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent?.trim())).toEqual(['Duplicate', 'Copy link', 'Open in new tab', 'Delete…']);
  });
});
