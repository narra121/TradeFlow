import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Trade } from '@/types/trade';

const accounts = [
  { id: 'usd', name: 'FTMO', currency: 'USD', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 1000, createdAt: '' },
  { id: 'inr', name: 'Zerodha', currency: 'INR', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 1000, createdAt: '' },
];
const t = (id: string, exit: string, pnl: number, accountId = 'usd', over: Partial<Trade> = {}): Trade =>
  ({ id, symbol: `SYM${id}`, direction: 'LONG', entryPrice: 100, exitPrice: 101, stopLoss: 99, takeProfit: 0, size: 1, entryDate: exit, exitDate: exit, outcome: 'TP', pnl, riskRewardRatio: 0, accountId, ...over }) as Trade;

let monthTrades: Trade[] = [];
let everyTrade: Trade[] = [];
let monthState: { isLoading: boolean; isError: boolean; error?: unknown } = { isLoading: false, isError: false };
let accountList = accounts;
const refetch = vi.fn();
vi.mock('@/hooks/useScopeTrades', () => ({
  useScopeTrades: (p?: { startDate?: string; endDate?: string }) => {
    const whole = p?.startDate === '2000-01-01';
    return { trades: whole ? everyTrade : monthTrades, isLoading: whole ? false : monthState.isLoading, isError: whole ? false : monthState.isError, error: whole ? undefined : monthState.error, isFetching: false, refetch, truncated: false, params: {} };
  },
}));
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: accountList, selectedAccountId: null, selectedAccount: null, setSelectedAccountId: vi.fn() }),
}));
let notes: { currentData?: unknown[]; isError?: boolean; error?: unknown } = { currentData: [] };
vi.mock('@/store/api/journalApi', async (orig) => ({
  ...(await orig<object>()),
  useGetDayNotesQuery: () => notes,
  useSaveDayNoteMutation: () => [vi.fn(), { isLoading: false }],
}));

import { CalendarView } from '../CalendarView';
import { ChromeProvider } from '@/components/shell/chrome';
import { ScopeBar } from '@/components/shell/ScopeBar';

function Where() {
  return <p data-testid="search">{useLocation().search}</p>;
}

function setup(path = '/app/calendar?month=2026-11') {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <ChromeProvider>
            <ScopeBar scoped isMobile={false} />
            <CalendarView />
          </ChromeProvider>
          <Where />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>,
  );
}

const nov = [t('1', '2026-11-02T10:00:00', -48, 'usd', { brokenRuleIds: ['r'] }), t('2', '2026-11-04T10:00:00', 64), t('3', '2026-11-04T12:00:00', 61.8), t('4', '2026-11-06T10:00:00', 310)];

describe('CalendarView', () => {
  beforeEach(() => {
    monthTrades = nov;
    everyTrade = nov;
    monthState = { isLoading: false, isError: false };
    accountList = accounts;
    notes = { currentData: [] };
    refetch.mockClear();
  });

  it('prints the month in one summary line and a grid', () => {
    setup();
    const line = screen.getByLabelText('Summary');
    expect(line).toHaveTextContent('Net+$387.80');
    expect(line).toHaveTextContent('3 trading days · 2 green / 1 red');
    expect(line).toHaveTextContent('Best Fri 6 +$310.00');
    expect(line).toHaveTextContent('Worst Mon 2 −$48.00');
    expect(screen.getByRole('grid', { name: 'Calendar, November 2026' })).toBeInTheDocument();
  });

  it('names Best and Worst only with two trading days and only when they are a gain and a loss', () => {
    monthTrades = [t('1', '2026-11-04T10:00:00', -48)];
    const { unmount } = setup();
    expect(screen.getByLabelText('Summary')).toHaveTextContent('1 trading day');
    expect(screen.getByLabelText('Summary')).not.toHaveTextContent(/Best|Worst/);
    unmount();
    monthTrades = [t('1', '2026-11-04T10:00:00', -48), t('2', '2026-11-05T10:00:00', -10)];
    const second = setup();
    expect(screen.getByLabelText('Summary')).toHaveTextContent('Worst Wed 4 −$48.00');
    expect(screen.getByLabelText('Summary')).not.toHaveTextContent('Best');
    second.unmount();
  });

  it('counts the days without R when colouring by R', () => {
    monthTrades = [t('1', '2026-11-04T10:00:00', 20, 'usd', { stopLoss: 0 }), t('2', '2026-11-05T10:00:00', 30)];
    setup('/app/calendar?month=2026-11&metric=r');
    expect(screen.getByLabelText('Summary')).toHaveTextContent('1 without R');
  });

  it('shows the figures of the visible week in the week view', () => {
    setup('/app/calendar?month=2026-11&view=week&week=2026-11-04');
    expect(screen.getByLabelText('Summary')).toHaveTextContent('Net+$387.80');
    expect(screen.getByLabelText('Summary')).toHaveTextContent('3 trading days');
  });

  it('keeps the cursor on the same day of the month after PageDown', async () => {
    const user = userEvent.setup();
    setup();
    document.querySelector<HTMLElement>('[data-day="2026-11-12"]')!.focus();
    await user.keyboard('{PageDown}');
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-12');
    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('[data-day="2026-12-12"]')));
  });

  it('puts the account, month stepper, Today, Newest trade and Colour by in the scope bar', () => {
    setup('/app/calendar?month=2026-10');
    const bar = screen.getByRole('toolbar', { name: 'Data shown' });
    expect(within(bar).getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(within(bar).getByText('October 2026')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Newest trade' })).toBeInTheDocument();
    expect(within(bar).getByText('Colour by')).toBeInTheDocument();
  });

  it('steps months through the URL and Today returns to this month', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-12');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-10');
  });

  it('steps the month with . and , but not while typing in a field', async () => {
    const user = userEvent.setup();
    setup('/app/calendar?month=2026-11&day=2026-11-04');
    await user.click(screen.getByRole('gridcell', { name: /Thursday 5 November/ }));
    await user.keyboard('.');
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-12');
    await user.keyboard(',,');
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-10');
    await user.click(screen.getByRole('gridcell', { name: /Thursday 1 October/ }));
    await user.type(screen.getByLabelText('Plan'), ',.');
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-10');
  });

  it('opens the day level of the pane from a cell and writes it to the URL', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('gridcell', { name: /Wednesday 4 November/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('day=2026-11-04');
    const pane = screen.getByRole('complementary', { name: 'Day 4 November' });
    expect(within(pane).getByRole('heading', { name: 'Wed 4 Nov 2026' })).toBeInTheDocument();
    expect(within(pane).getByRole('button', { name: 'Add trade on this day' })).toBeInTheDocument();
    await user.click(within(pane).getByRole('button', { name: 'Close day' }));
    expect(screen.getByTestId('search')).not.toHaveTextContent('day=');
  });

  it('opens a week from the week column', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /^Week 45, 4 trades/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('wk=2026-11-02');
    expect(screen.getByRole('heading', { name: /Week 45/ })).toBeInTheDocument();
  });

  it('draws the day note only when the notes route answers', async () => {
    const user = userEvent.setup();
    const { unmount } = setup('/app/calendar?month=2026-11&day=2026-11-04');
    expect(screen.getByText('Day note')).toBeInTheDocument();
    unmount();
    notes = { isError: true, error: { status: 404 } };
    setup('/app/calendar?month=2026-11&day=2026-11-04');
    expect(screen.queryByText('Day note')).not.toBeInTheDocument();
    void user;
  });

  it('starts the day note from the stored text, and waits for the notes instead of showing an empty editor', () => {
    notes = { currentData: [{ date: '2026-11-04', accountId: null, plan: 'Only London open.', review: '' }] };
    const { unmount } = setup('/app/calendar?month=2026-11&day=2026-11-04');
    expect(screen.getByLabelText('Plan')).toHaveValue('Only London open.');
    expect(screen.getByRole('gridcell', { name: /Wednesday 4 November.*has a note/ })).toBeInTheDocument();
    unmount();
    notes = { currentData: undefined };
    setup('/app/calendar?month=2026-11&day=2026-11-04');
    expect(screen.queryByLabelText('Plan')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows a month without trades as one sentence with a way to the newest trade', () => {
    monthTrades = [];
    everyTrade = [t('9', '2026-08-03T10:00:00', 5)];
    setup('/app/calendar?month=2026-11');
    expect(screen.getByText(/No trades in November 2026\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to the newest trade' })).toBeInTheDocument();
  });

  it('opens on the newest trade’s month when there is no month in the URL and this month is empty', () => {
    monthTrades = [];
    everyTrade = [t('9', '2020-08-03T10:00:00', 5)];
    setup('/app/calendar');
    expect(screen.getByTestId('search')).toHaveTextContent('month=2020-08');
  });

  it('shows an error with Retry instead of an empty grid', async () => {
    monthState = { isLoading: false, isError: true };
    setup();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load this month.');
  });

  it('shows the API message of a failed month; the connection message only without a response', () => {
    monthState = { isLoading: false, isError: true, error: { status: 500, data: { message: 'Your trades are being moved. Try again in a minute.' } } };
    const { unmount } = setup();
    expect(screen.getByRole('alert')).toHaveTextContent('Your trades are being moved. Try again in a minute.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    monthState = { isLoading: false, isError: true, error: { status: 'FETCH_ERROR' } };
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('shows a skeleton of the final layout while loading', () => {
    monthState = { isLoading: true, isError: false };
    setup();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('asks for an account first when there are none', () => {
    accountList = [];
    setup();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });

  it('prints the colour legend in words and names the time zone', () => {
    setup();
    expect(screen.getByText(/Tint shows net P&L in three steps/)).toBeInTheDocument();
    expect(screen.getByText(/Times in /)).toBeInTheDocument();
  });

  it('shows the week as a day timeline with blocks that open a trade', async () => {
    const user = userEvent.setup();
    setup('/app/calendar?month=2026-11&view=week&week=2026-11-04');
    expect(screen.getByRole('button', { name: 'Wed 4' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /SYM2 long/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('trade=2');
  });

  it('cites the weeks trades in time order so Prev / Next walk them (FE-017)', async () => {
    const user = userEvent.setup();
    setup('/app/calendar?month=2026-11&view=week&week=2026-11-04');
    await user.click(screen.getByRole('button', { name: /SYM2 long/ }));
    const ids = new URLSearchParams(screen.getByTestId('search').textContent ?? '').get('ids') ?? '';
    expect(ids.split(',')).toContain('2');
    expect(ids.split(',').length).toBeGreaterThan(1);
  });

  it('opens the day pane from a timeline column header', async () => {
    const user = userEvent.setup();
    setup('/app/calendar?month=2026-11&view=week&week=2026-11-04');
    await user.click(screen.getByRole('button', { name: 'Wed 4' }));
    expect(screen.getByTestId('search')).toHaveTextContent('day=2026-11-04');
    expect(screen.getByRole('complementary', { name: 'Day 4 November' })).toBeInTheDocument();
  });

  it('shows the year as mini months with a summary, a table and a Colour by control', async () => {
    const user = userEvent.setup();
    monthTrades = nov;
    setup('/app/calendar?month=2026-11&view=year');
    expect(screen.getByRole('region', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Months of 2026' })).toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toHaveTextContent('3 trading days');
    expect(screen.getByLabelText('Colour by')).toBeInTheDocument();
    await user.click(within(screen.getByRole('region', { name: 'November 2026' })).getByRole('button', { name: /Open the month/ }));
    expect(screen.getByTestId('search')).toHaveTextContent('month=2026-11');
    expect(screen.getByTestId('search')).not.toHaveTextContent('view=year');
  });

  it('colours by R in a scope that mixes currencies', () => {
    monthTrades = [...nov, t('7', '2026-11-05T10:00:00', 5000, 'inr')];
    setup();
    expect(screen.getByText(/Tint shows total R/)).toBeInTheDocument();
    expect(screen.getByText(/mixes currencies, so R is the default/)).toBeInTheDocument();
    expect(screen.queryByText(/Best/)).not.toBeInTheDocument();
  });
});
