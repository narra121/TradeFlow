import { describe, expect, it } from 'vitest';
import { freeTextWidth, optionSymbol, symbolPinWidth } from '../TradeTable';
import type { Trade } from '@/types/trade';

const t = (over: Partial<Trade>) => ({ id: 'x', symbol: 'EURUSD', direction: 'LONG', ...over }) as Trade;

describe('symbolPinWidth', () => {
  it('keeps the default 96 px for plain symbols', () => {
    expect(symbolPinWidth([t({ symbol: 'EURUSD' }), t({ symbol: 'ES' })])).toBe(96);
    expect(symbolPinWidth([])).toBe(96);
  });

  it('widens the pinned column for an option name, so it never runs into the Side column', () => {
    const opt = t({ symbol: 'BANKNIFTY', underlying: 'BANKNIFTY', assetClass: 'options', optionType: 'put', strike: 52000, expiry: '2026-11-26' });
    expect(optionSymbol(opt)).toBe('BANKNIFTY 52,000 PE · 26 Nov');
    // 28 characters measured 187 px on dev at 14 px; the column holds it with its 24 px padding.
    expect(symbolPinWidth([opt])).toBeGreaterThanOrEqual(187 + 24);
  });

  it('grows a free-text column (Strategy) to its longest value, keeps the default when shorter, caps at 200 px (R-003)', () => {
    // "E2E Strategy" measured 85 px of text on dev in the 104 px column (cut by 5 px).
    expect(freeTextWidth('strategy', 104, [t({ strategy: 'E2E Strategy' })])).toBeGreaterThanOrEqual(85 + 24);
    expect(freeTextWidth('strategy', 104, [t({ strategy: 'Breakout' })])).toBe(104);
    expect(freeTextWidth('session', 104, [t({ session: 'X'.repeat(60) })])).toBe(200);
    expect(freeTextWidth('tags', 90, [t({ strategy: 'X'.repeat(60) })])).toBe(90);
  });

  it('caps the width for very long names (the cell then truncates with the full name as its title)', () => {
    expect(symbolPinWidth([t({ symbol: 'X'.repeat(80) })])).toBe(240);
  });
});
