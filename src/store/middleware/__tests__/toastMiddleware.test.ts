import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sonner toast
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
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

  describe('return value', () => {
    it('always returns the result from next()', () => {
      const expectedResult = { type: 'test', processed: true };
      next.mockReturnValue(expectedResult);

      const result = invoke({ type: 'api/executeMutation/fulfilled', meta: { arg: { endpointName: 'createTrade' }, requestId: 'test-id', requestStatus: 'fulfilled' }, payload: {} });
      expect(result).toBe(expectedResult);
    });
  });
});
