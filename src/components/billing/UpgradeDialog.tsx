import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { priceLine } from '@/components/billing/freeLimits';
import { describePlanSignal } from '@/components/billing/planSignalCopy';
import { readInterval, useUpgrade } from '@/components/billing/useUpgrade';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PLAN_SIGNAL_EVENT, type PlanSignal } from '@/lib/planErrors';

/** Mounted once in the app shell: every mutation that gets a 402 (quota, plan or TRIAL_EXPIRED) opens this dialog. */
export function UpgradeDialog() {
  const [signal, setSignal] = useState<PlanSignal | null>(null);
  const ent = useEntitlements();
  const up = useUpgrade();
  const refetch = useRef(ent.refetch);
  refetch.current = ent.refetch;

  useEffect(() => {
    const onSignal = (e: Event) => {
      const detail = (e as CustomEvent<PlanSignal>).detail;
      if (detail.kind === 'mutation') {
        up.clearError();
        setSignal(detail);
        // The server said read-only: bring the app's plan up to date, so every screen shows it.
        if (detail.code === 'TRIAL_EXPIRED') refetch.current();
      }
    };
    window.addEventListener(PLAN_SIGNAL_EVENT, onSignal);
    return () => window.removeEventListener(PLAN_SIGNAL_EVENT, onSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = signal ? describePlanSignal(signal) : null;
  const price = priceLine(ent.currency, readInterval());

  return (
    <Dialog open={!!signal} onOpenChange={(open) => !open && setSignal(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{text?.title}</DialogTitle>
          <DialogDescription>{text?.body}</DialogDescription>
        </DialogHeader>
        <p className="text-13 text-muted-foreground">{`Pro is ${price.main}.`}</p>
        {up.error && <p role="alert" className="text-13 text-error">{up.error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setSignal(null)}>
            Not now
          </Button>
          <Button type="button" variant="accent" disabled={up.busy === 'checkout'} onClick={up.upgrade}>
            {up.busy === 'checkout' ? 'Opening checkout…' : 'Upgrade to Pro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
