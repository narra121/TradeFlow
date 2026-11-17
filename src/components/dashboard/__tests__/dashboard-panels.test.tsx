import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TodayStrip } from '../TodayStrip';
import { GoalsSummary } from '../GoalsSummary';
import { NeedsAttention } from '../NeedsAttention';
import { RecentTrades } from '../RecentTrades';
import { EquityChart, equityTicks } from '../EquityChart';
import type { WeekGoal } from '@/lib/dashboard';
import type { WeekGoalsState } from '../useWeekGoals';
import type { Trade, TradingAccount } from '@/types/trade';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.mock('../BeforeSession', () => ({ BeforeSession: () => <p>before the session</p> }));

vi.mock('@/store/api/insightsApi', () => ({
  useListInsightsQuery: () => ({ data: { insights: [{ id: 'i1', summary: 'Losses cluster after 20:00' }] }, currentData: { insights: [{ id: 'i1', summary: 'Losses cluster after 20:00' }] }, isLoading: false, isError: false }),
}));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}
const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<>{ui}<Where /></>} />
      </Routes>
    </MemoryRouter>,
  );

const goal = (over: Partial<WeekGoal>): WeekGoal => ({ type: 'tradeCount', label: 'Trades', current: 5, target: 8, limit: true, over: false, statusText: '3 left', ...over });
const week = (over: Partial<WeekGoalsState> = {}): WeekGoalsState => ({ isLoading: false, isError: false, goals: [], brokenRules: 0, hasRules: true, ...over });
const now = new Date(2026, 10, 11, 12, 0);

describe('TodayStrip', () => {
  it('is a region named Today with the net per currency and the trade count, linking to today in Trades', () => {
    wrap(<TodayStrip today={{ count: 2, byCurrency: [{ currency: 'USD', net: 125.8 }, { currency: 'INR', net: -300 }] }} todayLoading={false} week={week()} todayKey="2026-11-11" now={now} />);
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('+$125.80')).toBeInTheDocument();
    expect(screen.getByText('−₹300.00')).toBeInTheDocument();
    expect(screen.getByText('· 2 trades')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Today · Wed 11 Nov/ })).toHaveAttribute('href', '/app/tradelog?on=2026-11-11&src=dashboard');
  });

  it('shows the limits as meters when goals are set', () => {
    wrap(<TodayStrip today={{ count: 0, byCurrency: [] }} todayLoading={false} week={week({ goals: [goal({}), goal({ type: 'maxDrawdown', label: 'Drawdown', current: 1.2, target: 3 })] })} todayKey="2026-11-11" now={now} />);
    expect(screen.getByText('No trades yet')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Week: 5 of 8 trades' })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Drawdown: 1.2% of 3.0%' })).toBeInTheDocument();
    expect(screen.queryByText(/Set weekly limits/)).not.toBeInTheDocument();
  });

  it('names a one-trade limit in the singular', () => {
    wrap(<TodayStrip today={{ count: 0, byCurrency: [] }} todayLoading={false} week={week({ goals: [goal({ current: 0, target: 1 })] })} todayKey="2026-11-11" now={now} />);
    expect(screen.getByRole('meter', { name: 'Week: 0 of 1 trade' })).toBeInTheDocument();
  });

  it('asks for weekly limits when none are set and reports broken rules', () => {
    wrap(<TodayStrip today={{ count: 0, byCurrency: [] }} todayLoading={false} week={week({ brokenRules: 1 })} todayKey="2026-11-11" now={now} />);
    expect(screen.getByRole('link', { name: /Set weekly limits/ })).toHaveAttribute('href', '/app/goals');
    expect(screen.getByText(/1 rule broken this week/)).toBeInTheDocument();
  });

  it('flags a limit that is exceeded', () => {
    wrap(<TodayStrip today={{ count: 0, byCurrency: [] }} todayLoading={false} week={week({ goals: [goal({ current: 9, over: true })] })} todayKey="2026-11-11" now={now} />);
    expect(screen.getByText('Over the limit')).toBeInTheDocument();
  });
});

describe('GoalsSummary', () => {
  it('shows an unknown win rate as a dash when no trade was taken this week', () => {
    wrap(<GoalsSummary week={week({ goals: [goal({ type: 'winRate', label: 'Win rate', current: 0, target: 65, limit: false, noTrades: true, statusText: 'No trades yet' })] })} mixed={false} />);
    expect(screen.getByText('— of 65%')).toBeInTheDocument();
    expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument();
  });

  it('draws a track per goal the user set, with money only for one currency', () => {
    const goals = [goal({ type: 'profit', label: 'Profit', current: 380, target: 500, limit: false, statusText: 'On pace' }), goal({})];
    const { unmount } = wrap(<GoalsSummary week={week({ goals })} currency="USD" mixed={false} />);
    expect(screen.getByText('$380.00 of $500.00')).toBeInTheDocument();
    expect(screen.getByText('5 of 8')).toBeInTheDocument();
    unmount();
    wrap(<GoalsSummary week={week({ goals })} mixed />);
    expect(screen.queryByText(/of \$500/)).not.toBeInTheDocument();
    expect(screen.getByText('5 of 8')).toBeInTheDocument();
  });

  it('prompts for limits when none are set and reports a failed load without default targets', () => {
    const { unmount } = wrap(<GoalsSummary week={week()} mixed={false} />);
    expect(screen.getByRole('link', { name: /Set weekly limits/ })).toBeInTheDocument();
    unmount();
    wrap(<GoalsSummary week={week({ isError: true })} mixed={false} />);
    expect(screen.getByText(/Could not load your goals/)).toBeInTheDocument();
  });

  it('adds the API message of a failed load; the connection message only without a response', () => {
    const { unmount } = wrap(<GoalsSummary week={week({ isError: true, error: { status: 500, data: { message: 'Goals are being recalculated.' } } })} mixed={false} />);
    expect(screen.getByText(/Goals are being recalculated\./)).toBeInTheDocument();
    unmount();
    wrap(<GoalsSummary week={week({ isError: true, error: { status: 'FETCH_ERROR' } })} mixed={false} />);
    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
  });
});

describe('NeedsAttention', () => {
  const rows = [
    { key: 'no-strategy' as const, label: '7 trades have no strategy', count: 7 },
    { key: 'no-lesson' as const, label: '3 losing trades have no key lesson', count: 3 },
  ];

  it('links every tally to Trades with its filter and lists the latest insight', async () => {
    const user = userEvent.setup();
    wrap(<NeedsAttention rows={rows} truncated={false} />);
    const link = screen.getByRole('link', { name: /7 trades have no strategy/ });
    expect(link).toHaveAttribute('href', '/app/tradelog?missing=strategy&src=dashboard');
    await user.click(screen.getByRole('link', { name: /Latest insight/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/app/insights');
  });

  it('says the journal is complete and states the 5,000-trade ceiling', () => {
    wrap(<NeedsAttention rows={[]} truncated />);
    expect(screen.getByText('Journal is complete for this period.')).toBeInTheDocument();
    expect(screen.getByText('From the newest 5,000 trades')).toBeInTheDocument();
  });
});

describe('RecentTrades', () => {
  const accounts = new Map([['a', { id: 'a', currency: 'USD' } as TradingAccount]]);
  const t = (id: string, symbol: string, pnl: number): Trade =>
    ({ id, symbol, pnl, direction: 'LONG', accountId: 'a', entryPrice: 1, exitPrice: 2, stopLoss: 0, size: 1, entryDate: '2026-11-11T09:00:00', exitDate: '2026-11-11T10:00:00', outcome: 'TP' }) as Trade;

  it('shows the newest six and opens the pane on Enter', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const trades = Array.from({ length: 8 }, (_, i) => t(`t${i}`, `SYM${i}`, i + 1));
    wrap(<RecentTrades trades={trades} accounts={accounts} onOpen={onOpen} />);
    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('SYM0')).toBeInTheDocument();
    expect(screen.queryByText('SYM6')).not.toBeInTheDocument();
    screen.getByText('SYM0').closest('tr')!.focus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith('t0');
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/app/tradelog');
  });
});

describe('EquityChart', () => {
  it('steps the money axis in round numbers through zero, never 550 (L23-R4)', () => {
    expect(equityTicks([-550, 1100])).toEqual([-1000, -500, 0, 500, 1000, 1500]);
    expect(equityTicks([0, 192, 710])).toEqual([0, 200, 400, 600, 800]);
    expect(equityTicks([-12.5, 3])).toEqual([-15, -10, -5, 0, 5]);
    expect(equityTicks([0])).toEqual([0]);
  });

  const points = [
    { date: '2026-11-02', label: '2 Nov', day: -10, cumulative: -10 },
    { date: '2026-11-03', label: '3 Nov', day: 30, cumulative: 20 },
  ];

  it('moves a cursor with the arrow keys, reads it out, and opens the day in Calendar on Enter', async () => {
    const user = userEvent.setup();
    wrap(<EquityChart points={points} currency="USD" />);
    const group = screen.getByRole('group', { name: /Equity chart/ });
    group.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/3 Nov/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/2 Nov · day/)).toHaveTextContent('2 Nov · day −$10.00 · total −$10.00');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/calendar?month=2026-11&day=2026-11-02');
  });

  it('offers the values as a table', async () => {
    const user = userEvent.setup();
    wrap(<EquityChart points={points} currency="USD" />);
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table', { name: /Daily net/ });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('+$20.00')).toBeInTheDocument();
  });

  it('says so when there are no closed trades', () => {
    wrap(<EquityChart points={[]} />);
    expect(screen.getByText('No closed trades in this period.')).toBeInTheDocument();
  });
});
