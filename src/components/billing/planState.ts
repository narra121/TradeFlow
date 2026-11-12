import { formatMoney } from '@/lib/format';
import type { EntitlementsView } from '@/hooks/useEntitlements';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `4 Nov 2026`, or `4 Nov` when `withYear` is false (D.3). Empty for a missing or invalid date. */
export function formatDay(iso: string | undefined | null, withYear = true): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

/** The days after a trial ends during which the "what changed" block and notice are shown. */
export const TRIAL_ENDED_WINDOW_DAYS = 14;

export interface PlanFacts {
  plan: 'free' | 'trial' | 'pro' | null;
  status?: string;
  trialDaysLeft?: number | null;
  trialEndsAt?: string;
  trialEndedAt?: string;
  interval?: 'month' | 'year';
  /** Major units (79 = $79). */
  amount?: number;
  currency?: string;
  renewsAt?: string;
  endsAt?: string;
  legacyPrice?: boolean;
}

export function toPlanFacts(e: EntitlementsView): PlanFacts {
  return {
    plan: e.plan,
    status: e.status,
    trialDaysLeft: e.trialDaysLeft,
    trialEndsAt: e.trialEndsAt,
    trialEndedAt: e.trialEndedAt,
    interval: e.interval,
    amount: e.amount,
    currency: e.amountCurrency,
    renewsAt: e.renewsAt,
    endsAt: e.endsAt,
    legacyPrice: e.legacyPrice,
  };
}

export type PlanStateKind = 'trial' | 'trial_ended' | 'free' | 'pro' | 'pro_canceling' | 'past_due';
export type PlanAction = 'upgrade' | 'manage' | 'update_card';

export interface PlanState {
  kind: PlanStateKind;
  /** The one sentence of the Plan & billing status block (A.10). */
  sentence: string;
  action: PlanAction;
  /** Within 14 days after the trial ended: the "what changed" block is shown. */
  showWhatChanged: boolean;
}

function daysSince(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.floor((now.getTime() - t) / 86_400_000);
}

/** Status sentence and its single action for every entitlement state. A clause whose data the API did not return is dropped, never guessed. */
export function planState(f: PlanFacts, now: Date = new Date()): PlanState {
  if (f.status === 'past_due') {
    return { kind: 'past_due', sentence: 'Your last payment failed. Update your card to keep Pro.', action: 'update_card', showWhatChanged: false };
  }
  if (f.plan === 'trial') {
    const n = f.trialDaysLeft ?? 0;
    const end = formatDay(f.trialEndsAt, false);
    const days = `${n} ${n === 1 ? 'day' : 'days'} left`;
    return {
      kind: 'trial',
      sentence: `Pro trial — ${days}. No card on file${end ? `; on ${end} you move to Free` : ''}.`,
      action: 'upgrade',
      showWhatChanged: false,
    };
  }
  if (f.plan === 'pro') {
    const legacy = f.legacyPrice ? ' (legacy price)' : '';
    if (f.status === 'canceling') {
      const end = formatDay(f.endsAt);
      return {
        kind: 'pro_canceling',
        sentence: end ? `Pro${legacy} — ends on ${end}. After that you move to Free; your trades stay.` : `Pro${legacy} — ends at the end of the paid period. After that you move to Free; your trades stay.`,
        action: 'manage',
        showWhatChanged: false,
      };
    }
    const price = typeof f.amount === 'number' && f.interval ? ` — ${formatMoney(f.amount, f.currency)} a ${f.interval}` : '';
    const renews = formatDay(f.renewsAt);
    const tail = renews ? (price ? `. Renews on ${renews}.` : ` — renews on ${renews}.`) : price ? '.' : ' — active.';
    return { kind: 'pro', sentence: `Pro${legacy}${price}${tail}`, action: 'manage', showWhatChanged: false };
  }
  const since = daysSince(f.trialEndedAt, now);
  if (f.trialEndedAt && since !== null && since <= TRIAL_ENDED_WINDOW_DAYS) {
    return { kind: 'trial_ended', sentence: `Your Pro trial ended on ${formatDay(f.trialEndedAt)}. You are on Free.`, action: 'upgrade', showWhatChanged: true };
  }
  return { kind: 'free', sentence: 'Free plan.', action: 'upgrade', showWhatChanged: false };
}

export interface PlanRowText {
  text: string;
  action?: string;
  tone: 'neutral' | 'warning' | 'error' | 'upgrade';
}

/** Sidebar footer row (E-010): trial days, `Free plan` + Upgrade, `Pro ends 3 Jan`, red `Payment failed`; nothing for active Pro. */
export function planRowText(f: PlanFacts & { isLoading?: boolean }): PlanRowText | null {
  if (!f.plan) return null;
  if (f.status === 'past_due') return { text: 'Payment failed', action: 'Update card', tone: 'error' };
  if (f.plan === 'trial') {
    const d = f.trialDaysLeft ?? 0;
    return { text: `Pro trial · ${d} ${d === 1 ? 'day' : 'days'} left`, action: d <= 3 ? 'Upgrade' : undefined, tone: d <= 3 ? 'warning' : 'neutral' };
  }
  if (f.plan === 'pro') {
    if (f.status !== 'canceling') return null;
    const end = formatDay(f.endsAt, false);
    return { text: end ? `Pro ends ${end}` : 'Pro ends soon', tone: 'warning' };
  }
  return { text: 'Free plan', action: 'Upgrade', tone: 'upgrade' };
}
