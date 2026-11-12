import { describe, expect, it } from 'vitest';
import { readOnlyAccountIds } from '../accountWritable';

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
