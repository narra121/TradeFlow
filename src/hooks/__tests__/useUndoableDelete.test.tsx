import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Trade } from '@/types/trade';

const toastFn = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: Object.assign((...a: unknown[]) => toastFn(...a), { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() }) }));

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
    expect(toastFn).toHaveBeenCalledWith('EURUSD long, 04 Nov deleted', expect.objectContaining({ duration: UNDO_MS, action: expect.objectContaining({ label: 'Undo' }) }));
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

  it('does not offer Undo when the delete failed', async () => {
    deleteOne.mockReturnValue(fail());
    const { result } = renderHook(() => useUndoableDelete());
    await act(async () => {
      expect(await result.current([t('a')])).toBe(false);
    });
    expect(toastFn).not.toHaveBeenCalled();
  });
});
