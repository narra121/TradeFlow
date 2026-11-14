import { emitPlanSignal, TRIAL_EXPIRED_MESSAGE } from '@/lib/planErrors';

/** Opens the upgrade dialog the server's TRIAL_EXPIRED answer opens, without sending a write that would be refused. */
export function openTrialExpired(): void {
  emitPlanSignal({ code: 'TRIAL_EXPIRED', message: TRIAL_EXPIRED_MESSAGE, kind: 'mutation' });
}

/** Runs `write` on trial and Pro; while read-only opens the upgrade dialog instead. */
export function guardWrite(readOnly: boolean, write: () => void): void {
  if (readOnly) openTrialExpired();
  else write();
}
