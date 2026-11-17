import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/types/trade';

const api = vi.hoisted(() => ({ updateTrade: vi.fn(), createTrade: vi.fn() }));

vi.mock('@/components/ui/text-enhancer-button', () => ({ TextEnhancerButton: () => null }));
vi.mock('../CachedImage', () => ({ CachedImage: () => null }));
vi.mock('@/hooks/useOnline', () => ({ useOnline: () => true }));
vi.mock('@/hooks/useAccounts', async (orig) => ({ ...(await orig<object>()), useAccounts: () => ({ accounts: [{ id: 'a1', name: 'FTMO', currency: 'USD', status: 'active' }], selectedAccountId: null }) }));
vi.mock('@/hooks/useSavedOptions', () => ({
  useSavedOptions: () => ({ options: { symbols: [], strategies: [], sessions: [], marketConditions: [], newsEvents: [], mistakes: [], tags: [], timeframes: [] }, addSymbol: vi.fn(), addStrategy: vi.fn(), addSession: vi.fn(), addMarketCondition: vi.fn(), addMistake: vi.fn(), addTag: vi.fn(), addTimeframe: vi.fn(), removeTimeframe: vi.fn() }),
}));
vi.mock('@/hooks/useTradingRules', () => ({ useTradingRules: () => ({ rules: [], loading: false }) }));
vi.mock('@/store/api', () => ({ useCreateTradeMutation: () => [api.createTrade], useUpdateTradeMutation: () => [api.updateTrade] }));
vi.mock('@/store/hooks', () => ({ useAppSelector: () => undefined, useAppDispatch: () => vi.fn() }));

import { TradeForm, type TradeFormHandle } from '../TradeForm';

const trade = { id: 't1', symbol: 'EURUSD', direction: 'LONG', entryPrice: 1, exitPrice: 1.1, stopLoss: 0.9, takeProfit: 0, size: 1, entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00', outcome: 'TP', pnl: 10, riskRewardRatio: 0, accountId: 'a1' } as Trade;

const ok = (value: unknown) => ({ unwrap: () => Promise.resolve(value) });
const fail = (error: unknown) => ({ unwrap: () => Promise.reject(error) });

function mountEdit(initialTrade: Trade = trade) {
  const ref = createRef<TradeFormHandle>();
  const onSaved = vi.fn();
  render(
    <MemoryRouter>
      <TradeForm ref={ref} mode="edit" initialTrade={initialTrade} defaultAccountIds={[]} onSaved={onSaved} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  return { ref, onSaved };
}

const setNetPnl = (text: string) => {
  fireEvent.change(screen.getByLabelText(/^Net P&L/), { target: { value: text } });
};

// One input event per field: typing char by char re-renders the whole form on every key.
const fill = async (label: RegExp, text: string) => {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.paste(text);
};

describe('TradeForm.submit reports whether the trade was saved (FE-003)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.updateTrade.mockReset();
    api.createTrade.mockReset();
  });

  it('resolves false on a validation error and calls nothing', async () => {
    const { ref } = mountEdit();
    await userEvent.clear(screen.getByLabelText(/^Exit price/));
    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current!.submit();
    });
    expect(result).toBe(false);
    expect(api.updateTrade).not.toHaveBeenCalled();
  });

  it('resolves false when the API refuses the save, and true when it accepts it', async () => {
    const { ref, onSaved } = mountEdit();
    api.updateTrade.mockReturnValueOnce(fail({ status: 400, data: { message: 'Notes can have at most 4000 characters' } }));
    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current!.submit();
    });
    expect(result).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Notes can have at most 4000 characters');

    api.updateTrade.mockReturnValueOnce(ok({ updatedTrade: trade }));
    await act(async () => {
      result = await ref.current!.submit();
    });
    expect(result).toBe(true);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('puts the field errors of a 400 on their fields (X-011)', async () => {
    const { ref } = mountEdit();
    api.updateTrade.mockReturnValueOnce(fail({ status: 400, data: { message: 'Notes can have at most 4000 characters', error: { fields: [{ field: 'tradeNotes', message: 'Notes can have at most 4000 characters' }] } } }));
    await act(async () => {
      await ref.current!.submit();
    });
    await userEvent.click(screen.getByRole('button', { name: /^Journal/ }));
    expect(screen.getByLabelText(/^Notes/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('TradeForm Net P&L is parsed strictly (FE-004)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.updateTrade.mockReset();
  });

  it.each(['$50', 'abc', '-'])('refuses "%s" with a field error and saves nothing', async (text) => {
    const { ref } = mountEdit();
    setNetPnl(text);
    await act(async () => {
      expect(await ref.current!.submit()).toBe(false);
    });
    expect(api.updateTrade).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a number.')).toBeInTheDocument();
  });

  it.each([
    ['1,234.50', 1234.5],
    ['−50', -50],
    ['-50', -50],
  ])('saves "%s" as %s', async (text, expected) => {
    api.updateTrade.mockReturnValue(ok({ updatedTrade: trade }));
    const { ref } = mountEdit();
    setNetPnl(text);
    await act(async () => {
      expect(await ref.current!.submit()).toBe(true);
    });
    expect(api.updateTrade.mock.calls[0][0].payload.pnl).toBe(expected);
  });
});

describe('clearing an optional field removes it on the server (H5)', () => {
  const forex = { ...trade, assetClass: 'forex', fees: 2.5, contractMultiplier: 100000 } as Trade;
  const option = { ...trade, symbol: 'AAPL', assetClass: 'options', optionType: 'call', strike: 150, expiry: '2026-11-27', underlying: 'AAPL', contractMultiplier: 100 } as Trade;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.updateTrade.mockReset();
    api.updateTrade.mockReturnValue(ok({ updatedTrade: trade }));
    // Radix Select calls these on a pointer press; jsdom does not implement them.
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => undefined;
    Element.prototype.scrollIntoView ??= () => undefined;
  });

  const save = async (ref: ReturnType<typeof mountEdit>['ref']) => {
    await act(async () => {
      expect(await ref.current!.submit()).toBe(true);
    });
    return api.updateTrade.mock.calls[0][0].payload;
  };

  it('sends null for cleared fees and lot size', async () => {
    const { ref } = mountEdit(forex);
    await userEvent.clear(screen.getByLabelText(/^Fees/));
    await userEvent.clear(screen.getByLabelText(/^Lot size/));
    expect(await save(ref)).toMatchObject({ fees: null, contractMultiplier: null });
  });

  it('keeps a value that is still filled in', async () => {
    const { ref } = mountEdit(forex);
    expect(await save(ref)).toMatchObject({ fees: 2.5, contractMultiplier: 100000 });
  });

  it('keeps the stored expiry of a futures trade, which the form has no field to clear', async () => {
    const { ref } = mountEdit({ ...trade, symbol: 'ESZ6', assetClass: 'futures', contractMultiplier: 50, expiry: '2026-12-18' } as Trade);
    expect(await save(ref)).toMatchObject({ expiry: '2026-12-18', optionType: null, strike: null, underlying: null });
  });

  it('shows Expiry as text like the other date fields, and saves the typed day (L22-036)', async () => {
    const { ref } = mountEdit(option);
    const expiry = screen.getByLabelText(/^Expiry/);
    expect(expiry).not.toHaveAttribute('type', 'date');
    expect(expiry).toHaveValue('27 Nov 2026');
    await userEvent.clear(expiry);
    await userEvent.type(expiry, '4 Dec 2026');
    await userEvent.tab();
    expect(await save(ref)).toMatchObject({ expiry: '2026-12-04' });
  });

  it('sends null for every option field when the trade is no longer an option', async () => {
    const { ref } = mountEdit(option);
    await userEvent.click(screen.getByRole('combobox', { name: /Asset class/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Stocks' }));
    expect(await save(ref)).toMatchObject({ assetClass: 'stock', optionType: null, strike: null, expiry: null, underlying: null, contractMultiplier: null });
  });

  it('a new trade never sends null', async () => {
    const ref = createRef<TradeFormHandle>();
    render(
      <MemoryRouter>
        <TradeForm ref={ref} mode="new" defaultAccountIds={['a1']} onSaved={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    );
    await fill(/^Symbol/, 'EURUSD');
    await userEvent.type(screen.getByLabelText(/^Entry price/), '1.1');
    await userEvent.type(screen.getByLabelText(/^Exit price/), '1.2');
    await fill(/^Lots/, '1');
    await fill(/^Opened/, '4 Nov 2026, 10:00');
    await userEvent.tab();
    await fill(/^Closed/, '4 Nov 2026, 11:00');
    await userEvent.tab();
    api.createTrade.mockReturnValueOnce(ok([trade]));
    await act(async () => {
      expect(await ref.current!.submit()).toBe(true);
    });
    const body = JSON.parse(JSON.stringify(api.createTrade.mock.calls[0][0]));
    expect(Object.values(body)).not.toContain(null);
  });
});

describe('TradeForm.submit does not double-send (FE-005)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.updateTrade.mockReset();
    api.createTrade.mockReset();
  });

  it('shares one request between two calls made while the first is running (Ctrl+Enter twice)', async () => {
    let finish!: (v: unknown) => void;
    api.updateTrade.mockReturnValue({ unwrap: () => new Promise((resolve) => (finish = resolve)) });
    const { ref } = mountEdit();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = ref.current!.submit();
      second = ref.current!.submit();
    });
    expect(api.updateTrade).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ updatedTrade: trade });
      expect(await first).toBe(true);
      expect(await second).toBe(true);
    });
  });

  it('allows a new save once the first one failed', async () => {
    api.updateTrade.mockReturnValueOnce(fail({ status: 500, data: null })).mockReturnValueOnce(ok({ updatedTrade: trade }));
    const { ref } = mountEdit();
    await act(async () => {
      expect(await ref.current!.submit()).toBe(false);
    });
    await act(async () => {
      expect(await ref.current!.submit()).toBe(true);
    });
    expect(api.updateTrade).toHaveBeenCalledTimes(2);
  });
});

describe('TradeForm create sends one Idempotency-Key per request body (FE-005)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.createTrade.mockReset();
  });

  async function fillNew() {
    const ref = createRef<TradeFormHandle>();
    render(
      <MemoryRouter>
        <TradeForm ref={ref} mode="new" defaultAccountIds={['a1']} onSaved={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    );
    await fill(/^Symbol/, 'EURUSD');
    await userEvent.type(screen.getByLabelText(/^Entry price/), '1.1');
    await userEvent.type(screen.getByLabelText(/^Exit price/), '1.2');
    await fill(/^Lots/, '1');
    await fill(/^Opened/, '4 Nov 2026, 10:00');
    await userEvent.tab();
    await fill(/^Closed/, '4 Nov 2026, 11:00');
    await userEvent.tab();
    return ref;
  }

  it('repeats the key for an identical retry, and sends a new one after the form changed or saved', async () => {
    const ref = await fillNew();
    api.createTrade.mockReturnValueOnce(fail({ status: 'FETCH_ERROR', data: 'x', error: 'TypeError: Failed to fetch' })).mockReturnValueOnce(ok(trade));
    await act(async () => {
      expect(await ref.current!.submit()).toBe(false);
    });
    await act(async () => {
      expect(await ref.current!.submit()).toBe(true);
    });
    const keys = api.createTrade.mock.calls.map((c) => c[0].idempotencyKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);

    api.createTrade.mockReturnValue(ok(trade));
    await act(async () => {
      await ref.current!.submit({ addAnother: true });
    });
    await fill(/^Symbol/, 'GBPUSD');
    await userEvent.type(screen.getByLabelText(/^Entry price/), '1.3');
    await userEvent.type(screen.getByLabelText(/^Exit price/), '1.4');
    await fill(/^Lots/, '1');
    await fill(/^Closed/, '4 Nov 2026, 12:00');
    await userEvent.tab();
    await act(async () => {
      await ref.current!.submit({ addAnother: true });
    });
    const last = api.createTrade.mock.calls.at(-1)![0].idempotencyKey;
    expect(last).toBeTruthy();
    expect(last).not.toBe(keys[0]);
  });
});

describe('TradeForm payload', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.updateTrade.mockReset();
    api.updateTrade.mockReturnValue(ok({ updatedTrade: trade }));
  });

  it('computes no planned R:R when there is no stop loss (FE-014)', async () => {
    const { ref } = mountEdit({ ...trade, stopLoss: 0, takeProfit: 1.2 });
    await act(async () => {
      await ref.current!.submit();
    });
    expect(api.updateTrade.mock.calls[0][0].payload.riskRewardRatio).toBe(0);
  });

  it('computes it from entry, stop and target when there is one', async () => {
    const { ref } = mountEdit({ ...trade, stopLoss: 0.9, takeProfit: 1.2 });
    await act(async () => {
      await ref.current!.submit();
    });
    expect(api.updateTrade.mock.calls[0][0].payload.riskRewardRatio).toBeCloseTo(2, 5);
  });

  it('sends an S3 image id as its key and keeps an inline data URL readable (X-003)', async () => {
    const images = [
      { id: 'images/u1/t1/a.jpg', timeframe: '1H', description: 'entry' },
      { id: 'local', url: 'data:image/png;base64,AAAA', timeframe: '4H', description: '' },
    ];
    const { ref } = mountEdit({ ...trade, images } as Trade);
    await act(async () => {
      await ref.current!.submit();
    });
    const sent = api.updateTrade.mock.calls[0][0].payload.images;
    expect(sent[0]).toEqual({ id: 'images/u1/t1/a.jpg', key: 'images/u1/t1/a.jpg', timeframe: '1H', description: 'entry' });
    expect(sent[1]).toMatchObject({ id: 'local', timeframe: '4H' });
    expect(sent[1].key).toBeUndefined();
  });
});
