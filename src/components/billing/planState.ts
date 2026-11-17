import { formatMoney, formatDayText } from '@/lib/format';
import type { EntitlementsView } from '@/hooks/useEntitlements';

/** `04 Nov 2026`, or `04 Nov` when `withYear` is false (D.3). Empty for a missing or invalid date. */
export function formatDay(iso: string | undefined | null, withYear = true): string {
  const text = formatDayText(iso, withYear);
  return text === '—' ? '' : text;
}

export interface PlanFacts {
  plan: 'free' | 'trial' | 'pro' | null;
  status?: string;
  trialDaysLeft?: number | null;
  trialEndsAt?: string;
  trialEndedAt?: string;
  proEndedAt?: string;
  interval?: 'month' | 'year';
  /** Major units (49.99 = $49.99). */
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
    proEndedAt: e.proEndedAt,
    interval: e.interval,
    amount: e.amount,
    currency: e.amountCurrency,
    renewsAt: e.renewsAt,
    endsAt: e.endsAt,
    legacyPrice: e.legacyPrice,
  };
}

export type PlanStateKind = 'trial' | 'read_only' | 'pro' | 'pro_canceling' | 'past_due';
export type PlanAction = 'upgrade' | 'manage' | 'update_card';

export interface PlanState {
  kind: PlanStateKind;
  /** The one sentence of the Plan & billing status block (A.10). */
  sentence: string;
  action: PlanAction;
  /** Trial and read-only: the "what changes" block is shown. */
  showWhatChanged: boolean;
}

const READ_ONLY_TAIL = 'Your journal is read-only: you can view and export, but not add, edit or delete.';

/** Status sentence and its single action for every entitlement state. A clause whose data the API did not return is dropped, never guessed. */
export function planState(f: PlanFacts): PlanState {
  if (f.status === 'past_due') {
    return { kind: 'past_due', sentence: 'Your last payment failed. Update your card to keep Pro.', action: 'update_card', showWhatChanged: false };
  }
  if (f.plan === 'trial') {
    const n = f.trialDaysLeft ?? 0;
    const end = formatDay(f.trialEndsAt, false);
    const days = `${n} ${n === 1 ? 'day' : 'days'} left`;
    return {
      kind: 'trial',
      sentence: `Free trial: ${days}, with every Pro feature. No card on file${end ? `; on ${end} your journal becomes read-only unless you upgrade` : ''}.`,
      action: 'upgrade',
      showWhatChanged: true,
    };
  }
  if (f.plan === 'pro') {
    const legacy = f.legacyPrice ? ' (legacy price)' : '';
    if (f.status === 'canceling') {
      const end = formatDay(f.endsAt);
      return {
        kind: 'pro_canceling',
        sentence: end ? `Pro${legacy} — ends on ${end}. After that your journal is read-only; your trades stay.` : `Pro${legacy} — ends at the end of the paid period. After that your journal is read-only; your trades stay.`,
        action: 'manage',
        showWhatChanged: false,
      };
    }
    const price = typeof f.amount === 'number' && f.interval ? ` — ${formatMoney(f.amount, f.currency)} a ${f.interval}` : '';
    const renews = formatDay(f.renewsAt);
    const tail = renews ? (price ? `. Renews on ${renews}.` : ` — renews on ${renews}.`) : price ? '.' : ' — active.';
    return { kind: 'pro', sentence: `Pro${legacy}${price}${tail}`, action: 'manage', showWhatChanged: false };
  }
  const proEnd = formatDay(f.proEndedAt);
  const trialEnd = formatDay(f.trialEndedAt);
  const ended = f.proEndedAt
    ? `Pro ended${proEnd ? ` on ${proEnd}` : ''}.`
    : `Your free trial ended${trialEnd ? ` on ${trialEnd}` : ''}.`;
  return { kind: 'read_only', sentence: `${ended} ${READ_ONLY_TAIL}`, action: 'upgrade', showWhatChanged: true };
}

export interface PlanRowText {
  text: string;
  action?: string;
  tone: 'neutral' | 'warning' | 'error' | 'upgrade';
}

/** Sidebar footer row (E-010): trial days, `Read-only` + Upgrade, `Pro ends 3 Jan`, red `Payment failed`; nothing for active Pro. */
export function planRowText(f: PlanFacts & { isLoading?: boolean }): PlanRowText | null {
  if (!f.plan) return null;
  if (f.status === 'past_due') return { text: 'Payment failed', action: 'Update card', tone: 'error' };
  if (f.plan === 'trial') {
    const d = f.trialDaysLeft ?? 0;
    return { text: `Free trial · ${d} ${d === 1 ? 'day' : 'days'} left`, action: d <= 3 ? 'Upgrade' : undefined, tone: d <= 3 ? 'warning' : 'neutral' };
  }
  if (f.plan === 'pro') {
    if (f.status !== 'canceling') return null;
    const end = formatDay(f.endsAt, false);
    return { text: end ? `Pro ends ${end}` : 'Pro ends soon', tone: 'warning' };
  }
  return { text: 'Read-only', action: 'Upgrade', tone: 'upgrade' };
}
