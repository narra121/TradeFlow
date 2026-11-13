import { describe, expect, it } from 'vitest';
import { drawdownBasis } from '../useScopeCapital';

const acc = (currency: string | undefined, initialBalance: number) => ({ currency, initialBalance }) as never;

describe('drawdownBasis (X-016, X-017)', () => {
  it('is ok for accounts of one currency that all have a starting balance', () => {
    expect(drawdownBasis([acc('USD', 10000), acc('USD', 500)])).toBe('ok');
    expect(drawdownBasis([])).toBe('ok');
  });

  it('is "balance" when any account starts at 0: the percentage would read near 100%', () => {
    expect(drawdownBasis([acc('USD', 0)])).toBe('balance');
    expect(drawdownBasis([acc('USD', 10000), acc('USD', 0)])).toBe('balance');
  });

  it('is "mixed" when currencies differ: 500,000 INR + 10,000 USD is not a capital', () => {
    expect(drawdownBasis([acc('INR', 500000), acc('USD', 10000)])).toBe('mixed');
  });

  it('reads an account with no currency as USD', () => {
    expect(drawdownBasis([acc(undefined, 1000), acc('USD', 1000)])).toBe('ok');
    expect(drawdownBasis([acc(undefined, 1000), acc('INR', 1000)])).toBe('mixed');
  });
});
