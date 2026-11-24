import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

let accounts: { id: string; name: string }[] = [];
let rulesGoals: { goals: unknown[]; rules: unknown[] } | undefined;
const createAccount = vi.fn();
const navigate = vi.fn();
const openNew = vi.fn();
const saveName = vi.fn();
let entCurrency = 'INR';
let accountsFailed = false;
let profile = { name: 'Ann', email: 'ann@example.com', hasName: true, isLoading: false, isSaving: false };

vi.mock('@/store/api/accountsApi', () => ({
  useGetAccountsQuery: () => (accountsFailed ? { data: undefined, isLoading: false, isError: true } : { data: { accounts }, isLoading: false, isError: false }),
  useCreateAccountMutation: () => [(a: unknown) => ({ unwrap: () => createAccount(a) }), { isLoading: false }],
}));
vi.mock('@/store/api/goalsRulesApi', () => ({ useGetRulesAndGoalsQuery: () => ({ data: rulesGoals }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ ...profile, saveName }) }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ currency: entCurrency, plan: 'trial', trialDaysLeft: 14 }) }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openNew }) }));
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual<object>('react-router-dom')), useNavigate: () => navigate }));

import { FirstRunPage } from '../FirstRunPage';
import { ActivationPanel } from '../ActivationPanel';
import { useGettingStarted, userSetItems } from '../useGettingStarted';
import { takePendingImportFile } from '../pendingImport';
import { importFlow } from '@/lib/importFlowStore';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  accounts = [];
  entCurrency = 'INR';
  rulesGoals = { goals: [], rules: [] };
  profile = { name: 'Ann', email: 'ann@example.com', hasName: true, isLoading: false, isSaving: false };
  [createAccount, navigate, openNew, saveName].forEach((m) => m.mockReset());
  importFlow.reset();
  takePendingImportFile();
});

describe('userSetItems', () => {
  const at = (s: string) => new Date(`2026-11-11T${s}Z`).toISOString();
  it('does not count the starter set the server created in one go', () => {
    expect(userSetItems([{ createdAt: at('10:00:00'), updatedAt: at('10:00:00') }, { createdAt: at('10:00:01'), updatedAt: at('10:00:01') }])).toBe(false);
  });
  it('counts a goal edited later or a rule added later', () => {
    expect(userSetItems([{ createdAt: at('10:00:00'), updatedAt: at('11:00:00') }])).toBe(true);
    expect(userSetItems([{ createdAt: at('10:00:00'), updatedAt: at('10:00:00') }, { createdAt: at('12:00:00'), updatedAt: at('12:00:00') }])).toBe(true);
    expect(userSetItems([])).toBe(false);
  });
});

describe('useGettingStarted', () => {
  it('derives the three steps from data', () => {
    const { result, rerender } = renderHook(({ n }) => useGettingStarted(n), { initialProps: { n: 0 } });
    expect(result.current).toMatchObject({ hasAccount: false, hasTrade: false, hasGoalOrRule: false, done: 0, total: 3, complete: false });
    accounts = [{ id: 'a1', name: 'FTMO' }];
    rerender({ n: 5 });
    expect(result.current).toMatchObject({ hasAccount: true, hasTrade: true, done: 2 });
  });

  it('is unknown, never "0 of 3", when the trades or the accounts failed to load (R-040)', () => {
    const { result, rerender } = renderHook(({ n }: { n: number | null }) => useGettingStarted(n), { initialProps: { n: null as number | null } });
    expect(result.current.unknown).toBe(true);
    rerender({ n: 21 });
    expect(result.current.unknown).toBe(false);
    accountsFailed = true;
    rerender({ n: 21 });
    expect(result.current.unknown).toBe(true);
    accountsFailed = false;
  });
});

describe('FirstRunPage', () => {
  it('lists three steps, step 2 waits for the account, and the page bar says step 1 of 3', () => {
    wrap(<FirstRunPage />);
    const steps = screen.getAllByRole('listitem').filter((li) => li.parentElement?.tagName === 'OL');
    expect(steps).toHaveLength(3);
    expect(screen.getByText(/Step 1 of 3, not done/)).toBeInTheDocument();
    expect(screen.getByText('Drop a file now and it is kept until step 1 is done.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a trade manually' })).toBeDisabled();
    expect(screen.getByText('Free trial: 14 days left. No card on file.')).toBeInTheDocument();
  });

  it('sits the Choose files button on the line of the sentence it starts (vertical-align middle, not the icon baseline)', () => {
    wrap(<FirstRunPage />);
    expect(screen.getByRole('button', { name: 'Choose files' })).toHaveClass('align-middle');
  });

  it('validates the account form inline', async () => {
    wrap(<FirstRunPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter an account name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the starting balance, 0 or more.')).toBeInTheDocument();
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('creates the account with the billing currency as default, announces it and moves focus to the drop zone', async () => {
    createAccount.mockResolvedValue({ id: 'a9', name: 'FTMO 100K' });
    wrap(<FirstRunPage />);
    await userEvent.type(screen.getByLabelText(/Name/), 'FTMO 100K');
    await userEvent.type(screen.getByLabelText(/Starting balance/), '100000.00');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(createAccount).toHaveBeenCalledWith({ name: 'FTMO 100K', broker: 'Other', type: 'personal', status: 'active', balance: 100000, initialBalance: 100000, currency: 'INR' });
    expect(await screen.findByText('Account created')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Choose files/ })).toHaveFocus());
  });

  it('keeps the currency the user picked when the billing currency resolves later', async () => {
    createAccount.mockResolvedValue({ id: 'a9', name: 'FTMO' });
    // jsdom lacks what Radix Select needs to open
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => undefined;
    Element.prototype.scrollIntoView ??= () => undefined;
    entCurrency = 'USD';
    const { rerender } = wrap(<FirstRunPage />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'EUR' }));
    entCurrency = 'INR';
    rerender(<MemoryRouter><FirstRunPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/Name/), 'FTMO');
    await userEvent.type(screen.getByLabelText(/Starting balance/), '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(createAccount).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR' }));
  });

  it('shows a creation error under the form', async () => {
    createAccount.mockRejectedValue({ status: 500, data: { message: 'Nope' } });
    wrap(<FirstRunPage />);
    await userEvent.type(screen.getByLabelText(/Name/), 'A');
    await userEvent.type(screen.getByLabelText(/Starting balance/), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nope');
  });

  it('a creation failure with no response reads as a connection problem; a body-less one keeps our sentence', async () => {
    createAccount.mockRejectedValueOnce({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' });
    wrap(<FirstRunPage />);
    await userEvent.type(screen.getByLabelText(/Name/), 'A');
    await userEvent.type(screen.getByLabelText(/Starting balance/), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/internet connection/i);
    createAccount.mockRejectedValueOnce({ status: 400 });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("Couldn't create the account."));
  });

  it('a file dropped before step 1 is kept and the form says so', () => {
    wrap(<FirstRunPage />);
    const file = new File(['a,b'], 'trades.csv', { type: 'text/csv' });
    fireEvent.drop(screen.getByRole('button', { name: /Choose files/ }).parentElement as HTMLElement, { dataTransfer: { files: [file] } });
    expect(screen.getByText('Create an account first — your file is kept.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('with an account, a dropped file goes to the import page with the account preselected and the file queued', () => {
    accounts = [{ id: 'a1', name: 'FTMO' }];
    wrap(<FirstRunPage tradeCount={0} />);
    expect(screen.getByText(/Step 2 of 3, not done/)).toBeInTheDocument();
    const file = new File(['a,b'], 'trades.csv', { type: 'text/csv' });
    fireEvent.drop(screen.getByRole('button', { name: /Choose files/ }).parentElement as HTMLElement, { dataTransfer: { files: [file] } });
    expect(navigate).toHaveBeenCalledWith('/app/import');
    expect(importFlow.get().accountId).toBe('a1');
    expect(takePendingImportFile()).toBe(file);
    expect(takePendingImportFile()).toBeNull();
  });

  it('Add a trade manually opens the new-trade pane once an account exists', async () => {
    accounts = [{ id: 'a1', name: 'FTMO' }];
    wrap(<FirstRunPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add a trade manually' }));
    expect(openNew).toHaveBeenCalled();
  });

  it('asks what to call the user when the name is only the email local part, and saves it', async () => {
    profile = { ...profile, name: 'ann' };
    saveName.mockResolvedValue(undefined);
    wrap(<FirstRunPage />);
    await userEvent.type(screen.getByLabelText('What should we call you?'), 'Ann Lee');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveName).toHaveBeenCalledWith('Ann Lee');
    await waitFor(() => expect(screen.queryByLabelText('What should we call you?')).toBeNull());
  });

  it('does not ask when the user already has a real name', () => {
    wrap(<FirstRunPage />);
    expect(screen.queryByLabelText('What should we call you?')).toBeNull();
  });
});

describe('ActivationPanel', () => {
  it('one sentence and three actions', async () => {
    wrap(<ActivationPanel />);
    expect(screen.getByText('No trades yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import a broker file' })).toHaveAttribute('href', '/app/import');
    expect(screen.getByRole('link', { name: 'Upload a screenshot' })).toHaveAttribute('href', '/app/import?source=screenshot');
    await userEvent.click(screen.getByRole('button', { name: 'Add a trade manually' }));
    expect(openNew).toHaveBeenCalled();
  });
  it('without an account the next step is creating one', () => {
    wrap(<ActivationPanel needsAccount />);
    expect(screen.getByRole('link', { name: 'Create your first trading account' })).toBeInTheDocument();
  });
});
