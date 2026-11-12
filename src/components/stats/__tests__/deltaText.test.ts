import { describe, expect, it } from 'vitest';
import { describeDelta } from '../deltaText';

const base = { name: 'Oct', spokenName: 'October' };

describe('describeDelta', () => {
  it('writes money change as arrow, amount and the compared period', () => {
    expect(describeDelta({ ...base, kind: 'money', current: 1412.3, previous: 1092.3, currency: 'USD' })).toEqual({
      text: '▲ $320.00 vs Oct',
      spoken: 'up $320.00 versus October',
      direction: 'up',
    });
  });

  it('says better or worse where lower is better', () => {
    const d = describeDelta({ ...base, kind: 'pts', current: 2.1, previous: 2.5, lowerIsBetter: true });
    expect(d?.text).toBe('▼ 0.4 pts vs Oct · better');
    expect(d?.spoken).toBe('down 0.4 pts versus October, better');
    expect(describeDelta({ ...base, kind: 'pts', current: 3, previous: 2.5, lowerIsBetter: true })?.text).toContain('worse');
  });

  it('formats R and ratio changes', () => {
    expect(describeDelta({ ...base, kind: 'r', current: 0.62, previous: 0.72 })?.text).toBe('▼ 0.10R vs Oct');
    expect(describeDelta({ ...base, kind: 'ratio', current: 1.84, previous: 1.63 })?.text).toBe('▲ 0.21 vs Oct');
  });

  it('shows no change instead of a zero arrow', () => {
    expect(describeDelta({ ...base, kind: 'money', current: 5, previous: 5, currency: 'USD' })?.direction).toBe('flat');
  });

  it('is null when a side is missing or the profit factor is the no-loss sentinel', () => {
    expect(describeDelta({ ...base, kind: 'money', current: 5, previous: undefined })).toBeNull();
    expect(describeDelta({ ...base, kind: 'ratio', current: 999.99, previous: 1.2 })).toBeNull();
  });
});
