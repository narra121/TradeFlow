import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from '../useGlobalShortcuts';
import { resetUiStateCache } from '../useUiState';

const handlers = () => ({ onPalette: vi.fn(), onNewTrade: vi.fn(), onShortcuts: vi.fn(), onSearch: vi.fn(), onCollapse: vi.fn(), onStepPeriod: vi.fn(), onRefresh: vi.fn(), onRegion: vi.fn() });

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
    resetUiStateCache();
  });

  it('calls the handler of every key in the map', () => {
    const h = handlers();
    renderHook(() => useGlobalShortcuts(h));
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'n' });
    fireEvent.keyDown(window, { key: '/' });
    fireEvent.keyDown(window, { key: '?' });
    fireEvent.keyDown(window, { key: '[' });
    fireEvent.keyDown(window, { key: ',' });
    fireEvent.keyDown(window, { key: '.' });
    fireEvent.keyDown(window, { key: 'R', shiftKey: true });
    fireEvent.keyDown(window, { key: 'F6' });
    fireEvent.keyDown(window, { key: 'F6', shiftKey: true });
    expect(h.onPalette).toHaveBeenCalledTimes(1);
    expect(h.onNewTrade).toHaveBeenCalledTimes(1);
    expect(h.onSearch).toHaveBeenCalledTimes(1);
    expect(h.onShortcuts).toHaveBeenCalledTimes(1);
    expect(h.onCollapse).toHaveBeenCalledTimes(1);
    expect(h.onStepPeriod.mock.calls).toEqual([[-1], [1]]);
    expect(h.onRefresh).toHaveBeenCalledTimes(1);
    expect(h.onRegion.mock.calls).toEqual([[1], [-1]]);
  });

  it('ignores single keys while typing, but not F6 or Ctrl+K', () => {
    const h = handlers();
    renderHook(() => useGlobalShortcuts(h));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'n' });
    fireEvent.keyDown(input, { key: '.' });
    fireEvent.keyDown(input, { key: 'F6' });
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true });
    expect(h.onNewTrade).not.toHaveBeenCalled();
    expect(h.onStepPeriod).not.toHaveBeenCalled();
    expect(h.onRegion).toHaveBeenCalledTimes(1);
    expect(h.onPalette).toHaveBeenCalledTimes(1);
    input.remove();
  });
});
