import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Trade } from '@/types/trade';

const usd = { id: 'usd', name: 'FTMO 100K', currency: 'USD', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 100000, createdAt: '' };
const inr = { id: 'inr', name: 'Zerodha', currency: 'INR', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 500000, createdAt: '' };

const setSelectedAccountId = vi.fn();
let accountState: { accounts: unknown[]; selectedAccount: unknown; isLoading: boolean } = { accounts: [usd, inr], selectedAccount: null, isLoading: false };
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ ...accountState, selectedAccountId: (accountState.selectedAccount as { id?: string } | null)?.id ?? null, setSelectedAccountId }),
}));

let scopeTrades: Trade[] = [];
vi.mock('@/hooks/useScopeTrades', () => ({
  useScopeTrades: () => ({ trades: scopeTrades, isLoading: false, isError: false, isFetching: false, refetch: vi.fn(), truncated: false, params: {} }),
}));
vi.mock('@/components/goals/useGoalHistory', () => ({
  useGoalHistory: () => ({ strips: { profit: [], winRate: [], maxDrawdown: [], maxTrades: [] }, loading: false, failed: false, loaded: 8 }),
}));

const progressArgs = vi.fn();
let progress: { data?: unknown; isLoading: boolean; isError: boolean } = { isLoading: false, isError: false };
let rulesGoals: { data?: unknown; isLoading: boolean; isError: boolean } = { isLoading: false, isError: false };
let allRules: { data?: unknown; isLoading: boolean; isError: boolean } = { data: [], isLoading: false, isError: false };
const refetch = vi.fn();
const createGoal = vi.fn();
const updateGoal = vi.fn();
const createRule = vi.fn();
const updateRule = vi.fn();
const deleteRule = vi.fn();
const unwrap = (v: unknown) => ({ unwrap: () => Promise.resolve(v) });

vi.mock('@/store/api/goalsRulesApi', () => ({
  useGetGoalsProgressQuery: (args: unknown) => (progressArgs(args), { ...progress, refetch }),
  useGetRulesAndGoalsQuery: () => ({ ...rulesGoals, refetch }),
  useGetRulesQuery: () => ({ ...allRules, refetch }),
  useCreateGoalMutation: () => [createGoal],
  useUpdateGoalMutation: () => [updateGoal],
  useCreateRuleMutation: () => [createRule],
  useUpdateRuleMutation: () => [updateRule],
  useDeleteRuleMutation: () => [deleteRule],
}));

import { GoalsView } from '../GoalsView';
import { ChromeProvider } from '@/components/shell/chrome';
import { ScopeBar } from '@/components/shell/ScopeBar';

const gp = {
  goalProgress: {
    profit: { current: 380, target: 0, progress: 0, achieved: false },
    winRate: { current: 58.3, target: 0, progress: 0, achieved: false },
    maxDrawdown: { current: 1.2, target: 0, progress: 0, achieved: false },
    tradeCount: { current: 5, target: 0, progress: 0, achieved: false },
  },
  ruleCompliance: {},
  goals: [],
  rules: [],
};
const realGoal = { goalId: 'g1', goalType: 'profit', period: 'weekly', target: 600, accountId: 'usd' };
const rule = (id: string, text: string) => ({ ruleId: `week#2026-11-09#${id}`, rule: text, userId: 'u', completed: false, isActive: true, createdAt: '', updatedAt: '' });

function Where() {
  return <p data-testid="search">{useLocation().search}</p>;
}

function setup(path = '/app/goals') {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <ChromeProvider>
            <ScopeBar scoped isMobile={false} />
            <GoalsView />
          </ChromeProvider>
          <Where />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>,
  );
}

describe('GoalsView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 11, 12));
    accountState = { accounts: [usd, inr], selectedAccount: usd, isLoading: false };
    progress = { data: gp, isLoading: false, isError: false };
    rulesGoals = { data: { goals: [realGoal], rules: [rule('a', 'Risk at most 1% per trade')] }, isLoading: false, isError: false };
    allRules = { data: [rule('a', 'Risk at most 1% per trade')], isLoading: false, isError: false };
    scopeTrades = [];
    for (const f of [progressArgs, refetch, createGoal, updateGoal, createRule, updateRule, deleteRule, setSelectedAccountId]) f.mockReset();
    for (const f of [createGoal, updateGoal, createRule, updateRule]) f.mockReturnValue(unwrap({}));
    deleteRule.mockReturnValue(unwrap({}));
  });
  afterEach(() => vi.useRealTimers());

  it('asks for an account when the accounts use different currencies', async () => {
    accountState = { accounts: [usd, inr], selectedAccount: null, isLoading: false };
    setup();
    expect(screen.getByText(/Goals are tracked per account/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Zerodha · INR' }));
    expect(setSelectedAccountId).toHaveBeenCalledWith('inr');
  });

  it('draws four goal tracks for one account, the first from the user’s own goal, the rest as defaults', () => {
    setup();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
    expect(screen.getByRole('progressbar', { name: 'Profit target' })).toHaveAttribute('aria-valuetext', expect.stringContaining('$380.00 of $600.00'));
    expect(screen.getAllByText('Default — set your own')).toHaveLength(3);
  });

  it('keys the request by the derived period and flags only the current one as current', () => {
    setup();
    expect(progressArgs).toHaveBeenLastCalledWith(expect.objectContaining({ periodKey: 'week#2026-11-09', currentPeriod: true, startDate: '2026-11-09', endDate: '2026-11-15', period: 'weekly', totalCapital: 100000, accountId: 'usd' }));
  });

  it('never sends a past period key with the current flag', () => {
    setup('/app/goals?on=2026-11-02');
    expect(progressArgs).toHaveBeenLastCalledWith(expect.objectContaining({ periodKey: 'week#2026-11-02', currentPeriod: false }));
    for (const [args] of progressArgs.mock.calls) expect(args.currentPeriod && args.periodKey !== 'week#2026-11-09').toBe(false);
  });

  it('is read-only in a past period', () => {
    setup('/app/goals?on=2026-11-02');
    expect(screen.getByText('Past period — read-only.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add rule' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeEnabled();
  });

  it('keeps Next disabled on the current period and steps with the arrows', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByTestId('search')).toHaveTextContent('on=2026-11-02');
    expect(screen.getByText('2 – 8 Nov 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'This week' }));
    expect(screen.getByTestId('search')).not.toHaveTextContent('on=');
  });

  it('opens the add-rule row prefilled and selected from ?addRule=, and drops the parameter', async () => {
    setup('/app/goals?addRule=Stop%20after%20%E2%88%922%25%20day');
    const input = await screen.findByLabelText('New rule');
    expect(input).toHaveValue('Stop after −2% day');
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe('Stop after −2% day'.length);
    expect(screen.getByTestId('search')).not.toHaveTextContent('addRule');
    await userEvent.setup().keyboard('{Enter}');
    expect(createRule).toHaveBeenCalledWith({ rule: 'Stop after −2% day', periodKey: 'week#2026-11-09' });
  });

  it('opens the add-rule row in a mixed-currency scope too, since rules are not per currency', async () => {
    accountState = { accounts: [usd, inr], selectedAccount: null, isLoading: false };
    setup('/app/goals?addRule=Wait%20for%20the%20retest');
    expect(await screen.findByLabelText('New rule')).toHaveValue('Wait for the retest');
  });

  it('shows the rules on the canvas under a section label, not in a bordered panel', () => {
    setup();
    const section = screen.getByRole('region', { name: 'Rules' });
    expect(section.className).not.toMatch(/border/);
  });

  it('steps back with , and ignores . on the current period', async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard('.');
    expect(screen.getByTestId('search')).not.toHaveTextContent('on=');
    await user.keyboard(',');
    expect(screen.getByTestId('search')).toHaveTextContent('on=2026-11-02');
    await user.keyboard('.');
    expect(screen.getByTestId('search')).not.toHaveTextContent('on=');
  });

  it('switches between week and month in the scope bar', async () => {
    setup();
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Month' }));
    expect(screen.getByTestId('search')).toHaveTextContent('period=month');
    expect(progressArgs).toHaveBeenLastCalledWith(expect.objectContaining({ periodKey: 'month#2026-11', period: 'monthly' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
  });

  it('shows an error with Retry, never default targets with zero progress', async () => {
    progress = { isLoading: false, isError: true };
    setup();
    expect(screen.getByText('Couldn’t load your goals.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it('shows skeletons while loading', () => {
    progress = { isLoading: true, isError: false };
    rulesGoals = { isLoading: true, isError: false };
    setup();
    expect(document.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it('saves a goal that exists with an update and a default with a create carrying the period key', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Edit Profit target' }));
    await user.clear(screen.getByRole('textbox', { name: 'Profit target' }));
    await user.type(screen.getByRole('textbox', { name: 'Profit target' }), '700{Enter}');
    expect(updateGoal).toHaveBeenCalledWith({ id: 'g1', payload: { target: 700 } });
    await user.click(screen.getByRole('button', { name: 'Edit Win rate' }));
    await user.clear(screen.getByRole('textbox', { name: 'Win rate' }));
    await user.type(screen.getByRole('textbox', { name: 'Win rate' }), '60{Enter}');
    expect(createGoal).toHaveBeenCalledWith({ accountId: 'usd', goalType: 'winRate', period: 'weekly', target: 60, periodKey: 'week#2026-11-09' });
  });

  it('adds a rule from the scope bar into the current period', async () => {
    const user = userEvent.setup();
    setup();
    const bar = screen.getByRole('toolbar', { name: 'Data shown' });
    await user.click(within(bar).getByRole('button', { name: 'Add rule' }));
    await user.type(screen.getByLabelText('New rule'), 'Stop after −2% day{Enter}');
    expect(createRule).toHaveBeenCalledWith({ rule: 'Stop after −2% day', periodKey: 'week#2026-11-09' });
  });

  it('lists the period’s rules with their breaks and the compliance line', () => {
    scopeTrades = [
      { id: 't1', symbol: 'A', pnl: -48, entryDate: '2026-11-10T10:00:00', exitDate: '2026-11-10T11:00:00', accountId: 'usd', brokenRuleIds: ['week#2026-11-09#a'] } as Trade,
      { id: 't2', symbol: 'B', pnl: 20, entryDate: '2026-11-11T10:00:00', exitDate: '2026-11-11T11:00:00', accountId: 'usd', brokenRuleIds: [] } as Trade,
    ];
    setup();
    expect(screen.getByText('Followed on 1 of 2 trades this week (50%)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Broken 1 times this week/ })).toBeInTheDocument();
    expect(screen.getByText('−$48.00')).toBeInTheDocument();
  });

  it('offers the starter rules when the user has none and copies a rule from the monthly period', async () => {
    rulesGoals = { data: { goals: [], rules: [] }, isLoading: false, isError: false };
    allRules = { data: [], isLoading: false, isError: false };
    setup();
    expect(screen.getByText(/These are starter rules/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add rule: Review trades weekly' }));
    expect(createRule).toHaveBeenCalledWith({ rule: 'Review trades weekly', periodKey: 'week#2026-11-09' });
  });

  it('says why a rule in use cannot be deleted', async () => {
    deleteRule.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { errorCode: 'RULE_IN_USE', message: 'in use' } }) });
    scopeTrades = [{ id: 't1', symbol: 'A', pnl: -48, entryDate: '2026-11-10T10:00:00', exitDate: '2026-11-10T11:00:00', accountId: 'usd', brokenRuleIds: ['week#2026-11-09#a'] } as Trade];
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Actions for rule: Risk at most 1% per trade' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('Used by 1 trade this week — cannot be deleted')).toBeInTheDocument();
  });

  it('is read-only while offline: no edit buttons, no Add rule', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    setup();
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add rule' })).not.toBeInTheDocument();
    expect(screen.queryByText('Past period — read-only.')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('has no unnamed buttons', () => {
    setup();
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAccessibleName();
  });
});
