import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/hooks/useEntitlements';
import { priceLine } from '@/components/billing/freeLimits';
import { readInterval, useUpgrade } from '@/components/billing/useUpgrade';
import type { GatedFeature } from '@/types/entitlements';

interface LockedPreviewProps {
  title: string;
  /** The question the locked section answers, in the user's words. */
  question: string;
  currency?: 'USD' | 'INR';
}

/** A locked section shows what it is for, a grey schematic with no numbers, and the Pro price. */
export function LockedPreview({ title, question, currency = 'USD' }: LockedPreviewProps) {
  const price = priceLine(currency, readInterval());
  const up = useUpgrade();
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="locked-preview">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="inline-flex items-center gap-1 rounded-sm bg-accent/15 px-1.5 text-2xs font-medium text-accent-text">
          <Lock className="h-3 w-3" aria-hidden="true" /> Pro
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{question}</p>
      <div aria-hidden="true" className="mt-3 flex h-20 items-end gap-1.5">
        {[40, 65, 30, 80, 55, 70, 45, 60].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm bg-muted" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="accent" disabled={up.busy === 'checkout'} onClick={up.upgrade}>
          {up.busy === 'checkout' ? 'Opening checkout…' : 'Upgrade to Pro'}
        </Button>
        <span className="text-xs text-muted-foreground">{`Part of Pro, ${price.main}.`}</span>
      </div>
      {up.error && <p role="alert" className="mt-2 text-xs text-error">{up.error}</p>}
    </div>
  );
}

interface ProGateProps extends Omit<LockedPreviewProps, 'currency'> {
  feature: GatedFeature;
  children: React.ReactNode;
}

/** Renders the children for plans with the feature, otherwise the locked preview (while loading it renders nothing). */
export function ProGate({ feature, title, question, children }: ProGateProps) {
  const ent = useEntitlements();
  if (ent.isLoading) return null;
  if (ent.isError || ent.can(feature)) return <>{children}</>;
  return <LockedPreview title={title} question={question} currency={ent.currency} />;
}
