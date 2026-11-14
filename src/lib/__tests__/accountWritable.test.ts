import { describe, expect, it } from 'vitest';
import { READ_ONLY_REASON, readOnlyAccountIds } from '../accountWritable';

describe('READ_ONLY_REASON', () => {
  it('fits both read-only states: it never says a free trial ended (a lapsed Pro user sees it too)', () => {
    expect(READ_ONLY_REASON).toBe('Your journal is read-only. Upgrade to Pro to add, edit or delete.');
    expect(READ_ONLY_REASON).not.toMatch(/trial/i);
  });
});

describe('readOnlyAccountIds', () => {
  const accounts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('is empty without a writable list', () => {
    expect(readOnlyAccountIds(accounts, null).size).toBe(0);
    expect(readOnlyAccountIds(accounts, undefined).size).toBe(0);
  });

  it('marks the accounts outside the chosen two', () => {
    expect([...readOnlyAccountIds(accounts, ['a', 'b'])]).toEqual(['c']);
  });
});
