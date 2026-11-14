import { describe, expect, it } from 'vitest';
import { axisRange, layoutDay, lossExits, tradeSpan } from '../timeline';
import type { Trade } from '@/types/trade';

const t = (id: string, entry: string, exit: string, pnl: number): Trade => ({ id, symbol: 'X', direction: 'LONG', entryDate: entry, exitDate: exit, pnl }) as Trade;

describe('timeline layout', () => {
  it('measures a trade within its opening day, to midnight when it closes on a later day', () => {
    expect(tradeSpan(t('1', '2026-11-04T14:30:00', '2026-11-04T16:15:00', 1))).toEqual({ start: 870, end: 975 });
    expect(tradeSpan(t('2', '2026-11-03T22:00:00', '2026-11-04T01:00:00', 1))).toEqual({ start: 1320, end: 1440 });
    expect(tradeSpan(t('3', '2026-11-04T09:00:00', '', 1))).toEqual({ start: 540, end: 540 });
  });

  it('puts overlapping trades side by side and reuses a lane once it is free', () => {
    const trades = [t('a', '2026-11-04T09:00:00', '2026-11-04T10:00:00', 1), t('b', '2026-11-04T09:30:00', '2026-11-04T10:30:00', 1), t('c', '2026-11-04T10:30:00', '2026-11-04T11:00:00', 1)];
    const blocks = layoutDay(trades, [], '2026-11-04');
    expect(blocks.map((b) => [b.trade.id, b.lane, b.lanes])).toEqual([['a', 0, 2], ['b', 1, 2], ['c', 0, 2]]);
  });

  it('marks a trade opened within 15 minutes of a losing close, not a later one and not another day', () => {
    const trades = [t('loss', '2026-11-04T09:00:00', '2026-11-04T09:45:00', -20), t('quick', '2026-11-04T09:51:00', '2026-11-04T10:30:00', 5), t('late', '2026-11-04T11:00:00', '2026-11-04T11:30:00', 5)];
    const blocks = layoutDay(trades, lossExits(trades), '2026-11-04');
    expect(blocks.find((b) => b.trade.id === 'quick')?.afterLoss).toBe(6);
    expect(blocks.find((b) => b.trade.id === 'late')?.afterLoss).toBeNull();
    expect(layoutDay([trades[1]], lossExits(trades), '2026-11-05')[0].afterLoss).toBeNull();
  });

  it('pads the axis by an hour around the trades and has a default for an empty week', () => {
    expect(axisRange([t('1', '2026-11-04T09:15:00', '2026-11-04T10:45:00', 1)])).toEqual({ from: 480, to: 720 });
    expect(axisRange([])).toEqual({ from: 480, to: 1080 });
  });
});
