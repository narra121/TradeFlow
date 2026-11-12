import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Info, TriangleAlert, X } from 'lucide-react';
import { planState, toPlanFacts } from '@/components/billing/planState';
import { useEntitlements } from '@/hooks/useEntitlements';
import { copy } from '@/copy';
import { useOnline } from '@/hooks/useOnline';
import { formatDateShort } from '@/lib/format';
import { useGetAccountsQuery } from '@/store/api/accountsApi';
import { cn } from '@/lib/utils';

export type NoticeLevel = 'info' | 'warning' | 'error';

export interface Notice {
  id: string;
  level: NoticeLevel;
  text: string;
  action?: { label: string; to: string };
  /** Blocking notices (payment failed, over the limit) cannot be dismissed. */
  dismissible: boolean;
}

export interface NoticeInput {
  online: boolean;
  status?: string;
  plan: string | null;
  trialDaysLeft: number | null;
  /** ISO end of the Pro trial, for the sentence that names the date. */
  trialEndsAt?: string;
  /** Accounts beyond the Free limit while on Free. */
  overAccountLimit?: boolean;
  /** Free again after a Pro trial that ended within the last 14 days (`planState`). */
  trialEnded?: boolean;
  tradesWithoutAccount?: number;
  /** Account exists but no trade yet. */
  gettingStarted?: { done: number; total: number } | null;
  dismissed?: ReadonlySet<string>;
}

/** The one notice shown, chosen by priority: offline > payment failed > over limit > trial ended > trial ending > no account > getting started. */
export function pickNotice(i: NoticeInput): Notice | null {
  const candidates: Notice[] = [];
  if (!i.online) candidates.push({ id: 'offline', level: 'warning', text: copy.offline.notice, dismissible: false });
  if (i.status === 'past_due') candidates.push({ id: 'payment-failed', level: 'error', text: copy.notices.paymentFailed, action: { label: copy.notices.updateCard, to: '/app/settings/billing' }, dismissible: false });
  if (i.overAccountLimit) candidates.push({ id: 'over-limit', level: 'warning', text: copy.notices.overLimit, action: { label: copy.notices.chooseAccounts, to: '/app/settings/billing' }, dismissible: false });
  if (i.trialEnded) candidates.push({ id: 'trial-ended', level: 'info', text: copy.notices.trialEnded, action: { label: copy.notices.seeWhatChanged, to: '/app/settings/billing' }, dismissible: true });
  if (i.plan === 'trial' && i.trialDaysLeft !== null && i.trialDaysLeft <= 3) {
    candidates.push({
      id: `trial-${i.trialDaysLeft <= 1 ? 1 : 3}`,
      level: 'warning',
      text: copy.notices.trial(i.trialDaysLeft, i.trialEndsAt ? formatDateShort(i.trialEndsAt) : 'the end of the trial'),
      action: { label: copy.notices.seePlans, to: '/app/settings/billing' },
      dismissible: true,
    });
  }
  if ((i.tradesWithoutAccount ?? 0) > 0) {
    const n = i.tradesWithoutAccount as number;
    candidates.push({ id: 'no-account', level: 'info', text: copy.notices.noAccount(n), action: { label: copy.notices.assignAccounts, to: '/app/tradelog?missing=account' }, dismissible: true });
  }
  if (i.gettingStarted && i.gettingStarted.done < i.gettingStarted.total) {
    candidates.push({ id: 'getting-started', level: 'info', text: copy.notices.gettingStarted(i.gettingStarted.done, i.gettingStarted.total), action: { label: copy.notices.continue, to: '/app/dashboard' }, dismissible: true });
  }
  return candidates.find((c) => !c.dismissible || !i.dismissed?.has(c.id)) ?? null;
}

const DISMISS_KEY = 'tq.notices.dismissed';

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

interface NoticeSlotProps {
  tradesWithoutAccount?: number;
  gettingStarted?: { done: number; total: number } | null;
}

export function NoticeSlot({ tradesWithoutAccount, gettingStarted }: NoticeSlotProps) {
  const ent = useEntitlements();
  const online = useOnline();
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  const accountCount = useGetAccountsQuery().data?.accounts.length ?? 0;
  const canUnlimited = ent.can('unlimited_accounts');
  const trialEnded = ent.plan !== null && planState(toPlanFacts(ent)).kind === 'trial_ended';

  const notice = useMemo(
    () =>
      pickNotice({
        online,
        status: ent.status,
        plan: ent.plan,
        trialDaysLeft: ent.trialDaysLeft,
        trialEndsAt: ent.trialEndsAt,
        trialEnded,
        overAccountLimit: ent.plan !== null && !canUnlimited && accountCount > 2,
        tradesWithoutAccount,
        gettingStarted,
        dismissed,
      }),
    [online, ent.status, ent.plan, ent.trialDaysLeft, ent.trialEndsAt, trialEnded, canUnlimited, accountCount, tradesWithoutAccount, gettingStarted, dismissed],
  );
  if (!notice) return null;

  const Icon = notice.level === 'error' ? AlertCircle : notice.level === 'warning' ? TriangleAlert : Info;
  const tone = notice.level === 'error' ? 'text-error' : notice.level === 'warning' ? 'text-warning' : 'text-info';

  return (
    <div role={notice.level === 'error' ? 'alert' : 'status'} className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3 text-13 md:px-6">
      <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{notice.text}</span>
      {notice.action && (
        <Link to={notice.action.to} className="inline-flex min-h-6 shrink-0 items-center font-medium text-primary hover:underline">
          {notice.action.label}
        </Link>
      )}
      {notice.dismissible && (
        <button
          type="button"
          aria-label="Dismiss notice"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            const next = new Set(dismissed).add(notice.id);
            setDismissed(next);
            try {
              localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
            } catch {
              // not persisted
            }
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
