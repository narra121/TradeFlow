import { describe, it, expect } from 'vitest';
import accountsReducer, { setSelectedAccount, type AccountsState } from '../accountsSlice';

describe('accountsSlice', () => {
  const initialState: AccountsState = {
    selectedAccountId: null,
  };

  describe('initial state', () => {
    it('has selectedAccountId set to null', () => {
      const state = accountsReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual({ selectedAccountId: null });
    });

    it('has the correct shape', () => {
      const state = accountsReducer(undefined, { type: '@@INIT' });
      expect(state).toHaveProperty('selectedAccountId');
      expect(Object.keys(state)).toHaveLength(1);
    });
  });

  describe('setSelectedAccount', () => {
    it('sets selectedAccountId to a string value', () => {
      const state = accountsReducer(initialState, setSelectedAccount('account-123'));
      expect(state.selectedAccountId).toBe('account-123');
    });

    it('sets selectedAccountId to null', () => {
      const stateWithAccount: AccountsState = { selectedAccountId: 'account-123' };
      const state = accountsReducer(stateWithAccount, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });

    it('overwrites an existing selectedAccountId', () => {
      const stateWithAccount: AccountsState = { selectedAccountId: 'account-123' };
      const state = accountsReducer(stateWithAccount, setSelectedAccount('account-456'));
      expect(state.selectedAccountId).toBe('account-456');
    });

    it('handles empty string as account id', () => {
      const state = accountsReducer(initialState, setSelectedAccount(''));
      expect(state.selectedAccountId).toBe('');
    });

    it('handles UUID-style account ids', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const state = accountsReducer(initialState, setSelectedAccount(uuid));
      expect(state.selectedAccountId).toBe(uuid);
    });

    it('is idempotent when setting the same value', () => {
      const stateWithAccount: AccountsState = { selectedAccountId: 'account-123' };
      const state = accountsReducer(stateWithAccount, setSelectedAccount('account-123'));
      expect(state.selectedAccountId).toBe('account-123');
    });
  });

  describe('state transitions', () => {
    it('handles select -> deselect cycle', () => {
      let state = accountsReducer(initialState, setSelectedAccount('account-1'));
      expect(state.selectedAccountId).toBe('account-1');

      state = accountsReducer(state, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });

    it('handles switching between accounts', () => {
      let state = accountsReducer(initialState, setSelectedAccount('account-1'));
      expect(state.selectedAccountId).toBe('account-1');

      state = accountsReducer(state, setSelectedAccount('account-2'));
      expect(state.selectedAccountId).toBe('account-2');

      state = accountsReducer(state, setSelectedAccount('account-3'));
      expect(state.selectedAccountId).toBe('account-3');
    });

    it('does not mutate the original state', () => {
      const originalState: AccountsState = { selectedAccountId: 'original' };
      const frozenState = Object.freeze({ ...originalState });
      // Immer handles immutability internally, but verify the result is a new object
      const newState = accountsReducer(frozenState as AccountsState, setSelectedAccount('new'));
      expect(newState.selectedAccountId).toBe('new');
      expect(frozenState.selectedAccountId).toBe('original');
    });
  });

  describe('unknown actions', () => {
    it('returns current state for unknown actions', () => {
      const state: AccountsState = { selectedAccountId: 'test' };
      const newState = accountsReducer(state, { type: 'UNKNOWN_ACTION' });
      expect(newState).toEqual(state);
    });
  });

  describe('setSelectedAccountId with valid ID', () => {
    it('sets selectedAccountId to a numeric-style string ID', () => {
      const state = accountsReducer(initialState, setSelectedAccount('12345'));
      expect(state.selectedAccountId).toBe('12345');
    });

    it('sets selectedAccountId to a long alphanumeric ID', () => {
      const longId = 'acc-abcdefghijklmnopqrstuvwxyz-1234567890';
      const state = accountsReducer(initialState, setSelectedAccount(longId));
      expect(state.selectedAccountId).toBe(longId);
    });

    it('sets selectedAccountId to a UUID and it persists through unknown actions', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      let state = accountsReducer(initialState, setSelectedAccount(uuid));
      expect(state.selectedAccountId).toBe(uuid);

      state = accountsReducer(state, { type: 'SOME_UNRELATED/action' });
      expect(state.selectedAccountId).toBe(uuid);
    });
  });

  describe('setSelectedAccountId with null (deselect)', () => {
    it('deselects by setting null from a selected state', () => {
      const stateWithAccount: AccountsState = { selectedAccountId: 'account-abc' };
      const state = accountsReducer(stateWithAccount, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });

    it('deselect is idempotent on already null state', () => {
      const state = accountsReducer(initialState, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });

    it('deselect produces the same shape as initial state', () => {
      const stateWithAccount: AccountsState = { selectedAccountId: 'account-to-deselect' };
      const state = accountsReducer(stateWithAccount, setSelectedAccount(null));
      expect(state).toEqual(initialState);
    });
  });

  describe('initial state has null selectedAccountId', () => {
    it('reducer returns selectedAccountId as null when called with undefined state', () => {
      const state = accountsReducer(undefined, { type: '@@INIT' });
      expect(state.selectedAccountId).toBeNull();
    });

    it('initial state has exactly one property', () => {
      const state = accountsReducer(undefined, { type: '@@INIT' });
      expect(Object.keys(state)).toEqual(['selectedAccountId']);
    });

    it('initial state selectedAccountId is strictly null, not undefined or empty string', () => {
      const state = accountsReducer(undefined, { type: '@@INIT' });
      expect(state.selectedAccountId).not.toBeUndefined();
      expect(state.selectedAccountId).not.toBe('');
      expect(state.selectedAccountId).toBeNull();
    });
  });

  describe('rapid account switching', () => {
    it('handles many rapid switches and ends on the last value', () => {
      let state: AccountsState = { selectedAccountId: null };
      const accountIds = ['acc-1', 'acc-2', 'acc-3', 'acc-4', 'acc-5', 'acc-6', 'acc-7', 'acc-8', 'acc-9', 'acc-10'];
      for (const id of accountIds) {
        state = accountsReducer(state, setSelectedAccount(id));
      }
      expect(state.selectedAccountId).toBe('acc-10');
    });

    it('handles switching between two accounts repeatedly', () => {
      let state: AccountsState = { selectedAccountId: null };
      for (let i = 0; i < 5; i++) {
        state = accountsReducer(state, setSelectedAccount('acc-A'));
        expect(state.selectedAccountId).toBe('acc-A');
        state = accountsReducer(state, setSelectedAccount('acc-B'));
        expect(state.selectedAccountId).toBe('acc-B');
      }
    });

    it('handles switching with null interspersed', () => {
      let state: AccountsState = { selectedAccountId: null };
      state = accountsReducer(state, setSelectedAccount('acc-1'));
      expect(state.selectedAccountId).toBe('acc-1');
      state = accountsReducer(state, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
      state = accountsReducer(state, setSelectedAccount('acc-2'));
      expect(state.selectedAccountId).toBe('acc-2');
      state = accountsReducer(state, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });
  });

  describe('handles undefined accountId', () => {
    it('sets selectedAccountId to undefined when dispatched with undefined payload', () => {
      const state = accountsReducer(initialState, setSelectedAccount(undefined as unknown as string | null));
      expect(state.selectedAccountId).toBeUndefined();
    });

    it('can recover from undefined back to a valid ID', () => {
      let state = accountsReducer(initialState, setSelectedAccount(undefined as unknown as string | null));
      expect(state.selectedAccountId).toBeUndefined();

      state = accountsReducer(state, setSelectedAccount('recovered-account'));
      expect(state.selectedAccountId).toBe('recovered-account');
    });

    it('can recover from undefined back to null', () => {
      let state = accountsReducer(initialState, setSelectedAccount(undefined as unknown as string | null));
      state = accountsReducer(state, setSelectedAccount(null));
      expect(state.selectedAccountId).toBeNull();
    });
  });
});
