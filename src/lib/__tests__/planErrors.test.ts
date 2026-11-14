import { describe, expect, it, vi } from 'vitest';
import { PLAN_SIGNAL_EVENT, TRIAL_EXPIRED_MESSAGE, classifyPlanError, emitPlanSignal } from '../planErrors';

describe('classifyPlanError', () => {
  it('ignores non-402 responses', () => {
    expect(classifyPlanError(403, { error: { code: 'QUOTA_EXCEEDED' } })).toBeNull();
    expect(classifyPlanError(undefined, null)).toBeNull();
  });

  it('reads the contract payload', () => {
    const s = classifyPlanError(402, { error: { code: 'QUOTA_EXCEEDED', feature: 'ai_extract', limit: 5, resetsAt: '2026-12-01T00:00:00Z' } });
    expect(s).toMatchObject({ code: 'QUOTA_EXCEEDED', feature: 'ai_extract', limit: 5, resetsAt: '2026-12-01T00:00:00Z', kind: 'mutation' });
  });

  it('classifies PLAN_REQUIRED and carries the query kind', () => {
    const s = classifyPlanError(402, { error: { code: 'PLAN_REQUIRED', feature: 'advanced_analytics' } }, 'query');
    expect(s).toMatchObject({ code: 'PLAN_REQUIRED', feature: 'advanced_analytics', kind: 'query' });
    expect(s?.message).toMatch(/Pro/);
  });

  it('turns TRIAL_EXPIRED into a mutation signal with the API message, never a quota signal', () => {
    const body = { success: false, errorCode: 'TRIAL_EXPIRED', message: 'Your free trial has ended. Upgrade to Pro to add, edit or delete.' };
    expect(classifyPlanError(402, body, 'query')).toEqual({ code: 'TRIAL_EXPIRED', message: body.message, kind: 'mutation' });
    expect(classifyPlanError(402, { errorCode: 'TRIAL_EXPIRED' })?.message).toBe(TRIAL_EXPIRED_MESSAGE);
  });

  it('falls back to a quota signal for an unknown 402 body', () => {
    expect(classifyPlanError(402, 'nope')?.code).toBe('QUOTA_EXCEEDED');
  });
});

describe('emitPlanSignal', () => {
  it('dispatches a window event', () => {
    const handler = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, handler);
    emitPlanSignal({ code: 'QUOTA_EXCEEDED', message: 'x', kind: 'mutation' });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(PLAN_SIGNAL_EVENT, handler);
  });
});
