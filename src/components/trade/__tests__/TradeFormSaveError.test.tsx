import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/types/trade';

const updateTrade = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useOnline', () => ({ useOnline: () => true }));
vi.mock('@/hooks/useAccounts', async (orig) => ({ ...(await orig<object>()), useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: () => ({ options: { symbols: [], strategies: [], sessions: [], marketConditions: [], newsEvents: [], mistakes: [], tags: [], timeframes: [] }, addSymbol: vi.fn(), addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn(), addTimeframe: vi.fn(), removeTimeframe: vi.fn() }),
}));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
vi.mock('@/store/api', () => ({ useCreateTradeMutation: () => [vi.fn()], useUpdateTradeMutation: () => [updateTrade] }));
vi.mock('@/store/hooks', () => ({ useAppSelector: () => ({ user: null }), useAppDispatch: () => vi.fn() }));

import { TradeForm } from '../TradeForm';

const trade = { id: 't1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1' } as Trade;

const fails = (error: unknown) => updateTrade.mockReturnValue({ unwrap: () => Promise.reject(error) });

async function save() {
  render(
    <MemoryRouter>
      <TradeForm mode="edit" initialTrade={trade} defaultAccountIds={[]} onSaved={vi.fn()} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  return screen.findByRole('alert');
}

describe('TradeForm save failure shows what the API said', () => {
  beforeEach(() => {
    sessionStorage.clear();
    updateTrade.mockReset();
  });

  it('a 400 with more than 6 images reads the API message, not a connection hint (owner report)', async () => {
    fails({ status: 400, data: { success: false, message: 'A trade can have at most 6 images', errorCode: 'VALIDATION_ERROR', errorMessage: 'A trade can have at most 6 images' } });
    const alert = await save();
    expect(alert).toHaveTextContent('A trade can have at most 6 images');
    expect(alert).not.toHaveTextContent(/connection|internet|offline/i);
  });

  it('a 503 from the gateway reads as unavailable, not as a connection problem', async () => {
    fails({ status: 503, data: '<html>Service Unavailable</html>' });
    const alert = await save();
    expect(alert).toHaveTextContent(/temporarily unavailable/i);
    expect(alert).not.toHaveTextContent(/internet connection/i);
  });

  it('an empty 500 body falls back to our sentence without connection wording', async () => {
    fails({ status: 500, data: null });
    const alert = await save();
    expect(alert).toHaveTextContent('Could not save the trade.');
    expect(alert).not.toHaveTextContent(/connection|internet/i);
  });

  it('only a failure with no HTTP response mentions the connection', async () => {
    fails({ status: 'FETCH_ERROR', data: 'x', error: 'TypeError: Failed to fetch' });
    const alert = await save();
    expect(alert).toHaveTextContent(/internet connection/i);
  });
});
