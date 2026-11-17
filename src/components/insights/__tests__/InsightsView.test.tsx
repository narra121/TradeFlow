import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import tradesReducer from '@/store/slices/tradesSlice';
import { ChromeProvider, ScopeBarTargets } from '@/components/shell/chrome';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';
import type { Insight } from '@/types/insights';
import { InsightsView } from '../InsightsView';

const call = (value: unknown, fail = false) => ({ unwrap: () => (fail ? Promise.reject(value) : Promise.resolve(value)), abort: vi.fn() });
const generate = vi.fn();
let readOnly = false;
const openTrade = vi.fn();
let insights: Insight[] = [];
let usage = { used: 4, limit: 30 as number | null };
let mobile = false;
let listFailure: unknown;
let nextCursor: string | null = null;
const loadPage = vi.fn();
let accountsState: { accounts: { id: string; name: string; currency: string; status?: string }[]; selectedAccountId: string | null } = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }], selectedAccountId: 'a1' };
const setSelectedAccountId = vi.fn();

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openTrade }) }));
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ ...accountsState, setSelectedAccountId }) }));
vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: () => ({ usage: readOnly ? [] : [{ feature: 'ai_insight', ...usage }], readOnly, periodResetsAt: '2026-12-01T00:00:00.000Z' }),
}));
vi.mock('@/store/api/insightsApi', () => ({
  useListInsightsQuery: () => ({ data: { insights, nextCursor }, isLoading: false, isError: !!listFailure, error: listFailure, refetch: vi.fn() }),
  useLazyListInsightsQuery: () => [loadPage, { isFetching: false }],
  useGenerateInsightMutation: () => [generate, { isLoading: false }],
  useGetInsightSettingsQuery: () => ({ data: { useNotes: false }, isLoading: false, isError: false, refetch: vi.fn() }),
  useSetInsightSettingsMutation: () => [vi.fn(), { isLoading: false }],
  useSendInsightFeedbackMutation: () => [vi.fn()],
  useSetFocusMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@/store/api/analysisApi', () => ({ useGetFocusRuleQuery: () => ({ data: null }) }));
vi.mock('@/lib/analytics', () => ({ trackAiInsightGenerated: vi.fn() }));
let scopeTrades: number | undefined;
let lastScopeTrades: number | undefined;
vi.mock('@/store/api/statsApi', () => ({
  useGetStatsQuery: () => {
    const own = scopeTrades === undefined ? undefined : { totalTrades: scopeTrades };
    // RTK while a new scope loads: `data` still holds the last scope's answer, `currentData` is empty.
    return { data: own ?? (lastScopeTrades === undefined ? undefined : { totalTrades: lastScopeTrades }), currentData: own };
  },
}));

const insight = (p: Partial<Insight> = {}): Insight => ({
  id: 'i1',
  createdAt: '2026-11-02T10:00:00.000Z',
  period: { from: '2026-10-01', to: '2026-10-31' },
  accountId: 'a1',
  summary: 'You made money on breakouts and gave a third back after 20:00.',
  model: 'm',
  tradeCount: 68,
  sections: [
    { kind: 'action', title: 'Pause after a loss', body: 'Wait 15 minutes.' },
    { kind: 'strength', title: 'Breakouts in London', body: 'Good.', metric: { label: 'Net P&L', value: 1240, unit: 'currency', display: '1,240.00' }, tradeIds: ['t1', 't2'] },
    { kind: 'leak', title: 'Trades after 20:00 lose', body: 'Most followed a loss.', metric: { label: 'Net P&L', value: -540, unit: 'currency', display: '-540.00' }, tradeIds: ['t3', 't4', 't5'] },
  ],
  ...p,
});

/** Stands in for the shell's scope bar, which hosts the page's Generate control. */
function ScopeBarHost() {
  const targets = ScopeBarTargets();
  return <div ref={targets.right} data-testid="scope-right" />;
}

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

const renderView = (route = '/app/insights') => {
  const store = configureStore({ reducer: { trades: tradesReducer } });
  return render(
    <Provider store={store}>
      <ChromeProvider>
        <MemoryRouter initialEntries={[route]}>
          <ScopeBarHost />
          <Routes>
            <Route path="/app/insights" element={<><InsightsView /><Where /></>} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ChromeProvider>
    </Provider>,
  );
};

beforeEach(() => {
  scopeTrades = undefined;
  lastScopeTrades = undefined;
  readOnly = false;
  generate.mockReset();
  loadPage.mockReset();
  nextCursor = null;
  openTrade.mockReset();
  insights = [insight()];
  usage = { used: 4, limit: 30 };
  mobile = false;
  listFailure = undefined;
  accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }], selectedAccountId: 'a1' };
  setSelectedAccountId.mockReset();
});

describe('InsightsView report', () => {
  it('shows the newest report: title with account, basis line, summary and findings by money impact with actions last', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'October 2026 · FTMO 100K' })).toBeInTheDocument();
    expect(screen.getByText(/68 trades · 1 Oct 2026 – 31 Oct 2026/)).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Breakouts in London', 'Trades after 20:00 lose', 'Pause after a loss']);
    expect(screen.getByText('Leak')).toBeInTheDocument();
    expect(screen.getByText(/How this is calculated/)).toBeInTheDocument();
  });

  it('View n trades opens the first cited trade with the whole cited list to step through; Make this a rule is offered on leaks only and goes to Goals with the wording', async () => {
    renderView();
    await userEvent.click(screen.getByRole('button', { name: 'View 3 trades' }));
    expect(openTrade).toHaveBeenCalledWith('t3', { ids: ['t3', 't4', 't5'] });
    expect(screen.getAllByRole('button', { name: 'Make this a rule' })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Make this a rule' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/app/goals?addRule=Avoid%20this%3A%20trades%20after%2020%3A00%20lose');
  });

  it('Discuss in chat links to the chat with this report attached', () => {
    renderView();
    expect(screen.getByRole('link', { name: 'Discuss in chat' })).toHaveAttribute('href', '/app/chat?insight=i1');
  });

  it('lists the history with period, date, account and trade count', () => {
    insights = [insight(), insight({ id: 'i2', period: { from: '2026-09-01', to: '2026-09-30' }, accountId: null, tradeCount: 41 })];
    renderView();
    const nav = screen.getByRole('navigation', { name: 'Reports' });
    expect(nav).toHaveTextContent('September 2026');
    expect(nav).toHaveTextContent('All accounts · 41 trades');
  });

  it('a report built from a truncated trade load says it covers the oldest trades only', () => {
    insights = [insight({ truncated: true, tradeCount: 5000 })];
    renderView();
    expect(screen.getByText(/Based on the oldest 5000 trades of the period/)).toBeInTheDocument();
  });

  it('a complete report carries no such note', () => {
    renderView();
    expect(screen.queryByText(/Based on the oldest/)).toBeNull();
  });

  it('offers Load more only while the API has a next page, and appends the older reports', async () => {
    renderView();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    cleanup();
    nextCursor = 'c1';
    loadPage.mockReturnValue(call({ insights: [insight({ id: 'old', period: { from: '2025-01-01', to: '2025-01-31' } })], nextCursor: null }));
    renderView();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadPage).toHaveBeenCalledWith({ limit: 50, cursor: 'c1' });
    expect(await screen.findByText('January 2025')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('an account without a currency does not make an All-accounts report look mixed', () => {
    insights = [insight({ accountId: null })];
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a2', name: 'Paper', currency: '' }], selectedAccountId: 'a1' };
    renderView();
    expect(screen.queryByText(/Figures mix currencies/)).toBeNull();
  });

  it('with no reports explains what a report needs and offers the first one', () => {
    insights = [];
    renderView();
    expect(screen.getByRole('heading', { name: 'Generate your first report' })).toBeInTheDocument();
    expect(screen.getByText(/at least 5 closed trades/)).toBeInTheDocument();
  });
});

describe('InsightsView generating', () => {
  const generateButton = () => screen.getAllByRole('button').find((b) => /^Generate report/.test(b.textContent ?? ''))!;

  it('generates for the scope in the bar and selects the new report', async () => {
    insights = [];
    generate.mockReturnValue(call(insight({ id: 'new' })));
    renderView();
    await userEvent.click(generateButton());
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'a1', from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/app/insights?id=new'));
    expect(screen.getByText('Report ready')).toBeInTheDocument();
  });

  it('states the cost when one report is left', () => {
    usage = { used: 29, limit: 30 };
    renderView();
    expect(generateButton()).toHaveTextContent('Generate report — uses your last report this month');
  });

  it('after the trial Generate opens the upgrade dialog (TRIAL_EXPIRED) and makes no request', async () => {
    readOnly = true;
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    renderView();
    await userEvent.click(generateButton());
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ code: 'TRIAL_EXPIRED' });
    expect(generate).not.toHaveBeenCalled();
  });

  it('at the limit Generate opens the upgrade dialog and makes no request', async () => {
    usage = { used: 30, limit: 30 };
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    renderView();
    await userEvent.click(generateButton());
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it('too few trades names the minimum and the count', async () => {
    generate.mockReturnValue(call({ status: 422, data: { errorMessage: 'At least 5 closed trades are needed for an insight; this period has 3.' } }, true));
    renderView();
    await userEvent.click(generateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('A report needs at least 5 closed trades in the period — this scope has 3.');
  });

  it('shows the API message of a failed attempt, and the connection message only without a response', async () => {
    generate.mockReturnValueOnce(call({ status: 500, data: { errorCode: 'INTERNAL_ERROR', message: 'The report service is busy.' } }, true));
    const { unmount } = renderView();
    await userEvent.click(generateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('The report service is busy.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    unmount();
    generate.mockReturnValueOnce(call({ status: 'FETCH_ERROR', data: 'x' }, true));
    renderView();
    await userEvent.click(generateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('shows the API message when the report list fails to load', () => {
    insights = [];
    listFailure = { status: 500, data: { message: 'Your reports are being restored.' } };
    renderView();
    expect(screen.getByRole('alert')).toHaveTextContent('Your reports are being restored.');
    // An outage is not "no reports".
    expect(screen.queryByText('No reports yet.')).not.toBeInTheDocument();
  });

  it('on a phone a failed report list shows the error too, never "No reports yet."', () => {
    mobile = true;
    insights = [];
    listFailure = { status: 500, data: { message: 'Your reports are being restored.' } };
    renderView();
    expect(screen.getByRole('alert')).toHaveTextContent('Your reports are being restored.');
    expect(screen.queryByText('No reports yet.')).not.toBeInTheDocument();
  });

  it('a failed attempt shows Retry and the report list stays', async () => {
    generate.mockReturnValueOnce(call({ status: 500 }, true));
    renderView();
    await userEvent.click(generateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t generate the report');
    generate.mockReturnValueOnce(call(insight({ id: 'again' })));
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});

describe('InsightsView opened by a link', () => {
  it('shows the report’s own account in the scope bar once (R-047), and leaves the scope alone when browsing', async () => {
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a2', name: 'Zerodha F&O', currency: 'INR' }], selectedAccountId: null };
    insights = [insight(), insight({ id: 'i2', accountId: 'a2' })];
    renderView('/app/insights?id=i2');
    expect(setSelectedAccountId).toHaveBeenCalledTimes(1);
    expect(setSelectedAccountId).toHaveBeenCalledWith('a2');
    await userEvent.click(screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') !== 'true' && /trades/.test(b.textContent ?? ''))!);
    expect(setSelectedAccountId).toHaveBeenCalledTimes(1);
  });
});

describe('InsightsView opened by a link before the accounts load', () => {
  it('applies the report’s account once the account list arrives (R-047 on dev: accounts answered after the reports)', () => {
    accountsState = { accounts: [], selectedAccountId: null };
    insights = [insight(), insight({ id: 'i2', accountId: 'a2' })];
    const store = configureStore({ reducer: { trades: tradesReducer } });
    const tree = () => (
      <Provider store={store}>
        <ChromeProvider>
          <MemoryRouter initialEntries={['/app/insights?id=i2']}>
            <ScopeBarHost />
            <InsightsView />
          </MemoryRouter>
        </ChromeProvider>
      </Provider>
    );
    const view = render(tree());
    expect(setSelectedAccountId).not.toHaveBeenCalled();
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a2', name: 'Zerodha F&O', currency: 'INR' }], selectedAccountId: null };
    view.rerender(tree());
    expect(setSelectedAccountId).toHaveBeenCalledTimes(1);
    expect(setSelectedAccountId).toHaveBeenCalledWith('a2');
  });
});

describe('InsightsView with too few trades', () => {
  it('disables every Generate button and says why when the scope has under 5 trades (the request could only fail)', () => {
    insights = [];
    scopeTrades = 0;
    renderView();
    const buttons = screen.getAllByRole('button').filter((b) => /^Generate report/.test(b.textContent ?? ''));
    expect(buttons.length).toBe(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByText('A report needs at least 5 closed trades; this scope has 0 trades.')).toBeInTheDocument();
    expect(generate).not.toHaveBeenCalled();
  });

  it('while a new scope loads it shows nothing of the last scope\'s count', () => {
    insights = [];
    lastScopeTrades = 2;
    renderView();
    expect(screen.queryByText(/this scope has 2 trades/)).not.toBeInTheDocument();
  });

  it('keeps Generate enabled from 5 trades', () => {
    insights = [];
    scopeTrades = 5;
    renderView();
    screen.getAllByRole('button').filter((b) => /^Generate report/.test(b.textContent ?? '')).forEach((b) => expect(b).toBeEnabled());
  });
});

describe('InsightsView on a phone', () => {
  it('shows the list first, then the report behind a back button', async () => {
    mobile = true;
    renderView();
    expect(screen.queryByRole('article')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /October 2026/ }));
    expect(screen.getByRole('article', { name: 'Report' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reports' }));
    expect(screen.queryByRole('article')).toBeNull();
  });
});

describe('InsightsView mixed currencies', () => {
  const generateButton = () => screen.getAllByRole('button').find((b) => /^Generate report/.test(b.textContent ?? ''))!;
  const mixedScope = () => {
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a2', name: 'Zerodha F&O', currency: 'INR' }], selectedAccountId: null };
  };

  it('with accounts in two currencies and no account chosen, Generate is disabled and the reason and an account picker are shown', async () => {
    mixedScope();
    insights = [];
    renderView();
    expect(generateButton()).toBeDisabled();
    expect(screen.getByText('Reports are per currency — choose an account')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Reports are per currency — choose an account' }));
    await userEvent.click(screen.getByRole('option', { name: /Zerodha F&O.*INR/ }));
    expect(setSelectedAccountId).toHaveBeenCalledWith('a2');
    expect(generate).not.toHaveBeenCalled();
  });

  it('an existing all-accounts report is labelled as mixing currencies; a one-account report is not', () => {
    mixedScope();
    insights = [insight({ accountId: null })];
    const { unmount } = renderView();
    expect(screen.getByText('Figures mix currencies — regenerate for one account.')).toBeInTheDocument();
    unmount();
    insights = [insight({ accountId: 'a1' })];
    renderView();
    expect(screen.queryByText(/Figures mix currencies/)).toBeNull();
  });

  it('with one currency across all accounts a report can be generated without choosing', () => {
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a3', name: 'Topstep', currency: 'USD' }], selectedAccountId: null };
    renderView();
    expect(generateButton()).toBeEnabled();
    expect(screen.queryByText(/Reports are per currency/)).toBeNull();
  });

  it('prints negative figures with a true minus', () => {
    insights = [insight({ summary: 'A net loss of -55,679.06 over 68 trades.', sections: [{ kind: 'leak', title: 'T', body: 'Lost -51,168.93 on Fridays.', metric: { label: 'Net P&L', value: -51168.93, unit: 'percent', display: '-51,168.93' } }] })];
    renderView();
    expect(screen.getByText(/A net loss of −55,679\.06/)).toBeInTheDocument();
    expect(screen.getByText(/Lost −51,168\.93 on Fridays/)).toBeInTheDocument();
    expect(screen.getByText('−51,168.93')).toBeInTheDocument();
  });
});

describe('InsightsView period sent to the API', () => {
  const generateButton = () => screen.getAllByRole('button').find((b) => /^Generate report/.test(b.textContent ?? ''))!;

  it('the default All time period is sent as its last 366 days and the button says so', async () => {
    generate.mockReturnValue(call(insight({ id: 'new' })));
    renderView();
    expect(generateButton()).toHaveTextContent('Generate report for the last 12 months');
    await userEvent.click(generateButton());
    const arg = generate.mock.calls[0][0] as { from: string; to: string };
    expect(Math.round((new Date(arg.to).getTime() - new Date(arg.from).getTime()) / 86_400_000) + 1).toBe(366);
  });

  it('all accounts in two currencies answered with MIXED_CURRENCY: the message, that nothing was charged, and an account picker', async () => {
    accountsState = { accounts: [{ id: 'a1', name: 'FTMO 100K', currency: 'USD' }, { id: 'a2', name: 'Zerodha F&O', currency: 'INR' }], selectedAccountId: 'a1' };
    generate.mockReturnValue(call({ status: 422, data: { errorCode: 'MIXED_CURRENCY', message: 'These trades are in INR and USD. Choose one account, or one currency, so amounts are not added across currencies.', error: { currencies: ['INR', 'USD'] } } }, true));
    renderView();
    await userEvent.click(generateButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('These trades are in INR and USD.');
    expect(alert).toHaveTextContent('Nothing was charged.');
    await userEvent.click(screen.getByRole('combobox', { name: /These trades are in INR and USD/ }));
    await userEvent.click(screen.getByRole('option', { name: /Zerodha F&O.*INR/ }));
    expect(setSelectedAccountId).toHaveBeenCalledWith('a2');
    expect(screen.queryByText(/Nothing was charged/)).toBeNull();
  });

  it('a rejected request shows the API message as text, not a guess', async () => {
    generate.mockReturnValue(call({ status: 400, data: { errorCode: 'VALIDATION_ERROR', errorMessage: 'The period can be at most 366 days.' } }, true));
    renderView();
    await userEvent.click(generateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('The period can be at most 366 days.');
  });
});

describe('InsightsView when the AI service is down', () => {
  it('shows the API message (it states that nothing was charged) with Retry', async () => {
    generate.mockReturnValue(call({ status: 502, data: { errorCode: 'AI_UNAVAILABLE', errorMessage: 'The AI service is unavailable right now. You were not charged; try again shortly.' } }, true));
    renderView();
    await userEvent.click(screen.getAllByRole('button').find((b) => /^Generate report/.test(b.textContent ?? ''))!);
    expect(await screen.findByRole('alert')).toHaveTextContent('You were not charged; try again shortly.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
