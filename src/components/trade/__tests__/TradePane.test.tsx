import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/types/trade';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';

const mk = (id: string, over: Partial<Trade> = {}): Trade =>
  ({ id, symbol: `SYM${id}`, direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1', ...over }) as Trade;

const param = { trade: 't2', mode: 'view', expanded: false, date: null, from: null, ids: null as string[] | null, stepTo: vi.fn(), setEdit: vi.fn(), setExpanded: vi.fn(), close: vi.fn(), openNew: vi.fn(), openTrade: vi.fn(), openEdit: vi.fn() };
let readOnly = new Set<string>();

vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => param }));
vi.mock('@/hooks/useReadOnlyAccounts', () => ({ useReadOnlyAccounts: () => readOnly }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({ useSavedOptions: () => ({ options: { strategies: [], sessions: [], marketConditions: [], mistakes: [], tags: [] }, addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn() }) }));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
let planReadOnly = false;
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ readOnly: planReadOnly }) }));
const upgrade = vi.hoisted(() => vi.fn());
vi.mock('@/components/billing/useUpgrade', () => ({ useUpgrade: () => ({ upgrade, manage: vi.fn(), busy: null, error: null, clearError: vi.fn() }) }));
const api = vi.hoisted(() => ({ update: vi.fn(), debrief: vi.fn() }));
vi.mock('@/store/api', () => ({ useDeleteTradeMutation: () => [vi.fn(), { isLoading: false }], useBulkDeleteTradesMutation: () => [vi.fn()], useRestoreTradesMutation: () => [vi.fn()], useUpdateTradeMutation: () => [api.update], useGetTradeQuery: () => ({ currentData: undefined, isFetching: false }), useGetTradeDebriefQuery: (id: string) => api.debrief(id) }));

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
    planReadOnly = false;
    param.mode = 'view';
    upgrade.mockReset();
    param.ids = null;
    param.stepTo.mockClear();
    trades[1] = mk('t2');
    api.update.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
    api.debrief.mockReset().mockReturnValue({ isLoading: true, isFetching: true, isError: false, refetch: vi.fn() });
  });

  it('saves Reviewed · followed plan with the account and P&L kept, and shows the debrief of this trade', async () => {
    setup();
    const toggle = screen.getByRole('switch', { name: 'Reviewed · followed plan' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(api.update).toHaveBeenCalledWith({ id: 't2', payload: { reviewed: true, accountIds: ['a1'], pnl: 10 } });
    expect(api.debrief).toHaveBeenCalledWith('t2');
    expect(screen.getByRole('heading', { name: 'Debrief' })).toBeInTheDocument();
  });

  it('shows a reviewed trade switched on, and a read-only one cannot be changed', () => {
    trades[1] = mk('t2', { reviewed: true });
    readOnly = new Set(['a1']);
    setup();
    const toggle = screen.getByRole('switch', { name: 'Reviewed · followed plan' });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
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
    // The debrief's loading state is a status too, so the reason's status is found through its text.
    expect(screen.getByText(/Your journal is read-only\. Upgrade to Pro/).closest('[role="status"]')).toHaveTextContent('Your journal is read-only. Upgrade to Pro to add, edit or delete.');
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

  it('offers a new trade from this one and Delete in the more menu', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent?.trim())).toEqual([
      'New trade from this oneSame account, symbol, size, stop and target',
      'Delete…',
    ]);
  });
  describe('after the trial (read-only plan)', () => {
    it('Edit stays a live button that opens the upgrade dialog, and the note offers Upgrade to Pro', async () => {
      planReadOnly = true;
      const seen = vi.fn();
      window.addEventListener(PLAN_SIGNAL_EVENT, (e) => seen((e as CustomEvent).detail.code), { once: true });
      setup();
      const edit = screen.getByRole('button', { name: 'Edit' });
      expect(edit).toBeEnabled();
      await userEvent.click(edit);
      expect(seen).toHaveBeenCalledWith('TRIAL_EXPIRED');
      expect(param.setEdit).not.toHaveBeenCalled();
      expect(screen.getByText(/Your journal is read-only\. Upgrade to Pro/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Upgrade to Pro' })).toHaveAttribute('href', '/app/settings/billing');
      expect(screen.getByRole('switch', { name: 'Reviewed · followed plan' })).toBeDisabled();
    });

    it('Add trade opens the upgrade dialog and closes the pane, like every other blocked write', () => {
      planReadOnly = true;
      param.mode = 'new';
      const seen = vi.fn();
      window.addEventListener(PLAN_SIGNAL_EVENT, (e) => seen((e as CustomEvent).detail.code), { once: true });
      setup();
      expect(seen).toHaveBeenCalledWith('TRIAL_EXPIRED');
      expect(param.close).toHaveBeenCalled();
      expect(screen.queryByRole('form')).toBeNull();
    });
  });
});
