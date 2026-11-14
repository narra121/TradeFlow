import { describe, expect, it } from 'vitest';
import { copy } from '..';

function strings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (typeof node === 'function') out.push(String((node as (...a: number[]) => string)(3, 5, 9)), String((node as (...a: number[]) => string)(1, 3, 9)));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => strings(v, out));
  return out;
}

describe('interface copy (D.5, E-029)', () => {
  const all = strings(copy);

  it('has no exclamation marks, no "please" and no "Oops"', () => {
    expect(all.filter((s) => /!|\bplease\b|oops/i.test(s))).toEqual([]);
  });

  it('is sentence case without trailing ellipsis fragments', () => {
    expect(all.filter((s) => s.trim() !== s || s.endsWith('…'))).toEqual([]);
  });

  it('keeps the numbers in the sentence and the singular right', () => {
    expect(copy.notices.trial(1, '20 Nov')).toBe('Free trial: 1 day left. On 20 Nov your journal becomes read-only unless you upgrade.');
    expect(copy.notices.noAccount(1)).toBe('1 trade has no account and is not counted in statistics.');
    expect(copy.notices.noAccount(3)).toBe('3 trades have no account and are not counted in statistics.');
  });
});
