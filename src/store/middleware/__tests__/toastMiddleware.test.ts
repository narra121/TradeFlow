import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sonner toast
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const toastDismissMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
    dismiss: () => toastDismissMock(),
  },
}));

import { toastMiddleware } from '../toastMiddleware';

describe('toastMiddleware', () => {
  let next: ReturnType<typeof vi.fn>;
  let invoke: (action: any) => any;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn((action) => action);
    // toastMiddleware is: () => (next) => (action) => ...
    const middlewareWithStore = toastMiddleware({} as any);
    invoke = middlewareWithStore(next);
  });

  describe('passthrough behavior', () => {
    it('passes action to next and returns its result', () => {
      const action = { type: 'some/randomAction' };
      const result = invoke(action);
      expect(next).toHaveBeenCalledWith(action);
      expect(result).toEqual(action);
    });

    it('does not show toast for non-RTK-Query actions', () => {
      invoke({ type: 'auth/setAuth', payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('does not show toast for actions without meta.arg', () => {
      invoke({ type: 'api/executeMutation/fulfilled' });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('skipped endpoints', () => {
    it('skips toast for getProfile query', () => {
      invoke({
        type: 'api/executeQuery/fulfilled',
        meta: { arg: { endpointName: 'getProfile' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: { data: 'test' },
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('skips toast for login endpoint', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'login' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: { token: 'abc' },
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('skips toast for getTrades query', () => {
      invoke({
        type: 'api/executeQuery/fulfilled',
        meta: { arg: { endpointName: 'getTrades' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: [],
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('skips toast for getAccounts query', () => {
      invoke({
        type: 'api/executeQuery/fulfilled',
        meta: { arg: { endpointName: 'getAccounts' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: [],
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('skips toast for all listed skip endpoints', () => {
      const skipEndpoints = [
        'getProfile', 'getSubscription', 'getSavedOptions', 'getHourlyStats',
        'getDailyWinRate', 'getSymbolDistribution', 'getStrategyDistribution',
        'getRules', 'getTrades', 'getAccounts', 'login',
      ];
      for (const ep of skipEndpoints) {
        vi.clearAllMocks();
        invoke({
          type: 'api/executeQuery/fulfilled',
          meta: { arg: { endpointName: ep }, requestId: 'test-id', requestStatus: 'fulfilled' },
          payload: {},
        });
        expect(toastSuccessMock).not.toHaveBeenCalled();
        expect(toastErrorMock).not.toHaveBeenCalled();
      }
    });
  });

  describe('success toasts on fulfilled mutations', () => {
    it('shows success toast for createTrade', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Trade created successfully');
    });

    it('shows success toast for deleteTrade', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'deleteTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Trade deleted successfully');
    });

    it('shows success toast for updateProfile', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'updateProfile' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('shows success toast for signup', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'signup' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Account created! Please check your email to verify.');
    });

    it('shows success toast for confirmSignup', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'confirmSignup' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Email verified successfully!');
    });

    it('prefers _apiMessage from payload over default message', () => {
      const payload = { someData: true };
      Object.defineProperty(payload, '_apiMessage', {
        value: 'Custom API message',
        enumerable: false,
      });
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload,
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Custom API message');
    });

    it('prefers payload.message over default message when no _apiMessage', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: { message: 'Custom message from response' },
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Custom message from response');
    });

    it('does not show toast for unknown fulfilled endpoint with no message', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'unknownEndpoint' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('shows toast for known endpoints with mapped messages', () => {
      const knownEndpoints: Record<string, string> = {
        'createTrade': 'Trade created successfully',
        'updateTrade': 'Trade updated successfully',
        'deleteTrade': 'Trade deleted successfully',
        'bulkDeleteTrades': 'Trades deleted successfully',
        'bulkImportTrades': 'Trades imported successfully',
        'createAccount': 'Account created successfully',
        'updateAccount': 'Account updated successfully',
        'updateAccountStatus': 'Account status updated',
        'deleteAccount': 'Account deleted successfully',
        'createRule': 'Rule created successfully',
        'updateRule': 'Rule updated successfully',
        'toggleRule': 'Rule toggled successfully',
        'deleteRule': 'Rule deleted successfully',
      };

      for (const [endpoint, message] of Object.entries(knownEndpoints)) {
        vi.clearAllMocks();
        invoke({
          type: 'api/executeMutation/fulfilled',
          meta: { arg: { endpointName: endpoint }, requestId: 'test-id', requestStatus: 'fulfilled' },
          payload: {},
        });
        expect(toastSuccessMock).toHaveBeenCalledWith(message);
      }
    });
  });

  describe('error toasts on rejected mutations', () => {
    it('shows error toast with payload.data string', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: 'Validation failed' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Validation failed');
    });

    it('shows error toast with payload.data.message', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'updateTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: { message: 'Trade not found' } },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Trade not found');
    });

    it('shows error toast with payload.error string', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'deleteTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { error: 'Unauthorized access' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Unauthorized access');
    });

    it('shows error toast with payload.message string', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createAccount' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { message: 'Account limit reached' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Account limit reached');
    });

    it('falls back to action.error.message', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'updateAccount' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {},
        error: { message: 'Network failure' },
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Network failure');
    });

    it('shows default error message when no specific message found', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'deleteAccount' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {},
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('An error occurred');
    });

    it('shows validation error details from errors array', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {
          data: {
            message: 'Invalid request body',
            errors: [
              { code: 'VALIDATION_ERROR', field: '#/required', message: "must have required property 'quantity'" },
              { code: 'VALIDATION_ERROR', field: '/exitPrice', message: 'must be >= 0' },
            ],
          },
        },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Invalid request body: required: must have required property 'quantity', exitPrice: must be >= 0"
      );
    });

    it('shows validation error details from details array', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'updateTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {
          data: {
            message: 'Validation failed',
            details: [
              { field: '/symbol', message: 'must be string' },
            ],
          },
        },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Validation failed: symbol: must be string'
      );
    });

    it('shows message without details when errors array is empty', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {
          data: {
            message: 'Something went wrong',
            errors: [],
          },
        },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Something went wrong');
    });

    it('skips error toast for login endpoint', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'login' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: 'Invalid credentials' },
        error: {},
      });
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('skips error toast for signup endpoint', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'signup' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: 'Email already exists' },
        error: {},
      });
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('shows error toast for non-auth rejected endpoints', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createRule' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: 'Rule creation failed' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Rule creation failed');
    });
  });

  describe('error edge cases', () => {
    it('handles rejected action with null payload gracefully', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: null,
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('An error occurred');
    });

    it('handles rejected action with undefined payload gracefully', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'deleteTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: undefined,
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('An error occurred');
    });

    it('handles nested error data with non-string message', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'updateTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { data: { notMessage: true } },
        error: {},
      });
      // No message field found, falls through to default
      expect(toastErrorMock).toHaveBeenCalledWith('An error occurred');
    });

    it('handles FETCH_ERROR type from network failures', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { status: 'FETCH_ERROR', data: 'Network error. Please try again.' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Network error. Please try again.');
    });

    it('handles TIMEOUT_ERROR type', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'bulkImportTrades' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: { status: 'TIMEOUT_ERROR', data: 'Request timed out. Please try again.' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Request timed out. Please try again.');
    });

    it('shows multiple validation errors joined with comma', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {
          data: {
            message: 'Validation failed',
            errors: [
              { code: 'VALIDATION_ERROR', field: '#/required', message: "must have required property 'symbol'" },
              { code: 'VALIDATION_ERROR', field: '#/required', message: "must have required property 'quantity'" },
              { code: 'VALIDATION_ERROR', field: '/exitPrice', message: 'must be >= 0' },
            ],
          },
        },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Validation failed: required: must have required property 'symbol', required: must have required property 'quantity', exitPrice: must be >= 0"
      );
    });

    it('handles errors array with missing field property', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'updateAccount' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {
          data: {
            message: 'Bad request',
            errors: [
              { message: 'Something went wrong' },
            ],
          },
        },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Bad request: Something went wrong');
    });

    it('does not show success toast for fulfilled query (only mutations)', () => {
      invoke({
        type: 'api/executeQuery/fulfilled',
        meta: { arg: { endpointName: 'unknownQuery' }, requestId: 'test-id', requestStatus: 'fulfilled' },
        payload: { data: [] },
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('handles completely empty error object', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'deleteAccount' }, requestId: 'test-id', requestStatus: 'rejected' },
        payload: {},
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('An error occurred');
    });
  });

  describe('return value', () => {
    it('always returns the result from next()', () => {
      const expectedResult = { type: 'test', processed: true };
      next.mockReturnValue(expectedResult);

      const result = invoke({ type: 'api/executeMutation/fulfilled', meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' }, payload: {} });
      expect(result).toBe(expectedResult);
    });
  });

  describe('concurrent fulfilled and rejected actions', () => {
    it('handles a fulfilled action followed by a rejected action for different endpoints', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'req-1', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Trade created successfully');
      expect(toastErrorMock).not.toHaveBeenCalled();

      vi.clearAllMocks();

      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'deleteTrade' }, requestId: 'req-2', requestStatus: 'rejected' },
        payload: { data: 'Trade not found' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Trade not found');
      expect(toastSuccessMock).not.toHaveBeenCalled();
    });

    it('handles a rejected action followed by a fulfilled action for the same endpoint', () => {
      invoke({
        type: 'api/executeMutation/rejected',
        meta: { arg: { endpointName: 'createAccount' }, requestId: 'req-1', requestStatus: 'rejected' },
        payload: { data: 'Duplicate account' },
        error: {},
      });
      expect(toastErrorMock).toHaveBeenCalledWith('Duplicate account');

      vi.clearAllMocks();

      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createAccount' }, requestId: 'req-2', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Account created successfully');
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('handles multiple fulfilled actions in sequence without interference', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'createTrade' }, requestId: 'req-1', requestStatus: 'fulfilled' },
        payload: {},
      });
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: { endpointName: 'updateProfile' }, requestId: 'req-2', requestStatus: 'fulfilled' },
        payload: {},
      });
      expect(toastSuccessMock).toHaveBeenCalledTimes(2);
      expect(toastSuccessMock).toHaveBeenNthCalledWith(1, 'Trade created successfully');
      expect(toastSuccessMock).toHaveBeenNthCalledWith(2, 'Profile updated successfully');
    });
  });

  describe('actions without type string', () => {
    it('does not toast for action with undefined type', () => {
      invoke({ type: undefined, payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('does not toast for action with null type', () => {
      invoke({ type: null, payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('does not toast for action with numeric type', () => {
      invoke({ type: 42, payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('still calls next for actions without string type', () => {
      const action = { type: undefined, payload: 'test' };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
    });
  });

  describe('malformed meta.arg handling', () => {
    it('does not toast when meta.arg is undefined', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: undefined },
        payload: {},
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('does not toast when meta.arg is null', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: { arg: null },
        payload: {},
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('does not toast when meta is undefined', () => {
      invoke({
        type: 'api/executeMutation/fulfilled',
        meta: undefined,
        payload: {},
      });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('still passes action through to next when meta.arg is malformed', () => {
      const action = {
        type: 'api/executeMutation/fulfilled',
        meta: { arg: null },
        payload: {},
      };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
    });
  });

  describe('action with empty type string', () => {
    it('does not toast for empty string type', () => {
      invoke({ type: '', payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it('still passes action through to next with empty type string', () => {
      const action = { type: '', payload: 'test' };
      invoke(action);
      expect(next).toHaveBeenCalledWith(action);
    });

    it('does not toast for whitespace-only type string', () => {
      invoke({ type: '   ', payload: {} });
      expect(toastSuccessMock).not.toHaveBeenCalled();
      expect(toastErrorMock).not.toHaveBeenCalled();
    });
  });
});
