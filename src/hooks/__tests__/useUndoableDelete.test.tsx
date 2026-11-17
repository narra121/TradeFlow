import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Trade } from '@/types/trade';

const toastFn = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: Object.assign((...a: unknown[]) => toastFn(...a), { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) }) }));

const deleteOne = vi.fn();
const bulk = vi.fn();
const restore = vi.fn();
const ok = () => ({ unwrap: () => Promise.resolve({}) });
const fail = () => ({ unwrap: () => Promise.reject(new Error('x')) });
vi.mock('@/store/api', () => ({
  useDeleteTradeMutation: () => [deleteOne],
  useBulkDeleteTradesMutation: () => [bulk],
  useRestoreTradesMutation: () => [restore],
}));

import { useUndoableDelete, UNDO_MS } from '../useUndoableDelete';

const t = (id: string, symbol = 'EURUSD'): Trade => ({ id, symbol, direction: 'LONG', entryDate: '2026-11-04T10:00:00', exitDate: '2026-11-04T11:00:00' }) as Trade;

describe('useUndoableDelete (E-055)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteOne.mockReturnValue(ok());
    bulk.mockReturnValue(ok());
    restore.mockReturnValue(ok());
  });

  it('deletes one trade without a dialog and offers Undo for ten seconds', async () => {
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current([t('a')])).toBe(true);
    });
    expect(deleteOne).toHaveBeenCalledWith('a');
    expect(toastFn).toHaveBeenCalledWith('EURUSD long, 4 Nov deleted', expect.objectContaining({ duration: UNDO_MS, action: expect.objectContaining({ label: 'Undo' }) }));
  });

  it('Undo restores the same trades', async () => {
    const trades = [t('a'), t('b', 'GBPJPY')];
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      await result.current(trades);
    });
    expect(bulk).toHaveBeenCalledWith({ tradeIds: ['a', 'b'] });
    const opts = toastFn.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      opts.action.onClick();
    });
    expect(restore).toHaveBeenCalledWith({ trades });
  });

  it('a failed Undo says why: the API message as the toast description, the connection message without a response', async () => {
    const trades = [t('a')];
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      await result.current(trades);
    });
    const opts = toastFn.mock.calls[0][1] as { action: { onClick: () => void } };
    restore.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 409, data: { message: 'The 30-day undo window has passed.' } }) });
    await act(async () => {
      opts.action.onClick();
    });
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't restore.", { description: 'The 30-day undo window has passed.' }));
    restore.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }) });
    await act(async () => {
      opts.action.onClick();
    });
    await vi.waitFor(() => expect(toastError).toHaveBeenLastCalledWith("Couldn't restore.", { description: expect.stringMatching(/internet connection/i) }));
  });

  it('a later chunk failing keeps Undo for the chunks already deleted and says how many went', async () => {
    const trades = Array.from({ length: 120 }, (_, i) => t(`t${i}`));
    bulk.mockReturnValueOnce(ok()).mockReturnValueOnce(fail());
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current(trades)).toBe(false);
    });
    expect(bulk).toHaveBeenCalledTimes(2);
    expect(toastFn).toHaveBeenCalledWith('50 of 120 trades deleted', expect.objectContaining({ description: 'The rest could not be deleted.', action: expect.objectContaining({ label: 'Undo' }) }));
    const opts = toastFn.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      opts.action.onClick();
    });
    expect(restore).toHaveBeenCalledWith({ trades: trades.slice(0, 50) });
  });

  it('does not offer Undo when the delete failed', async () => {
    deleteOne.mockReturnValue(fail());
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current([t('a')])).toBe(false);
    });
    expect(toastFn).not.toHaveBeenCalled();
  });

  it('counts trades the API refused inside a 200 as not deleted and keeps Undo for the rest (X-012)', async () => {
    const trades = [t('a'), t('b'), t('c')];
    bulk.mockReturnValue({ unwrap: () => Promise.resolve({ deleted: ['a', 'c'], notFound: [], errors: [{ tradeId: 'b', message: 'timeout' }] }) });
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current(trades)).toBe(false);
    });
    expect(toastFn).toHaveBeenCalledWith('2 of 3 trades deleted', expect.objectContaining({ description: '1 could not be deleted.' }));
    const opts = toastFn.mock.calls[0][1] as { action: { onClick: () => void } };
    await act(async () => {
      opts.action.onClick();
    });
    expect(restore).toHaveBeenCalledWith({ trades: [trades[0], trades[2]] });
  });

  it('says why when every trade of a 200 failed and offers no Undo', async () => {
    bulk.mockReturnValue({ unwrap: () => Promise.resolve({ deleted: [], notFound: [], errors: [{ tradeId: 'a', message: 'Database busy' }, { tradeId: 'b', message: 'x' }] }) });
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current([t('a'), t('b')])).toBe(false);
    });
    expect(toastFn).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Couldn't delete.", { description: 'Database busy' });
  });

  it('treats ids the API no longer finds as gone', async () => {
    bulk.mockReturnValue({ unwrap: () => Promise.resolve({ deleted: ['a'], notFound: ['b'], errors: [] }) });
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current([t('a'), t('b')])).toBe(true);
    });
  });
});
