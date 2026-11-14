import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test/v1' }));
vi.mock('@/lib/auth/authService', () => ({ getIdToken: async () => null }));
vi.mock('@/components/stats/useScopeCapital', () => ({ useScopeCapital: () => ({ accountsReady: true }) }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openTrade: vi.fn() }) }));

import { renderWithProviders } from '@/test/test-utils';
import { useGetStatsQuery } from '@/store/api';
import { useAnalysis } from '../useAnalysis';
import { QA_USD } from './qaFixtures';

class StandInRequest {
  constructor(public url: string, public init: RequestInit = {}) {}
}

const paths: string[] = [];
let currencies: string[] = [];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(status < 300 ? { success: true, data } : data), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  paths.length = 0;
  vi.stubGlobal('Request', StandInRequest);
  vi.stubGlobal('fetch', vi.fn(async (req: StandInRequest) => {
    const u = new URL(req.url);
    paths.push(u.pathname.replace('/v1', '') + u.search);
    if (u.pathname.endsWith('/stats')) return json({ totalTrades: 68, currencies });
    return json({ analysis: QA_USD });
  }));
});
afterEach(() => vi.unstubAllGlobals());

const filters = { accountId: 'ALL', startDate: '2026-08-01', endDate: '2026-11-14', datePreset: 'custom' };

/** The page: `/stats` for the scope (as usePeriodStats asks it) and the analysis. */
function Page() {
  useGetStatsQuery({ accountId: 'ALL', totalCapital: 600000, startDate: filters.startDate, endDate: filters.endDate });
  const a = useAnalysis();
  return <p data-testid="state">{a.isLoading ? 'loading' : a.mixed ? `mixed ${a.mixed.join(' ')}` : a.data ? `trades ${a.data.tradeCount}` : 'none'}</p>;
}
const render = () => renderWithProviders(<Page />, { preloadedState: { trades: { filters } } as never });

describe('useAnalysis for All accounts', () => {
  it('does not ask GET /analysis when /stats shows several currencies (it would answer 422): the currencies come from /stats', async () => {
    currencies = ['USD', 'INR'];
    render();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('mixed INR USD'));
    expect(paths.some((p) => p.startsWith('/analysis'))).toBe(false);
  });

  it('asks GET /analysis once /stats shows one currency', async () => {
    currencies = ['USD'];
    render();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('trades 45'));
    expect(paths.filter((p) => p.startsWith('/analysis'))).toEqual(['/analysis?accountId=ALL&from=2026-08-01&to=2026-11-14']);
  });

  it('trades without an account do not make the scope mixed', async () => {
    currencies = ['UNKNOWN', 'USD'];
    render();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('trades 45'));
  });
});
