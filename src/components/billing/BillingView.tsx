import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlansTable } from '@/components/billing/PlansTable';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { WhatChanges } from '@/components/billing/WhatChanges';
import { WritableAccounts } from '@/components/billing/WritableAccounts';
import { FREE_ACCOUNTS } from '@/components/billing/freeLimits';
import { formatDay, planState, toPlanFacts } from '@/components/billing/planState';
import { readInterval, saveInterval, useUpgrade } from '@/components/billing/useUpgrade';
import { useEntitlements, type EntitlementsView } from '@/hooks/useEntitlements';
import { useGetAccountsQuery } from '@/store/api/accountsApi';
import type { Interval } from '@/content/product-facts';
import { cn } from '@/lib/utils';

const POLL_MS = 3000;
const GIVE_UP_MS = 30_000;

type ReturnState = 'confirming' | 'success' | 'slow' | null;

/** Back from Stripe Checkout: poll the entitlements for up to 30 s until Pro shows, then drop `session_id` (D.4, A.10). */
function useCheckoutReturn(ent: EntitlementsView): ReturnState {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState<ReturnState>(sessionId ? 'confirming' : null);
  const started = useRef<number>(Date.now());
  const refetch = useRef(ent.refetch);
  refetch.current = ent.refetch;
  const paid = ent.plan === 'pro' && ent.status !== 'past_due';

  useEffect(() => {
    if (!sessionId) return;
    if (paid) {
      setState('success');
      const next = new URLSearchParams(params);
      next.delete('session_id');
      setParams(next, { replace: true });
      return;
    }
    setState((s) => s ?? 'confirming');
    const id = window.setInterval(() => {
      if (Date.now() - started.current >= GIVE_UP_MS) {
        window.clearInterval(id);
        setState('slow');
        return;
      }
      refetch.current();
    }, POLL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, paid]);

  return state;
}

function Note({ children, role = 'status' }: { children: React.ReactNode; role?: 'status' | 'alert' }) {
  return <p role={role} className="rounded-md border border-border bg-card px-3 py-2 text-13">{children}</p>;
}

export function BillingView() {
  const ent = useEntitlements();
  const [params] = useSearchParams();
  const [interval, setIntervalState] = useState<Interval>(readInterval);
  const up = useUpgrade();
  const returned = useCheckoutReturn(ent);
  const accountsQuery = useGetAccountsQuery();
  const accounts = (accountsQuery.data?.accounts ?? []).map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
  const cancelled = params.get('checkout') === 'cancelled';

  const changeInterval = (i: Interval) => {
    setIntervalState(i);
    saveInterval(i);
  };

  if (ent.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your plan">
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (ent.isError || !ent.plan) return <ErrorState title="Couldn't load your plan." error={ent.error} onRetry={ent.refetch} />;

  const state = planState(toPlanFacts(ent));
  const paid = ent.plan === 'pro';
  const unlimitedAccounts = !!ent.can('unlimited_accounts');
  const overLimit = !unlimitedAccounts && accounts.length > FREE_ACCOUNTS;
  const pastDue = state.kind === 'past_due';
  const actionLabel = state.action === 'upgrade' ? 'Upgrade to Pro' : state.action === 'update_card' ? 'Update card' : 'Manage billing';
  const actionBusy = state.action === 'upgrade' ? up.busy === 'checkout' : up.busy === 'portal';
  const onAction = state.action === 'upgrade' ? up.upgrade : up.manage;
  const resetsAt = ent.periodResetsAt;

  return (
    <div className="space-y-4">
      {returned === 'confirming' && <Note>We are confirming your payment…</Note>}
      {returned === 'success' && <Note>Payment received — Pro is active.</Note>}
      {returned === 'slow' && <Note role="alert">This is taking longer than usual. Refresh, or contact support — you have not been charged twice.</Note>}
      {cancelled && !returned && <Note>Checkout was cancelled. Nothing was charged.</Note>}

      <section
        aria-label="Your plan"
        className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3', pastDue && 'border-l-2 border-l-error')}
      >
        <p className="min-w-0 flex-1 text-sm font-medium">{state.sentence}</p>
        <Button type="button" variant={state.action === 'upgrade' ? 'accent' : state.action === 'update_card' ? 'default' : 'outline'} disabled={actionBusy || !!returned && returned !== 'slow'} onClick={onAction}>
          {actionBusy ? (state.action === 'upgrade' ? 'Opening checkout…' : 'Opening billing…') : actionLabel}
        </Button>
        {up.error && <p role="alert" className="basis-full text-13 text-error">{up.error}</p>}
        {paid && <p className="basis-full text-xs text-muted-foreground">{`Invoices and payment method open in Stripe's secure portal.${ent.amountCurrency ? ` Billed in ${ent.amountCurrency.toUpperCase()}.` : ''}`}</p>}
      </section>

      {(state.kind === 'trial' || state.showWhatChanged) && (
        <WhatChanges
          mode={state.kind === 'trial' ? 'trial' : 'ended'}
          moveDate={formatDay(ent.trialEndsAt, false)}
          accountCount={accounts.length}
          usage={ent.usage}
        />
      )}

      {overLimit && <WritableAccounts accounts={accounts} chosen={ent.writableAccountIds} />}

      <section aria-labelledby="usage-h" className="rounded-lg border border-border bg-card p-4">
        <h3 id="usage-h" className="text-sm font-semibold">
          Usage this month{resetsAt ? <span className="font-normal text-muted-foreground"> · resets {formatDay(resetsAt, false)}</span> : null}
        </h3>
        <div className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {ent.usage.map((row) => <UsageMeter key={row.feature} row={row} resetsAt={resetsAt} />)}
          <div className="flex items-center justify-between gap-3 text-13">
            <span>Accounts</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{unlimitedAccounts ? `${accounts.length} · unlimited` : `${accounts.length} of ${FREE_ACCOUNTS}`}</span>
          </div>
        </div>
      </section>

      {!paid ? (
        <section aria-label="Plans" className="rounded-lg border border-border bg-card p-4">
          <PlansTable
            currency={ent.currency}
            interval={interval}
            onInterval={changeInterval}
            freeCaption={state.kind === 'trial' ? 'After your trial' : 'Your plan'}
            canUpgrade
            busy={up.busy === 'checkout'}
            onUpgrade={up.upgrade}
          />
        </section>
      ) : (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Compare plans</summary>
          <div className="mt-3">
            <PlansTable currency={ent.currency} interval={interval} onInterval={changeInterval} freeCaption="" canUpgrade={false} busy={false} onUpgrade={up.upgrade} />
          </div>
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        Cancel any time · Pro lasts to the end of the paid period · your trades are never deleted when a plan ends ·{' '}
        <Link to="/refund" className="text-primary underline underline-offset-2">Refund policy</Link>
        {!paid && ' · Have a promo code? Enter it at checkout.'}
      </p>
    </div>
  );
}
