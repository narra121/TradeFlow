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
});
