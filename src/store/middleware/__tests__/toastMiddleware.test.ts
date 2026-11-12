import { describe, it, expect, vi, beforeEach } from 'vitest';

const success = vi.fn();
const error = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));

import { toastMiddleware, _resetToastDebounce } from '../toastMiddleware';

const run = (action: unknown) => {
  const next = vi.fn((a) => a);
  const out = toastMiddleware({} as never)(next)(action);
  return { next, out };
};
const fulfilled = (endpointName: string, payload: unknown = {}) => ({ type: 'api/executeMutation/fulfilled', meta: { arg: { endpointName }, requestStatus: 'fulfilled', requestId: 'r' }, payload });
const rejected = (endpointName: string, payload: unknown = { status: 500, data: { message: 'boom' } }) => ({ type: 'api/executeMutation/rejected', meta: { arg: { endpointName }, requestStatus: 'rejected', requestId: 'r' }, payload, error: { message: 'Rejected' } });

describe('toastMiddleware (D.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetToastDebounce();
  });

  it('always passes the action on and returns the result', () => {
    const a = { type: 'x/y' };
    const { next, out } = run(a);
    expect(next).toHaveBeenCalledWith(a);
    expect(out).toBe(a);
  });

  it('stays silent when a save is visible where it was made', () => {
    for (const e of ['updatePreferences', 'updateProfile', 'updateSavedOptions', 'updateTrade', 'createTrade', 'updateGoal', 'extractScreenshots']) run(fulfilled(e, { message: 'Saved' }));
    expect(success).not.toHaveBeenCalled();
  });

  it('shows no toast for the auth steps whose result is already on the page', () => {
    for (const e of ['signup', 'confirmSignup', 'forgotPassword', 'resetPassword']) run(fulfilled(e, { message: 'server text' }));
    expect(success).not.toHaveBeenCalled();
  });

  it('announces only the opt-in results, in our own words', () => {
    run(fulfilled('deleteAccount', { message: 'server text' }));
    expect(success).toHaveBeenCalledWith('Account deleted');
  });

  it('never shows the raw server message of a failure', () => {
    run(rejected('deleteTrade'));
    expect(error).toHaveBeenCalledWith("Couldn't delete the trade. Try again.");
    expect(JSON.stringify(error.mock.calls)).not.toContain('boom');
  });

  it('leaves failures of in-place saves to the control that made them', () => {
    for (const e of ['updatePreferences', 'updateTrade', 'createTrade', 'login', 'signup']) run(rejected(e));
    expect(error).not.toHaveBeenCalled();
  });

  it('does not toast a 402 (the upgrade dialog opens instead)', () => {
    run(rejected('createSubscription', { status: 402, data: {} }));
    expect(error).not.toHaveBeenCalled();
  });

  it('never toasts for queries', () => {
    run({ type: 'api/executeQuery/rejected', meta: { arg: { endpointName: 'getTrades' } }, payload: { status: 500 } });
    run({ type: 'api/executeQuery/fulfilled', meta: { arg: { endpointName: 'getTrades' } }, payload: {} });
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('ignores malformed actions', () => {
    for (const a of [{}, { type: null }, { type: 5 }, { type: 'api/executeMutation/fulfilled' }, { type: 'api/executeMutation/fulfilled', meta: {} }]) run(a);
    expect(success).not.toHaveBeenCalled();
  });
});
