import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTradeParam } from '../useTradeParam';

function setup(initial = '/app/tradelog') {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  return renderHook(() => ({ p: useTradeParam(), loc: useLocation() }), { wrapper });
}

describe('useTradeParam', () => {
  it('is closed without a parameter', () => {
    const { result } = setup();
    expect(result.current.p.mode).toBe('closed');
    expect(result.current.p.trade).toBeNull();
  });

  it('returns the same object while nothing in the URL changes, so memos that depend on it hold', () => {
    const { result, rerender } = setup('/app/tradelog?trade=t1');
    const first = result.current.p;
    rerender();
    rerender();
    expect(result.current.p).toBe(first);
  });

  it('opens a trade (push) and reads view / edit / new modes', () => {
    const { result } = setup();
    act(() => result.current.p.openTrade('t1'));
    expect(result.current.loc.search).toBe('?trade=t1');
    expect(result.current.p.mode).toBe('view');
    act(() => result.current.p.setEdit(true));
    expect(result.current.p.mode).toBe('edit');
    act(() => result.current.p.openNew({ date: '2026-11-04' }));
    expect(result.current.p.mode).toBe('new');
    expect(result.current.p.date).toBe('2026-11-04');
  });

  it('carries a cited list while stepping and drops it when another trade is opened without one', () => {
    const { result } = setup('/app/insights');
    act(() => result.current.p.openTrade('a', { ids: ['a', 'b', 'c'] }));
    expect(result.current.loc.search).toBe('?trade=a&ids=a%2Cb%2Cc');
    expect(result.current.p.ids).toEqual(['a', 'b', 'c']);
    act(() => result.current.p.stepTo('b'));
    expect(result.current.p.ids).toEqual(['a', 'b', 'c']);
    act(() => result.current.p.openTrade('z'));
    expect(result.current.p.ids).toBeNull();
  });

  it('keeps other query parameters when opening and closing', () => {
    const { result } = setup('/app/calendar?month=2026-11&day=2026-11-04');
    act(() => result.current.p.openTrade('t9'));
    expect(new URLSearchParams(result.current.loc.search).get('month')).toBe('2026-11');
    act(() => result.current.p.close());
    expect(result.current.loc.search).toContain('month=2026-11');
    expect(result.current.loc.search).not.toContain('trade=');
  });

  it('closing a pane opened in this session goes back one entry', () => {
    const { result } = setup();
    act(() => result.current.p.openTrade('t1'));
    act(() => result.current.p.stepTo('t2'));
    expect(result.current.loc.search).toBe('?trade=t2');
    act(() => result.current.p.close());
    expect(result.current.loc.search).toBe('');
  });

  it('closing a deep-linked pane strips the parameters without leaving the screen', () => {
    const { result } = setup('/app/tradelog?trade=t5&pane=full');
    expect(result.current.p.expanded).toBe(true);
    act(() => result.current.p.close());
    expect(result.current.loc.pathname).toBe('/app/tradelog');
    expect(result.current.loc.search).toBe('');
  });

  it('leaving edit mode returns to the view entry', () => {
    const { result } = setup();
    act(() => result.current.p.openTrade('t1'));
    act(() => result.current.p.setEdit(true));
    act(() => result.current.p.setEdit(false));
    expect(result.current.p.mode).toBe('view');
    expect(result.current.loc.search).toBe('?trade=t1');
  });
});
