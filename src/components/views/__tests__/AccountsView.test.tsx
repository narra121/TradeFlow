import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { setSelectedAccount } from '@/store/slices/accountsSlice';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Trade, TradingAccount } from '@/types/trade';

const acc = (id: string, over: Partial<TradingAccount> = {}): TradingAccount =>
  ({ id, name: id, broker: 'B', type: 'personal', status: 'active', balance: 1000, initialBalance: 1000, currency: 'USD', createdAt: '', ...over }) as TradingAccount;

let query: { data?: { accounts: TradingAccount[] }; isLoading: boolean; isError: boolean; error?: unknown } = { isLoading: false, isError: false };
const refetch = vi.fn();
const createAccount = vi.fn();
const updateAccount = vi.fn();
const deleteAccount = vi.fn();
const updateStatus = vi.fn();
const unwrap = (v: unknown = {}) => ({ unwrap: () => Promise.resolve(v) });
vi.mock('@/store/api', async (orig) => ({
  ...(await orig<object>()),
  useGetAccountsQuery: () => ({ ...query, refetch }),
  useCreateAccountMutation: () => [createAccount, { isLoading: false }],
  useUpdateAccountMutation: () => [updateAccount, { isLoading: false }],
  useDeleteAccountMutation: () => [deleteAccount, { isLoading: false }],
  useUpdateAccountStatusMutation: () => [updateStatus, { isLoading: false }],
}));

let scopeTrades: Trade[] = [];
let truncated = false;
vi.mock('@/hooks/useScopeTrades', () => ({
  useScopeTrades: () => ({ trades: scopeTrades, isLoading: false, isError: false, isFetching: false, refetch: vi.fn(), truncated, params: {} }),
}));

let ent: { plan: string | null; can: (f: string) => boolean; writableAccountIds: string[] | null } = { plan: 'pro', can: () => true, writableAccountIds: null };
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ent }));
const emitPlanSignal = vi.fn();
vi.mock('@/lib/planErrors', async (orig) => ({ ...(await orig<object>()), emitPlanSignal: (s: unknown) => emitPlanSignal(s) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
vi.mock('@/components/billing/WritableAccounts', () => ({ WritableAccounts: () => <p>Choose the 2 accounts you keep adding trades to</p> }));

import { AccountsView } from '../AccountsView';
import { ChromeProvider } from '@/components/shell/chrome';
import { ScopeBar } from '@/components/shell/ScopeBar';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

function setup(path = '/app/accounts') {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <ChromeProvider>
            <ScopeBar scoped={false} isMobile={false} />
            <AccountsView />
          </ChromeProvider>
          <Where />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>,
  );
}

const ftmo = acc('FTMO 100K', { id: 'a1', balance: 101240, initialBalance: 100000, broker: 'FTMO', type: 'prop_challenge' });
const zerodha = acc('Zerodha F&O', { id: 'a2', currency: 'INR', balance: 482300, initialBalance: 500000, broker: 'Zerodha' });
const old = acc('Old challenge', { id: 'a3', status: 'breached', balance: 0, initialBalance: 10000 });
const tradeOf = (id: string, accountId: string): Trade => ({ id, accountId, symbol: 'X', exitDate: new Date().toISOString(), entryDate: new Date().toISOString() }) as Trade;

describe('AccountsView', () => {
  beforeEach(() => {
    query = { data: { accounts: [ftmo, zerodha, old] }, isLoading: false, isError: false };
    scopeTrades = [tradeOf('1', 'a1'), tradeOf('2', 'a1'), tradeOf('3', 'a2')];
    truncated = false;
    ent = { plan: 'pro', can: () => true, writableAccountIds: null };
    for (const f of [refetch, createAccount, updateAccount, deleteAccount, updateStatus, emitPlanSignal]) f.mockReset();
    for (const f of [createAccount, updateAccount, deleteAccount, updateStatus]) f.mockReturnValue(unwrap());
    store.dispatch(setSelectedAccount(null));
  });

  it('states the accounts in the page bar and groups them by status', () => {
    setup();
    expect(screen.getByRole('toolbar', { name: 'Data shown' })).toHaveTextContent('3 accounts · 2 active');
    expect(screen.getByRole('button', { name: /Active · 2/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Other · 1/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Breached 1')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Old challenge/ })).not.toBeInTheDocument();
  });

  it('shows the API message of a failed load; the connection message only without a response', () => {
    query = { isLoading: false, isError: true, error: { status: 503, data: { message: 'Accounts are being migrated.' } } };
    const { unmount } = setup();
    expect(screen.getByRole('alert')).toHaveTextContent('Accounts are being migrated.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    query = { isLoading: false, isError: true, error: { status: 'FETCH_ERROR' } };
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('unfolds Other and shows the status next to the name', async () => {
    setup();
    await userEvent.setup().click(screen.getByRole('button', { name: /Other · 1/ }));
    expect(screen.getByRole('row', { name: /Old challenge/ })).toHaveTextContent('Breached');
  });

  it('prints balance, net since start with a percentage, trades and last trade per account', () => {
    setup();
    const row = screen.getByRole('row', { name: /FTMO 100K/ });
    expect(row).toHaveTextContent('$101,240.00');
    expect(row).toHaveTextContent('+$1,240.00');
    expect(row).toHaveTextContent('+1.2%');
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(row).toHaveTextContent('today');
    expect(screen.getByRole('row', { name: /Zerodha/ })).toHaveTextContent('−₹17,700.00');
  });

  it('totals per currency and never adds dollars to rupees', () => {
    setup();
    const totals = screen.getByLabelText('Totals of active accounts');
    expect(totals).toHaveTextContent('USD$101,240.00(+$1,240.00)');
    expect(totals).toHaveTextContent('INR₹4,82,300.00(−₹17,700.00)');
    expect(totals.textContent).not.toMatch(/583,540/);
  });

  it('reads the trade counts as a lower bound when the loader is capped', () => {
    truncated = true;
    setup();
    expect(screen.getByRole('row', { name: /FTMO 100K/ })).toHaveTextContent('2+');
    expect(screen.getByText('Trade counts cover the newest 5,000 trades.')).toBeInTheDocument();
  });

  it('View journal sets the scope, opens the dashboard and offers Undo', async () => {
    setup();
    await userEvent.setup().click(screen.getByRole('button', { name: 'View journal for FTMO 100K' }));
    expect(store.getState().accounts.selectedAccountId).toBe('a1');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/dashboard');
    const { toast } = await import('sonner');
    expect(toast).toHaveBeenCalledWith('Showing FTMO 100K', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
  });

  it('opens the account pane from Add account and from Edit, with the id in the URL', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?account=new');
    expect(await screen.findByRole('heading', { name: 'New account' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close account' }));
    await user.click(screen.getByRole('button', { name: 'Actions for Zerodha F&O' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?account=a2');
    expect(await screen.findByRole('heading', { name: 'Edit Zerodha F&O' })).toBeInTheDocument();
  });

  it('still opens the pane for the old ?new=1 link', async () => {
    setup('/app/accounts?new=1');
    expect(await screen.findByRole('heading', { name: 'New account' })).toBeInTheDocument();
  });

  it('creates an account from the pane and closes it', async () => {
    const user = userEvent.setup();
    setup('/app/accounts?account=new');
    await user.type(await screen.findByLabelText(/^Name/), 'UI-test');
    await user.type(screen.getByLabelText(/^Broker/), 'B');
    await user.type(screen.getByLabelText(/^Starting balance/), '5000');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(createAccount).toHaveBeenCalledWith(expect.objectContaining({ name: 'UI-test', initialBalance: 5000, balance: 5000, currency: 'USD' }));
    await vi.waitFor(() => expect(screen.getByTestId('where')).not.toHaveTextContent('account=new'));
  });

  it('saving an edit never sends the cached balance, so a stale one cannot overwrite the live balance (X-007)', async () => {
    const user = userEvent.setup();
    setup('/app/accounts?account=a2');
    await screen.findByRole('heading', { name: 'Edit Zerodha F&O' });
    await user.clear(screen.getByLabelText(/^Name/));
    await user.type(screen.getByLabelText(/^Name/), 'Zerodha renamed');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(updateAccount).toHaveBeenCalledTimes(1);
    const { id, payload } = updateAccount.mock.calls[0][0];
    expect(id).toBe('a2');
    expect(payload).toMatchObject({ name: 'Zerodha renamed', initialBalance: 500000 });
    expect(JSON.parse(JSON.stringify(payload))).not.toHaveProperty('balance');
  });

  it('keeps the pane open and says what went wrong when the save fails', async () => {
    createAccount.mockReturnValue({ unwrap: () => Promise.reject({ status: 400, data: { message: 'Account name already exists' } }) });
    const user = userEvent.setup();
    setup('/app/accounts?account=new');
    await user.type(await screen.findByLabelText(/^Name/), 'Dup');
    await user.type(screen.getByLabelText(/^Broker/), 'B');
    await user.type(screen.getByLabelText(/^Starting balance/), '1');
    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Account name already exists');
    expect(screen.getByRole('heading', { name: 'New account' })).toBeInTheDocument();
  });

  it('asks before leaving a changed form: keep editing, discard or save', async () => {
    const user = userEvent.setup();
    setup('/app/accounts?account=new');
    await user.type(await screen.findByLabelText(/^Name/), 'Half done');
    await user.click(screen.getByRole('button', { name: 'Close account' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Save changes to this account?');
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }));
    await vi.waitFor(() => expect(screen.getByTestId('where')).not.toHaveTextContent('account=new'));
  });

  it('at the Free limit, Add account opens the upgrade dialog instead of the pane and the meter is in the page bar', async () => {
    ent = { plan: 'free', can: () => false, writableAccountIds: null };
    query = { data: { accounts: [ftmo, zerodha] }, isLoading: false, isError: false };
    setup();
    expect(screen.getByRole('toolbar', { name: 'Data shown' })).toHaveTextContent('2 of 2 on Free');
    expect(screen.getByRole('button', { name: 'Upgrade for unlimited accounts' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add account' }));
    expect(emitPlanSignal).toHaveBeenCalledWith(expect.objectContaining({ code: 'PLAN_REQUIRED', feature: 'unlimited_accounts', kind: 'mutation' }));
    expect(screen.getByTestId('where')).not.toHaveTextContent('account=new');
  });

  it('marks accounts read-only on Free after a trial with more than 2 accounts, all still visible', () => {
    ent = { plan: 'free', can: () => false, writableAccountIds: ['a1', 'a2'] };
    query = { data: { accounts: [ftmo, zerodha, acc('Third', { id: 'a4' })] }, isLoading: false, isError: false };
    setup();
    expect(screen.getByText('Choose the 2 accounts you keep adding trades to')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Third/ })).toHaveTextContent('Read-only on Free');
    expect(screen.getByRole('row', { name: /FTMO 100K/ })).not.toHaveTextContent('Read-only on Free');
  });

  it('changes status directly for Passed, and asks first for Breached', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for FTMO 100K' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Set status' }));
    expect(await screen.findByRole('menuitemradio', { name: /Active/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Passed/ }));
    expect(updateStatus).toHaveBeenCalledWith({ id: 'a1', status: 'passed' });

    await user.click(screen.getByRole('button', { name: 'Actions for FTMO 100K' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Set status' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /Breached/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Mark FTMO 100K as breached?');
    expect(updateStatus).toHaveBeenCalledTimes(1);
    await user.click(within(dialog).getByRole('button', { name: 'Mark breached' }));
    expect(updateStatus).toHaveBeenLastCalledWith({ id: 'a1', status: 'breached' });
  });

  it('deletes only after the name is typed, and names the trades that go with it', async () => {
    const user = userEvent.setup();
    store.dispatch(setSelectedAccount('a1'));
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for FTMO 100K' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('its 2 trades');
    const del = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(del).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/to confirm/), 'ftmo 100k');
    await user.click(del);
    expect(deleteAccount).toHaveBeenCalledWith('a1');
    await vi.waitFor(() => expect(store.getState().accounts.selectedAccountId).toBeNull());
  });

  it('returns focus to the row actions button after the delete dialog closes with Escape', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for Zerodha F&O' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Actions for Zerodha F&O' })).toHaveFocus());
  });

  it('offers Mark inactive instead from the delete dialog', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for Zerodha F&O' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Mark inactive instead' }));
    expect(updateStatus).toHaveBeenCalledWith({ id: 'a2', status: 'inactive' });
  });

  it('shows the find field only above 10 accounts', () => {
    const many = Array.from({ length: 11 }, (_, i) => acc(`Acc ${i}`, { id: `x${i}` }));
    query = { data: { accounts: many }, isLoading: false, isError: false };
    const { unmount } = setup();
    expect(screen.getByLabelText('Find account')).toBeInTheDocument();
    unmount();
    query = { data: { accounts: [ftmo] }, isLoading: false, isError: false };
    setup();
    expect(screen.queryByLabelText('Find account')).not.toBeInTheDocument();
  });

  it('sorts a group by a header and reports aria-sort', async () => {
    const user = userEvent.setup();
    setup();
    const header = screen.getByRole('columnheader', { name: /Balance/ });
    expect(header).toHaveAttribute('aria-sort', 'none');
    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    const rows = screen.getAllByRole('row').filter((r) => r.getAttribute('tabindex') === '0').map((r) => r.textContent);
    expect(rows[0]).toContain('Zerodha');
  });

  it('shows the first-run sentence when there are no accounts', () => {
    query = { data: { accounts: [] }, isLoading: false, isError: false };
    setup();
    expect(screen.getByText('Create your first trading account.')).toBeInTheDocument();
  });

  it('shows an error with Retry, and skeleton rows while loading', async () => {
    query = { isLoading: false, isError: true };
    const { unmount } = setup();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    unmount();
    query = { isLoading: true, isError: false };
    setup();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('has no ad slot, no combined balance tile and no status filter select', () => {
    setup();
    expect(screen.queryByLabelText('Filter by status')).not.toBeInTheDocument();
    expect(screen.queryByText(/Combined balance/i)).not.toBeInTheDocument();
  });
});
