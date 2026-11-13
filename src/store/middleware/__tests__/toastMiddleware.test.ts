import { describe, it, expect, vi, beforeEach } from 'vitest';

const success = vi.fn();
const error = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (m: string) => success(m), error: (m: string, o?: { description?: string }) => error(m, o) } }));

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
    run(fulfilled('deleteUserAccount', { message: 'server text' }));
    expect(success).toHaveBeenCalledWith('Account deleted');
  });

  it('says what failed in our words and why in the API message', () => {
    run(rejected('deleteTrade'));
    expect(error).toHaveBeenCalledWith("Couldn't delete the trade. Try again.", { description: 'boom' });
  });

  it('shows the API message of a 4xx, and the connection message only when nothing answered', () => {
    run(rejected('deleteRule', { status: 409, data: { success: false, message: 'This rule is used by 3 trades', errorCode: 'RULE_IN_USE' } }));
    expect(error).toHaveBeenLastCalledWith("Couldn't delete the rule. Try again.", { description: 'This rule is used by 3 trades' });
    _resetToastDebounce();
    run(rejected('deleteRule', { status: 'FETCH_ERROR', data: 'x' }));
    expect(error.mock.calls.at(-1)?.[1]?.description).toMatch(/internet connection/i);
    _resetToastDebounce();
    run(rejected('deleteRule', { status: 502, data: '<html>Bad Gateway</html>' }));
    expect(error.mock.calls.at(-1)?.[1]?.description).toMatch(/temporarily unavailable/);
  });

  it('shows only our title when the failure carries no payload', () => {
    run({ type: 'api/executeMutation/rejected', meta: { arg: { endpointName: 'deleteTrade' }, requestStatus: 'rejected', requestId: 'r' }, error: { message: 'Rejected' } });
    expect(error).toHaveBeenCalledWith("Couldn't delete the trade. Try again.", undefined);
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
