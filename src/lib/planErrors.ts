/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
import { readApiError } from '@/lib/apiError';

export type PlanErrorCode = 'QUOTA_EXCEEDED' | 'PLAN_REQUIRED' | 'TRIAL_EXPIRED';

/** The server's 402 for a write after the trial (or a lapsed Pro); JournalAWSSetup src/app/billing/middleware.ts. */
export const TRIAL_EXPIRED_MESSAGE = 'Your free trial has ended. Upgrade to Pro to add, edit or delete.';

export interface PlanSignal {
  code: PlanErrorCode;
  feature?: string;
  limit?: number;
  resetsAt?: string;
  message: string;
  /** Mutations open the upgrade dialog; queries render a locked preview in place. */
  kind: 'mutation' | 'query';
}

export const PLAN_SIGNAL_EVENT = 'tq:plan-signal';

/** One place that turns a 402 body (`{ errorCode, error: { code, feature, limit, resetsAt } }`, possibly wrapped) into a signal. */
export function classifyPlanError(status: number | undefined, body: unknown, kind: PlanSignal['kind'] = 'mutation'): PlanSignal | null {
  if (status !== 402) return null;
  const root = (body ?? {}) as Record<string, any>;
  const err = (typeof root.error === 'object' && root.error ? root.error : root) as Record<string, any>;
  // Only writes are refused after the trial, so this always opens the upgrade dialog.
  if (root.errorCode === 'TRIAL_EXPIRED' || err.code === 'TRIAL_EXPIRED') {
    return { code: 'TRIAL_EXPIRED', message: (typeof root.message === 'string' && root.message) || TRIAL_EXPIRED_MESSAGE, kind: 'mutation' };
  }
  const code: PlanErrorCode = err.code === 'PLAN_REQUIRED' || root.errorCode === 'PLAN_REQUIRED' ? 'PLAN_REQUIRED' : 'QUOTA_EXCEEDED';
  const limit = typeof err.limit === 'number' ? err.limit : undefined;
  return {
    code,
    feature: typeof err.feature === 'string' ? err.feature : undefined,
    limit,
    resetsAt: typeof err.resetsAt === 'string' ? err.resetsAt : undefined,
    message:
      (typeof err.message === 'string' && err.message) ||
      (typeof root.message === 'string' && root.message) ||
      (code === 'PLAN_REQUIRED' ? 'This feature is part of Pro.' : 'You have reached your plan limit.'),
    kind,
  };
}

export function emitPlanSignal(signal: PlanSignal): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PlanSignal>(PLAN_SIGNAL_EVENT, { detail: signal }));
}

/**
 * A write the plan refused: store/api/baseApi.ts turns every 402 of a mutation into the upgrade dialog, so the place
 * the action was taken shows nothing more (D.6: a failure is shown once).
 */
export function isPlanRefusal(err: unknown): boolean {
  return readApiError(err).status === 402;
}
