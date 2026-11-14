import { createRef, forwardRef, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/types/trade';

const mk = (id: string): Trade =>
  ({ id, symbol: `SYM${id}`, direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1' }) as Trade;

const param = { trade: 't2', mode: 'edit', expanded: false, date: null, from: null, ids: null as string[] | null, stepTo: vi.fn(), setEdit: vi.fn(), setExpanded: vi.fn(), close: vi.fn(), openNew: vi.fn(), openTrade: vi.fn(), openEdit: vi.fn() };
const form = vi.hoisted(() => ({ submit: vi.fn() }));
const fetched = vi.hoisted(() => ({ current: { currentData: undefined as unknown, isFetching: false }, args: [] as unknown[][] }));

vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => param }));
vi.mock('@/hooks/useReadOnlyAccounts', () => ({ useReadOnlyAccounts: () => new Set<string>() }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({ useSavedOptions: () => ({ options: { strategies: [], sessions: [], marketConditions: [], mistakes: [], tags: [] }, addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn() }) }));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ readOnly: false }) }));
vi.mock('@/components/billing/useUpgrade', () => ({ useUpgrade: () => ({ upgrade: vi.fn(), manage: vi.fn(), busy: null, error: null, clearError: vi.fn() }) }));
vi.mock('@/store/api', () => ({
  useDeleteTradeMutation: () => [vi.fn(), { isLoading: false }],
  useBulkDeleteTradesMutation: () => [vi.fn()],
  useRestoreTradesMutation: () => [vi.fn()],
  useUpdateTradeMutation: () => [vi.fn()],
  useGetTradeQuery: (...args: unknown[]) => {
    fetched.args.push(args);
    return fetched.current;
  },
  useGetTradeDebriefQuery: () => ({ isLoading: true, isFetching: true, isError: false, refetch: vi.fn() }),
}));
// The form's own behaviour is tested in TradeForm*.test.tsx; here it is a dirty form whose submit result the test sets.
vi.mock('../TradeForm', () => ({
  TradeForm: forwardRef(function Stub(_props: unknown, ref) {
    useImperativeHandle(ref, () => ({ submit: form.submit, isDirty: () => true }));
    return <div>form</div>;
  }),
}));

import { TradePane, type TradePaneHandle } from '../TradePane';

const trades = [mk('t1'), mk('t2'), mk('t3')];

const setup = (list: Trade[] = trades, props: { walkIds?: string[] | null } = {}) => {
  const ref = createRef<TradePaneHandle>();
  render(
    <MemoryRouter>
      <TradePane ref={ref} trades={list} isLoading={false} isError={false} onRetry={vi.fn()} presentation="docked" {...props} />
    </MemoryRouter>,
  );
  return ref;
};

describe('the unsaved-changes dialog (FE-003, FE-016)', () => {
  beforeEach(() => {
    param.mode = 'edit';
    param.trade = 't2';
    param.ids = null;
    param.close.mockClear();
    param.stepTo.mockClear();
    form.submit.mockReset();
    fetched.current = { currentData: undefined, isFetching: false };
    fetched.args = [];
  });

  it('Save closes the pane only when the form saved', async () => {
    form.submit.mockResolvedValue(false);
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Close trade' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(form.submit).toHaveBeenCalledTimes(1);
    expect(param.close).not.toHaveBeenCalled();

    form.submit.mockResolvedValue(true);
    await userEvent.click(screen.getByRole('button', { name: 'Close trade' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(param.close).toHaveBeenCalledTimes(1));
  });

  it('Discard closes without saving', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Close trade' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(form.submit).not.toHaveBeenCalled();
    expect(param.close).toHaveBeenCalledTimes(1);
  });

  it('requestClose, which the overlay and phone sheets call on Esc or a backdrop click, asks first', async () => {
    const ref = setup();
    await vi.waitFor(() => expect(ref.current).not.toBeNull());
    act(() => ref.current!.requestClose());
    expect(await screen.findByText('Save changes to SYMt2?')).toBeInTheDocument();
    expect(param.close).not.toHaveBeenCalled();
  });
});

describe('a trade outside the scope list (FE-017)', () => {
  beforeEach(() => {
    param.mode = 'view';
    param.trade = 'old1';
    param.ids = null;
    param.stepTo.mockClear();
    fetched.current = { currentData: undefined, isFetching: false };
    fetched.args = [];
  });

  it('is fetched by id and shown instead of the "outside the current account or period" notice', () => {
    fetched.current = { currentData: { ...mk('old1'), symbol: 'OLDSYM' }, isFetching: false };
    setup();
    expect(fetched.args.at(-1)).toEqual(['old1', { skip: false }]);
    expect(screen.getByRole('heading', { name: /OLDSYM/ })).toBeInTheDocument();
    expect(screen.queryByText(/outside the current account/i)).toBeNull();
  });

  it('does not fetch a trade the list already holds', () => {
    param.trade = 't2';
    setup();
    expect(fetched.args.at(-1)).toEqual(['t2', { skip: true }]);
  });

  it('shows the notice when the fetch finds nothing', () => {
    setup();
    expect(screen.getByText(/outside the current account/i)).toBeInTheDocument();
  });

  it('Prev and Next walk the order the list screen reported, not the scope list', async () => {
    param.trade = 't2';
    setup(trades, { walkIds: ['t3', 't2', 't1'] });
    await userEvent.click(screen.getByRole('button', { name: 'Next trade' }));
    expect(param.stepTo).toHaveBeenCalledWith('t1');
    await userEvent.click(screen.getByRole('button', { name: 'Previous trade' }));
    expect(param.stepTo).toHaveBeenCalledWith('t3');
  });
});
