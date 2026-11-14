import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Info, TriangleAlert, X } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { copy } from '@/copy';
import { useOnline } from '@/hooks/useOnline';
import { formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';

export type NoticeLevel = 'info' | 'warning' | 'error';

export interface Notice {
  id: string;
  level: NoticeLevel;
  text: string;
  action?: { label: string; to: string };
  /** Blocking notices (payment failed, read-only) cannot be dismissed. */
  dismissible: boolean;
}

export interface NoticeInput {
  online: boolean;
  status?: string;
  plan: string | null;
  trialDaysLeft: number | null;
  /** ISO end of the Pro trial, for the sentence that names the date. */
  trialEndsAt?: string;
  /** Trial over or Pro lapsed. */
  readOnly?: boolean;
  tradesWithoutAccount?: number;
  /** Account exists but no trade yet. */
  gettingStarted?: { done: number; total: number } | null;
  dismissed?: ReadonlySet<string>;
}

/** The one notice shown, chosen by priority: offline > payment failed > read-only > trial ending > no account > getting started. */
export function pickNotice(i: NoticeInput): Notice | null {
  const candidates: Notice[] = [];
  if (!i.online) candidates.push({ id: 'offline', level: 'warning', text: copy.offline.notice, dismissible: false });
  if (i.status === 'past_due') candidates.push({ id: 'payment-failed', level: 'error', text: copy.notices.paymentFailed, action: { label: copy.notices.updateCard, to: '/app/settings/billing' }, dismissible: false });
  if (i.readOnly) candidates.push({ id: 'read-only', level: 'warning', text: copy.notices.readOnly, action: { label: copy.notices.upgrade, to: '/app/settings/billing' }, dismissible: false });
  if (i.plan === 'trial' && i.trialDaysLeft !== null && i.trialDaysLeft <= 3) {
    candidates.push({
      id: `trial-${i.trialDaysLeft <= 1 ? 1 : 3}`,
      level: 'warning',
      text: copy.notices.trial(i.trialDaysLeft, i.trialEndsAt ? formatDateShort(i.trialEndsAt) : 'the last day'),
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


  const notice = useMemo(
    () =>
      pickNotice({
        online,
        status: ent.status,
        plan: ent.plan,
        trialDaysLeft: ent.trialDaysLeft,
        trialEndsAt: ent.trialEndsAt,
        readOnly: ent.readOnly,
        tradesWithoutAccount,
        gettingStarted,
        dismissed,
      }),
    [online, ent.status, ent.plan, ent.trialDaysLeft, ent.trialEndsAt, ent.readOnly, tradesWithoutAccount, gettingStarted, dismissed],
  );
  if (!notice) return null;

  const Icon = notice.level === 'error' ? AlertCircle : notice.level === 'warning' ? TriangleAlert : Info;
  const tone = notice.level === 'error' ? 'text-error' : notice.level === 'warning' ? 'text-warning' : 'text-info';

  return (
    <div role={notice.level === 'error' ? 'alert' : 'status'} className="flex min-h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-13 md:h-9 md:px-6 md:py-0">
      <Icon className={cn('h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      {/* Phones wrap the sentence: cut short it loses the date and what read-only means. */}
      <span className="min-w-0 flex-1 md:truncate">{notice.text}</span>
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
