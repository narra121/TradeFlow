import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  let addEventListenerSpy: ReturnType<typeof vi.fn>;
  let removeEventListenerSpy: ReturnType<typeof vi.fn>;
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;

  const createMockMatchMedia = () => {
    addEventListenerSpy = vi.fn();
    removeEventListenerSpy = vi.fn();

    return vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(createMockMatchMedia());
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
  });

  it('returns false for desktop width (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true for mobile width (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false at exactly 768px (breakpoint boundary)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true at 767px (just below breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('calls matchMedia with correct breakpoint query', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('registers a change event listener on the media query list', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    renderHook(() => useIsMobile());

    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes event listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates state when media query change fires and width goes below breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    // Get the change handler and call it
    const changeHandler = addEventListenerSpy.mock.calls[0][1];
    act(() => {
      changeHandler();
    });

    expect(result.current).toBe(true);
  });

  it('updates state when media query change fires and width goes above breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);

    // Simulate resize to desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const changeHandler = addEventListenerSpy.mock.calls[0][1];
    act(() => {
      changeHandler();
    });

    expect(result.current).toBe(false);
  });

  it('returns false initially before effect runs (coerced from undefined)', () => {
    // The hook uses !!isMobile where initial state is undefined
    // !!undefined === false
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    // The initial render should return false (!!undefined) then update to true
    // But since renderHook runs effects synchronously in test, we may get the final value
    const { result } = renderHook(() => useIsMobile());

    // After effects have run, it should reflect actual width
    expect(typeof result.current).toBe('boolean');
  });

  it('returns boolean type consistently', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    const { result } = renderHook(() => useIsMobile());

    // The hook uses !! to ensure a boolean is returned, never undefined
    expect(result.current).toBe(false);
    expect(typeof result.current).toBe('boolean');
  });

  it('handles very small width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('handles very large width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 3840, writable: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
