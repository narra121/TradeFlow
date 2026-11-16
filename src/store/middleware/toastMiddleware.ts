import { Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { isFulfilled, isRejectedWithValue } from '@reduxjs/toolkit';
import { readApiError } from '@/lib/apiError';

interface ReduxAction {
  type: string;
  payload?: unknown;
  meta?: { arg?: { endpointName?: string } };
}

let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 300;

function showToast(type: 'success' | 'error', message: string, description?: string) {
  const now = Date.now();
  if (now - lastToastTime < TOAST_DEBOUNCE_MS) return;
  lastToastTime = now;
  toast[type](message, description ? { description } : undefined);
}

export function _resetToastDebounce() {
  lastToastTime = 0;
}

/**
 * D.6: a result the user can see where they acted is not announced, and a failure is shown inline where the action was
 * taken. A global toast is therefore opt-in per endpoint: our wording says what failed, the API's own message says why.
 */
const SUCCESS_TOASTS: Record<string, string> = {
  createSubscription: 'Subscription created',
  cancelSubscription: 'Subscription cancelled',
  pauseSubscription: 'Subscription paused',
  resumeSubscription: 'Subscription resumed',
  undoCancellation: 'Cancellation undone - your subscription will continue',
  deleteAccount: 'Account deleted',
  deleteUserAccount: 'Account deleted',
};

/** Failures with no inline place on screen: deletes from a menu or a confirm dialog, subscription changes. */
const ERROR_TOASTS: Record<string, string> = {
  deleteTrade: "Couldn't delete the trade. Try again.",
  bulkDeleteTrades: "Couldn't delete the trades. Try again.",
  deleteAccount: "Couldn't delete the account. Try again.",
  deleteRule: "Couldn't delete the rule. Try again.",
  updateAccountStatus: "Couldn't change the account status. Try again.",
  createSubscription: "Couldn't start the subscription. Try again.",
  cancelSubscription: "Couldn't cancel the subscription. Try again.",
  pauseSubscription: "Couldn't pause the subscription. Try again.",
  resumeSubscription: "Couldn't resume the subscription. Try again.",
  undoCancellation: "Couldn't undo the cancellation. Try again.",
  logout: "Couldn't log out. Try again.",
};

export const toastMiddleware: Middleware = () => (next) => (action: unknown) => {
  const result = next(action);
  const a = action as ReduxAction;
  if (typeof a?.type !== 'string' || !a.type.startsWith('api/executeMutation')) return result;
  const endpointName = a.meta?.arg?.endpointName;
  if (!endpointName) return result;

  if (isFulfilled(action) && SUCCESS_TOASTS[endpointName]) showToast('success', SUCCESS_TOASTS[endpointName]);
  if ((isRejectedWithValue(action) || a.type.includes('rejected')) && ERROR_TOASTS[endpointName]) {
    // 402s open the upgrade dialog (lib/planErrors.ts).
    if ((a.payload as { status?: number } | undefined)?.status === 402) return result;
    showToast('error', ERROR_TOASTS[endpointName], readApiError(a.payload, '').message);
  }
  return result;
};
