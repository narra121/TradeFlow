import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTradesSync } from '../useTradesSync';

// Mock Redux hooks
const mockDispatch = vi.fn();
const mockSelectedAccountId = vi.fn<() => string | null>(() => null);

vi.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({ accounts: { selectedAccountId: mockSelectedAccountId() } }),
}));

vi.mock('@/store/slices/tradesSlice', () => ({
  setAccountFilter: (accountId: string) => ({
    type: 'trades/setAccountFilter',
    payload: accountId,
  }),
}));

describe('useTradesSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedAccountId.mockReturnValue(null);
  });

  it('dispatches setAccountFilter with "ALL" when no account is selected', () => {
    mockSelectedAccountId.mockReturnValue(null);

    renderHook(() => useTradesSync());

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'ALL',
    });
  });

  it('dispatches setAccountFilter with selected account id', () => {
    mockSelectedAccountId.mockReturnValue('acc-1');

    renderHook(() => useTradesSync());

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'acc-1',
    });
  });

  it('re-dispatches when selectedAccountId changes', () => {
    mockSelectedAccountId.mockReturnValue('acc-1');

    const { rerender } = renderHook(() => useTradesSync());

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'acc-1',
    });

    mockDispatch.mockClear();
    mockSelectedAccountId.mockReturnValue('acc-2');

    rerender();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'acc-2',
    });
  });

  it('dispatches "ALL" when account is deselected', () => {
    mockSelectedAccountId.mockReturnValue('acc-1');

    const { rerender } = renderHook(() => useTradesSync());

    mockDispatch.mockClear();
    mockSelectedAccountId.mockReturnValue(null);

    rerender();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'ALL',
    });
  });

  it('dispatches on initial render', () => {
    mockSelectedAccountId.mockReturnValue('acc-3');

    renderHook(() => useTradesSync());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'trades/setAccountFilter',
      payload: 'acc-3',
    });
  });

  it('does not return anything', () => {
    const { result } = renderHook(() => useTradesSync());

    expect(result.current).toBeUndefined();
  });
});
