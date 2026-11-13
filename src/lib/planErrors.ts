/* eslint-disable @typescript-eslint/no-explicit-any -- this file reads untyped backend JSON envelopes */
export type PlanErrorCode = 'QUOTA_EXCEEDED' | 'PLAN_REQUIRED';

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

/** One place that turns a 402 body (`{ error: { code, feature, limit, resetsAt } }`, possibly wrapped) into a signal. */
export function classifyPlanError(status: number | undefined, body: unknown, kind: PlanSignal['kind'] = 'mutation'): PlanSignal | null {
  if (status !== 402) return null;
  const root = (body ?? {}) as Record<string, any>;
  const err = (typeof root.error === 'object' && root.error ? root.error : root) as Record<string, any>;
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
