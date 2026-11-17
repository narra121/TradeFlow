import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/auth/authService', () => ({ getIdToken: async () => null }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ currency: 'USD', isLoading: false, isError: false, can: () => true }) }));
let mobile = false;
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/components/billing/ProGate', () => ({ LockedPreview: ({ title }: { title: string }) => <p>{title} (locked)</p> }));

import { renderWithProviders } from '@/test/test-utils';
import { api } from '@/store/api/baseApi';
import { analysisApi } from '@/store/api/analysisApi';
import type { AggregatedStats } from '@/types/stats';
import type { AnalysisState } from '../useAnalysis';
import { mixedCurrencies } from '../useAnalysis';
import type { AnalyticsContext } from '../drill';
import { EdgeTab } from '../EdgeTab';
import { ComparePanel, TwoWayPanel, twoWayCells } from '../EdgePanels';
import { QA_SCOPE, QA_USD, QA_USD_ACCOUNT } from './qaFixtures';

class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const scope = { accountId: QA_USD_ACCOUNT, ...QA_SCOPE };
const st = (over: Partial<AnalysisState> = {}): AnalysisState => ({ data: QA_USD, scope, isLoading: false, isError: false, mixed: null, refetch: vi.fn(), ...over });
const ctx = (state: AnalysisState, pro = true): AnalyticsContext => ({ stats: { segments: {} } as unknown as AggregatedStats, prevRange: null, multi: false, zone: 'Asia/Kolkata', currency: 'USD', pro, analysis: state });

const TWO_WAY = {
  columns: ['setup', 'direction', 'trades', 'wins', 'winRate', 'net', 'avgR', 'avgRLow', 'avgRHigh', 'verdict', 'label'],
  rows: [['Pullback', 'Long', 7, 3, 0.4286, -32.27, 0.1683, null, null, 'watch', 'too-few'], ['Breakout', 'Short', 31, 20, 0.645, 900, 0.8, 0.2, 1.4, 'watch', 'provisional']],
  label: 'provisional', note: 'Two-way cells are for exploring only; a cell is judged only with 30 or more trades in it and outside it.', tradeIds: [],
};
const COMPARE = {
  columns: ['measure', '2026-10-01 to 2026-11-13', '2026-08-18 to 2026-09-30'],
  rows: [['Trades', 10, 27], ['Win rate', 0.5, 0.4815], ['Net P&L', -145.59, 851.38], ['Net P&L per trade', -14.56, 31.53], ['Average R', 0.117, 0.0937], ['Payoff', 0.5378, 2.1306], ['Verdict (first against second)', 'watch', null]],
  label: 'too-few', tradeIds: [],
};

let answer: (path: string, body: Record<string, unknown> | null) => Response;
const calls: { path: string; body: Record<string, unknown> | null }[] = [];
const envelope = (data: unknown, status = 200) => new Response(JSON.stringify(status < 300 ? { success: true, data } : data), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async (req: StandInRequest) => {
    const path = new URL(req.url).pathname.replace('/v1', '') + new URL(req.url).search;
    const body = req.init.body ? (JSON.parse(String(req.init.body)) as Record<string, unknown>) : null;
    calls.push({ path, body });
    return answer(path, body);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Edge: the explorer from GET /analysis', () => {
  it('Export CSV goes in the scope bar on a desktop (not in the page) and in the page on a phone', () => {
    const { unmount } = renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge' });
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
    unmount();
    mobile = true;
    renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge' });
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    mobile = false;
  });

  it('shows evidence, avg R and profit factor per row; rows of a dimension Trades cannot filter open the pane', () => {
    renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge&by=setup' });
    const table = screen.getByRole('table', { name: 'Breakdown by strategy' });
    expect(within(table).getByRole('columnheader', { name: /Evidence/ })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /Profit factor/ })).toBeInTheDocument();
    expect(within(table).getAllByText('Too early to tell').length).toBeGreaterThan(0);
    expect(within(table).getByRole('link', { name: /Open \d+ trades for Pullback in Trades/ })).toHaveAttribute('href', '/app/tradelog?strategy=Pullback&src=analytics');
  });

  it('keeps the natural order for ordered dimensions and opens them by id (no Trades filter exists)', () => {
    renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge&by=tradeNumber' });
    const rows = within(screen.getByRole('table', { name: 'Breakdown by trade number in the day' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('1st trade of the day');
    expect(rows[2]).toHaveTextContent('2nd trade of the day');
    expect(screen.getByRole('button', { name: 'Open 32 trades for 1st trade of the day' })).toBeInTheDocument();
  });

  it('All accounts in several currencies: keeps the /stats explorer and asks for one account for the rest', () => {
    renderWithProviders(<EdgeTab ctx={ctx(st({ data: undefined, mixed: ['INR', 'USD'] }))} />, { route: '/app/analytics?tab=edge' });
    expect(screen.getByText(/in INR and USD\. Pick one account in the top bar to see evidence labels and the other breakdowns/)).toBeInTheDocument();
  });

  it('each label wraps together with its select (390: "then by" sat on one line, its select on the next)', () => {
    renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge' });
    const [by, then] = [screen.getByRole('combobox', { name: 'Group by' }), screen.getByRole('combobox', { name: 'then by' })];
    expect(by.parentElement).toContainElement(screen.getByText('Group by', { selector: 'span' }));
    expect(then.parentElement).toContainElement(screen.getByText('then by', { selector: 'span' }));
    // Two separate wrap units: neither pair holds the other select.
    expect(by.parentElement).not.toContainElement(then);
    expect(then.parentElement).not.toContainElement(by);
  });

  it('Compare: All time has no period before it, and it says so', async () => {
    renderWithProviders(<EdgeTab ctx={ctx(st())} />, { route: '/app/analytics?tab=edge', preloadedState: { trades: { filters: { accountId: QA_USD_ACCOUNT, datePreset: 'all', startDate: '2000-01-01', endDate: '2026-11-13' } } } as never });
    await userEvent.click(screen.getByRole('button', { name: /Compare with the period before/ }));
    expect(screen.getByText(/Pick a period other than All time/)).toBeInTheDocument();
  });

  it('Free: then-by and compare are locked previews, and their data is not requested', async () => {
    renderWithProviders(<EdgeTab ctx={ctx(st(), false)} />, { route: '/app/analytics?tab=edge&then=direction' });
    expect(screen.getByText('Symbol then by direction (locked)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Compare with the period before/ }));
    expect(screen.getByText('Compare two periods (locked)')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe('Then by (POST /analysis/query, kind stats, groupBy 2)', () => {
  it('reads the cells by column name', () => {
    expect(twoWayCells(TWO_WAY as never)[0]).toEqual({ a: 'Pullback', b: 'Long', trades: 7, winRate: 0.4286, net: -32.27, avgR: 0.1683, verdict: 'watch', label: 'too-few' });
  });

  it('asks for both dimensions, greys cells under 30 trades and links cells Trades can filter', async () => {
    answer = () => envelope({ result: TWO_WAY, truncated: false });
    renderWithProviders(<TwoWayPanel scope={scope} by="setup" then="direction" currency="USD" zone="Asia/Kolkata" />);
    const table = await screen.findByRole('table', { name: 'Strategy then by direction' });
    expect(calls[0]).toEqual({ path: '/analysis/query', body: { ...scope, query: { kind: 'stats', groupBy: ['setup', 'direction'] } } });
    const small = within(table).getByRole('rowheader', { name: 'Pullback' }).closest('tr')!;
    const large = within(table).getByRole('rowheader', { name: 'Breakout' }).closest('tr')!;
    expect(small.className).toContain('text-muted-foreground');
    expect(large.className).not.toContain('text-muted-foreground');
    expect(within(small).getByRole('link')).toHaveAttribute('href', '/app/tradelog?strategy=Pullback&src=analytics&direction=LONG');
    expect(screen.getByText('1 cell with 30 or more trades; the rest are greyed. For exploring only.')).toBeInTheDocument();
    expect(screen.getByText(/Two-way cells are for exploring only/)).toBeInTheDocument();
  });

  it('error: a Retry', async () => {
    answer = () => envelope({ success: false, message: 'Query failed.', errorCode: 'INTERNAL_ERROR' }, 500);
    renderWithProviders(<TwoWayPanel scope={scope} by="setup" then="direction" currency="USD" zone="UTC" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Query failed.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Compare two periods (POST /analysis/query, kind compare)', () => {
  it('sends both periods and formats each measure with its unit; too few trades is too early to tell', async () => {
    answer = () => envelope({ result: COMPARE, truncated: false });
    const prev = { from: '2026-08-18', to: '2026-09-30' };
    const s = { accountId: QA_USD_ACCOUNT, from: '2026-10-01', to: '2026-11-13' };
    renderWithProviders(<ComparePanel scope={s} previous={prev} currency="USD" />);
    const table = await screen.findByRole('table', { name: 'This period against the one before' });
    expect(calls[0].body).toEqual({ ...s, query: { kind: 'compare', a: { from: '2026-10-01', to: '2026-11-13' }, b: prev } });
    expect(within(table).getByText('50.0%')).toBeInTheDocument();
    expect(within(table).getByText('−$145.59')).toBeInTheDocument();
    expect(within(table).getByText('+0.12R')).toBeInTheDocument();
    expect(within(table).getByText('Too early to tell')).toBeInTheDocument();
  });
});

describe('analysisApi', () => {
  const makeStore = () => configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (gdm) => gdm().concat(api.middleware) });

  it('GET /analysis sends the scope and unwraps the analysis', async () => {
    answer = () => envelope({ analysis: QA_USD });
    const store = makeStore();
    const r = await store.dispatch(analysisApi.endpoints.getAnalysis.initiate(scope));
    expect(calls[0].path).toBe(`/analysis?accountId=${QA_USD_ACCOUNT}&from=2026-08-01&to=2026-11-13`);
    expect(r.data?.tradeCount).toBe(45);
  });

  it('a 422 MIXED_CURRENCY answer carries the currencies', async () => {
    answer = () => envelope({ success: false, message: 'These trades are in INR and USD.', errorCode: 'MIXED_CURRENCY', error: { code: 'MIXED_CURRENCY', currencies: ['INR', 'USD'] } }, 422);
    const store = makeStore();
    const r = await store.dispatch(analysisApi.endpoints.getAnalysis.initiate({ ...scope, accountId: 'ALL' }));
    expect(mixedCurrencies(r.error)).toEqual(['INR', 'USD']);
    expect(mixedCurrencies({ status: 500, data: { errorCode: 'INTERNAL_ERROR' } })).toBeNull();
  });

  it('GET /insights/focus: a 404 (not built yet) is no focus rule, a stored one is read', async () => {
    answer = () => envelope({ success: false, message: 'Not found', errorCode: 'NOT_FOUND' }, 404);
    let r = await makeStore().dispatch(analysisApi.endpoints.getFocusRule.initiate());
    expect(r.data).toBeNull();
    expect(r.error).toBeUndefined();
    answer = () => envelope({ focus: { text: 'No trade within 15 minutes of a loss', rule: { kind: 'pauseAfterLoss', minutes: 15 }, startedAt: '2026-11-10T00:00:00Z', findingKey: null }, progress: { checked: 6, kept: 5, broken: 1, brokenTradeIds: ['t9'], truncated: false } });
    r = await makeStore().dispatch(analysisApi.endpoints.getFocusRule.initiate());
    expect(r.data).toEqual({ text: 'No trade within 15 minutes of a loss', rule: { kind: 'pauseAfterLoss', minutes: 15 }, startedAt: '2026-11-10T00:00:00Z', progress: { checked: 6, kept: 5, broken: 1 } });
    answer = () => envelope({ focus: null, progress: null });
    r = await makeStore().dispatch(analysisApi.endpoints.getFocusRule.initiate());
    expect(r.data).toBeNull();
  });

  it('a trade write (Stats invalidated) refetches the analysis', async () => {
    answer = () => envelope({ analysis: QA_USD });
    const store = makeStore();
    const sub = store.dispatch(analysisApi.endpoints.getAnalysis.initiate(scope));
    await sub;
    store.dispatch(api.util.invalidateTags(['Stats']));
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/analysis?'))).toHaveLength(2));
    sub.unsubscribe();
  });
});
