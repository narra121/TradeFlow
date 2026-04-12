import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormDraft } from '../useFormDraft';

describe('useFormDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('saves form state to sessionStorage after debounce', () => {
    const { result } = renderHook(() => useFormDraft('test-key'));

    act(() => {
      result.current.save({ symbol: 'AAPL', direction: 'LONG' });
    });

    // Not yet written (debounce)
    expect(sessionStorage.getItem('test-key')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const stored = JSON.parse(sessionStorage.getItem('test-key')!);
    expect(stored.symbol).toBe('AAPL');
    expect(stored.direction).toBe('LONG');
  });

  it('restores saved draft on init', () => {
    sessionStorage.setItem('test-key', JSON.stringify({ symbol: 'MSFT', direction: 'SHORT' }));

    const { result } = renderHook(() => useFormDraft('test-key'));

    expect(result.current.draft).toEqual({ symbol: 'MSFT', direction: 'SHORT' });
    expect(result.current.hasDraft).toBe(true);
  });

  it('returns null draft when no saved data', () => {
    const { result } = renderHook(() => useFormDraft('test-key'));

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it('clears draft from sessionStorage', () => {
    sessionStorage.setItem('test-key', JSON.stringify({ symbol: 'TSLA' }));

    const { result } = renderHook(() => useFormDraft('test-key'));
    expect(result.current.hasDraft).toBe(true);

    act(() => {
      result.current.clear();
    });

    expect(sessionStorage.getItem('test-key')).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it('handles corrupted sessionStorage data gracefully', () => {
    sessionStorage.setItem('test-key', '{invalid json');

    const { result } = renderHook(() => useFormDraft('test-key'));

    expect(result.current.draft).toBeNull();
    expect(result.current.hasDraft).toBe(false);
  });

  it('overwrites previous draft on subsequent saves', () => {
    const { result } = renderHook(() => useFormDraft('test-key'));

    act(() => {
      result.current.save({ symbol: 'AAPL' });
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    act(() => {
      result.current.save({ symbol: 'GOOG' });
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const stored = JSON.parse(sessionStorage.getItem('test-key')!);
    expect(stored.symbol).toBe('GOOG');
  });
});
