import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/auth/authService', () => ({ getIdToken: async () => null }));

import { renderWithProviders } from '@/test/test-utils';
import type { AppDispatch, RootState } from '@/store';
import { accountsApi } from '@/store/api/accountsApi';
import { ChromeProvider } from '@/components/shell/chrome';
import { useAnalysis } from '@/components/analysis/useAnalysis';
import { useWeekGoals } from '@/components/dashboard/useWeekGoals';
import { usePeriodStats } from '@/components/stats/usePeriodStats';
import { GoalsView } from '@/components/views/GoalsView';
import { InsightsView } from '@/components/insights/InsightsView';
import { useListChatSessionsQuery } from '@/store/api/chatApi';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { appTodayKey } from '@/lib/appTimeZone';
import { todayScopeArgs } from '@/lib/dashboard';
import { prefetchPage } from '../prefetchPage';

class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const json = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
const BODY: [RegExp, unknown][] = [
  [/\/stats$/, { totalTrades: 6, currencies: ['USD'] }],
  [/\/analysis$/, { analysis: {} }],
  [/\/trades$/, { trades: [] }],
  [/\/goals\/progress$/, { goalProgress: {}, ruleCompliance: {}, goals: [], rules: [] }],
  [/\/rules-goals$/, { goals: [], rules: [] }],
  [/\/rules$/, { rules: [] }],
  [/\/insights\/settings$/, { settings: {} }],
  [/\/insights$/, { insights: [], nextCursor: null }],
  [/\/chat\/sessions$/, { sessions: [] }],
];
let paths: string[] = [];

beforeEach(() => {
  paths = [];
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async (req: StandInRequest) => {
    const u = new URL(req.url);
    const path = u.pathname.replace('/v1', '');
    paths.push(path + u.search);
    return json(BODY.find(([re]) => re.test(path))?.[1] ?? {});
  }));
});
afterEach(() => vi.unstubAllGlobals());

const usd = { id: 'usd', name: 'FTMO', currency: 'USD', status: 'active', balance: 1000, broker: '', type: 'personal', initialBalance: 100000, createdAt: '' };
const state = { trades: { filters: { accountId: 'ALL', startDate: '2026-11-01', endDate: '2026-11-23', datePreset: 'thisMonth' } }, accounts: { selectedAccountId: null } };
const ENDPOINTS = /^\/(stats|analysis|trades|goals\/progress|rules-goals|rules|insights|chat\/sessions)/;

/** Prefetches `href`, waits until its requests have answered, then opens the page: the page must not ask for anything again. */
async function opensOnPrefetchedData(href: string, page: JSX.Element, route = href) {
  const { store, rerender } = renderWithProviders(<div />, { preloadedState: state as never, route });
  await store.dispatch(accountsApi.util.upsertQueryData('getAccounts', undefined, { accounts: [usd] } as never) as never);
  prefetchPage(new URL(href, 'https://app.test'), store.dispatch as AppDispatch, store.getState as () => RootState);
  await waitFor(() => expect(paths.length).toBeGreaterThan(0));
  await new Promise((r) => setTimeout(r, 50));
  const prefetched = [...paths];
  rerender(page);
  await new Promise((r) => setTimeout(r, 50));
  return { prefetched, after: paths.slice(prefetched.length).filter((p) => ENDPOINTS.test(p)) };
}

function DashboardData() {
  usePeriodStats({ includeEquityCurve: true });
  useAnalysis();
  useWeekGoals();
  useScopeTrades(todayScopeArgs('ALL', appTodayKey()));
  return null;
}

function AnalyticsData() {
  usePeriodStats();
  useAnalysis();
  return null;
}

function ChatData() {
  useListChatSessionsQuery();
  return null;
}

describe('prefetchPage', () => {
  it('Dashboard: the period and previous period, the analysis after /stats, today and the week goals', async () => {
    const { prefetched, after } = await opensOnPrefetchedData('/app/dashboard', <DashboardData />);
    expect(prefetched.filter((p) => p.startsWith('/stats')).length).toBe(2);
    expect(prefetched.some((p) => p.startsWith('/analysis'))).toBe(true);
    expect(prefetched.some((p) => p.startsWith('/goals/progress'))).toBe(true);
    expect(prefetched.some((p) => p.startsWith('/trades'))).toBe(true);
    expect(after).toEqual([]);
  });

  it('Analytics: the page opens on the prefetched /stats and /analysis', async () => {
    const { prefetched, after } = await opensOnPrefetchedData('/app/analytics', <AnalyticsData />);
    expect(prefetched.some((p) => p.startsWith('/analysis'))).toBe(true);
    expect(after).toEqual([]);
  });

  it('Analytics Tax and the Pro tabs request nothing ahead', async () => {
    const { store } = renderWithProviders(<div />, { preloadedState: state as never });
    await store.dispatch(accountsApi.util.upsertQueryData('getAccounts', undefined, { accounts: [usd] } as never) as never);
    for (const tab of ['tax', 'timing', 'risk']) prefetchPage(new URL(`/app/analytics?tab=${tab}`, 'https://app.test'), store.dispatch as AppDispatch, store.getState as () => RootState);
    await new Promise((r) => setTimeout(r, 50));
    expect(paths).toEqual([]);
  });

  it('Goals: the page opens on the prefetched goals, rules, progress and trades', async () => {
    const { prefetched, after } = await opensOnPrefetchedData('/app/goals', (
      <ChromeProvider>
        <GoalsView />
      </ChromeProvider>
    ));
    expect(prefetched.filter((p) => p.startsWith('/rules-goals')).length).toBe(2);
    expect(prefetched.some((p) => p.startsWith('/goals/progress'))).toBe(true);
    expect(after).toEqual([]);
  });

  it('Insights: the page opens on the prefetched reports, settings and /stats', async () => {
    const { prefetched, after } = await opensOnPrefetchedData('/app/insights', (
      <ChromeProvider>
        <InsightsView />
      </ChromeProvider>
    ));
    expect(prefetched.length).toBe(3);
    expect(after).toEqual([]);
  });

  it('Chat: the page opens on the prefetched sessions', async () => {
    const { prefetched, after } = await opensOnPrefetchedData('/app/chat', <ChatData />);
    expect(prefetched).toEqual(['/chat/sessions']);
    expect(after).toEqual([]);
  });

  it('a page with no requests of its own prefetches nothing', async () => {
    const { store } = renderWithProviders(<div />, { preloadedState: state as never });
    for (const href of ['/app/tradelog', '/app/calendar', '/app/accounts', '/app/import', '/app/settings/profile']) prefetchPage(new URL(href, 'https://app.test'), store.dispatch as AppDispatch, store.getState as () => RootState);
    await new Promise((r) => setTimeout(r, 50));
    expect(paths).toEqual([]);
  });
});
