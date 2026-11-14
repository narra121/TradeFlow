import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { AnalysisState } from '@/components/analysis/useAnalysis';
import { QA_INR, QA_USD } from '@/components/analysis/__tests__/qaFixtures';
import type { Analysis } from '@/types/analysis';

const state = vi.hoisted(() => ({ analysis: null as unknown, trades: [] as { pnl: number }[], tradesLoading: false, focus: null as unknown }));
vi.mock('@/components/analysis/useAnalysis', () => ({ useAnalysis: () => state.analysis }));
vi.mock('@/hooks/useScopeTrades', () => ({ useScopeTrades: () => ({ trades: state.trades, isLoading: state.tradesLoading }) }));
vi.mock('@/store/api/analysisApi', () => ({ useGetFocusRuleQuery: () => ({ data: state.focus }) }));

import { BeforeSession, currentStreak, leaksForToday } from '../BeforeSession';

const st = (over: Partial<AnalysisState> = {}): AnalysisState => ({ data: QA_USD, scope: { accountId: 'a', from: '2026-08-01', to: '2026-11-13' }, isLoading: false, isError: false, mixed: null, refetch: vi.fn(), ...over });
const show = () => render(<MemoryRouter><BeforeSession /></MemoryRouter>);

beforeEach(() => {
  state.analysis = st();
  state.trades = [{ pnl: -10 }, { pnl: -5 }, { pnl: 20 }];
  state.tradesLoading = false;
  state.focus = null;
});

describe('currentStreak', () => {
  it('counts the run the newest trades end on; a break-even trade ends it', () => {
    expect(currentStreak([{ pnl: -1 }, { pnl: -2 }, { pnl: 3 }])).toEqual({ kind: 'loss', count: 2 });
    expect(currentStreak([{ pnl: 5 }, { pnl: 0 }, { pnl: 3 }])).toEqual({ kind: 'win', count: 1 });
    expect(currentStreak([{ pnl: 0 }])).toBeNull();
    expect(currentStreak([])).toBeNull();
  });
});

describe('leaksForToday', () => {
  const leak = (a: Analysis): Analysis => ({
    ...a,
    segments: { ...a.segments, weekday: [{ ...a.segments.weekday[0], name: 'Friday', key: 'fri', verdict: 'leak' }, { ...a.segments.weekday[0], name: 'Monday', key: 'mon', verdict: 'leak' }], symbol: [{ ...a.segments.symbol[0], verdict: 'leak' }] },
    detectors: a.detectors.map((d) => (d.id === 'beyondStop' ? { ...d, verdict: 'leak' } : d)),
  });

  it('lists only server-proven leaks; a weekday only on that weekday, in the analysis zone', () => {
    const friday = new Date('2026-11-13T06:00:00Z');
    const names = leaksForToday(leak(QA_USD), friday).map((l) => `${l.name} (${l.where})`);
    expect(names).toEqual(['Losses beyond the stop (behaviour)', `${QA_USD.segments.symbol[0].name} (symbol)`, 'Friday (weekday)']);
    expect(leaksForToday(QA_USD, friday)).toEqual([]);
  });
});

describe('BeforeSession strip', () => {
  it('is a region with drawdown now (money, since when) and the current streak', () => {
    show();
    const region = screen.getByRole('region', { name: 'Before the session' });
    expect(region).toHaveTextContent('Drawdown now');
    expect(screen.getByText('−$152.10')).toBeInTheDocument();
    expect(screen.getByText(/since 30 Sep/)).toBeInTheDocument();
    expect(screen.getByText('2 losses')).toBeInTheDocument();
  });

  it('says no leak is proven yet, with the sample, and links to Behaviour', () => {
    state.analysis = st({ data: QA_INR });
    show();
    expect(screen.getByText('none proven yet (23 trades)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Proven leaks today/ })).toHaveAttribute('href', '/app/analytics?tab=behaviour');
  });

  it('shows the focus rule only when the server has one (a 404 reads as none)', () => {
    show();
    expect(screen.queryByText('Focus this week')).not.toBeInTheDocument();
    state.focus = { text: 'Stop for the day after 2 losing trades', progress: { checked: 6, kept: 5, broken: 1 } };
    show();
    expect(screen.getByText('Stop for the day after 2 losing trades')).toBeInTheDocument();
    expect(screen.getByText('kept 5 of 6 trades')).toBeInTheDocument();
  });

  it('loading, error with Retry, and several currencies', async () => {
    state.analysis = st({ data: undefined, isLoading: true });
    state.tradesLoading = true;
    const { unmount } = show();
    expect(screen.queryByText(/−\$/)).not.toBeInTheDocument();
    unmount();
    const s = st({ data: undefined, isError: true });
    state.analysis = s;
    state.tradesLoading = false;
    const second = show();
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(s.refetch).toHaveBeenCalled();
    second.unmount();
    state.analysis = st({ data: undefined, mixed: ['INR', 'USD'] });
    show();
    expect(screen.getByText('pick one account')).toBeInTheDocument();
  });

  it('at the high: no drawdown', () => {
    state.analysis = st({ data: { ...QA_USD, risk: { ...QA_USD.risk, drawdown: { current: 0, deepest: 10, longestDays: 2, since: null } } } });
    show();
    expect(screen.getByText('none, at the period high')).toBeInTheDocument();
  });
});
