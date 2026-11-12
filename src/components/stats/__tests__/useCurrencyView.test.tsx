import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCurrencyView } from '../useCurrencyView';
import type { AggregatedStats } from '@/types/stats';

const wrap = (route = '/') => ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
const agg = (totalTrades: number, totalPnl: number) => ({ totalTrades, totalPnl }) as unknown as AggregatedStats;
const mixed = { totalTrades: 45, totalPnl: 0, currencies: ['INR', 'USD'], byCurrency: { INR: agg(20, -5000), USD: agg(25, 1100) } } as unknown as AggregatedStats;
const prev = { totalTrades: 30, currencies: ['INR', 'USD'], byCurrency: { INR: agg(10, 1), USD: agg(20, 2) } } as unknown as AggregatedStats;

describe('useCurrencyView', () => {
  it('passes the stats through when the scope has one currency', () => {
    const one = { totalTrades: 5, currencies: ['USD'] } as unknown as AggregatedStats;
    const { result } = renderHook(() => useCurrencyView(one, undefined), { wrapper: wrap() });
    expect(result.current.stats).toBe(one);
    expect(result.current.currency).toBe('USD');
    expect(result.current.currencies).toEqual([]);
  });

  it('leaves a single-account scope (no split in the response) untouched', () => {
    const acct = { totalTrades: 5 } as unknown as AggregatedStats;
    const { result } = renderHook(() => useCurrencyView(acct, undefined), { wrapper: wrap() });
    expect(result.current.stats).toBe(acct);
    expect(result.current.currency).toBeUndefined();
  });

  it('defaults to the currency with the most trades and returns that currency aggregate and its previous period', () => {
    const { result } = renderHook(() => useCurrencyView(mixed, prev), { wrapper: wrap() });
    expect(result.current.currency).toBe('USD');
    expect(result.current.stats?.totalPnl).toBe(1100);
    expect(result.current.prev?.totalTrades).toBe(20);
    expect(result.current.currencies).toEqual(['INR', 'USD']);
  });

  it('follows ?cur= and switches through the URL', () => {
    const { result } = renderHook(() => useCurrencyView(mixed, prev), { wrapper: wrap('/?cur=INR') });
    expect(result.current.currency).toBe('INR');
    expect(result.current.stats?.totalPnl).toBe(-5000);
    act(() => result.current.select('USD'));
    expect(result.current.currency).toBe('USD');
  });

  it('ignores an unknown currency in the URL', () => {
    const { result } = renderHook(() => useCurrencyView(mixed, undefined), { wrapper: wrap('/?cur=EUR') });
    expect(result.current.currency).toBe('USD');
  });

  it('has nothing before the statistics arrive', () => {
    const { result } = renderHook(() => useCurrencyView(undefined, undefined), { wrapper: wrap() });
    expect(result.current.stats).toBeUndefined();
    expect(result.current.currencies).toEqual([]);
  });
});
