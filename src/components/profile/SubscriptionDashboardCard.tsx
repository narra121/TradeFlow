import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CreditCard, Clock, AlertTriangle, Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionDashboardCardProps {
  subscription: {
    userId: string;
    subscriptionId?: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    planId?: string;
    status: string;
    paidCount?: number;
    remainingCount?: number;
    currentStart?: string;
    currentEnd?: string;
    chargeAt?: string;
    endedAt?: string;
    cancelAt?: string;
    trialEnd?: string;
    trialStarted?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  currencySymbol: string;
  isManaging: boolean;
  isSubscribing: boolean;
  onPause: () => Promise<void>;
  onCancel: (immediate?: boolean) => Promise<void>;
  onResume: () => Promise<void>;
  onUndoCancellation: () => Promise<void>;
  onRetryPayment: () => Promise<void>;
  isFetching: boolean;
}

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  active: { className: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Active' },
  trial: { className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Free Trial' },
  created: { className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Pending Payment' },
  cancellation_requested: { className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Cancelling' },
  paused: { className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Paused' },
  past_due: { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Payment Failed' },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function getPlanLabel(planId?: string): string {
  if (!planId) return 'Pro';
  if (planId.toLowerCase().includes('year')) return 'Pro Yearly';
  return 'Pro Monthly';
}

function TrialSection({ trialEnd }: { trialEnd: string }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const progress = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

  return (
    <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-amber-400">{daysLeft} days remaining</span>
        <span className="text-xs text-muted-foreground">Expires {formatDate(trialEnd)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        All features are available during your free trial. Subscribe before it ends to keep access.
      </p>
    </div>
  );
}

function InfoGrid({ subscription }: { subscription: NonNullable<SubscriptionDashboardCardProps['subscription']> }) {
  const items = [
    { label: 'Plan', value: getPlanLabel(subscription.planId) },
    { label: 'Next Billing', value: subscription.currentEnd ? formatDate(subscription.currentEnd) : '--' },
    {
      label: 'Paid Cycles',
      value: subscription.paidCount != null
        ? `${subscription.paidCount}${subscription.remainingCount ? ` / ${subscription.remainingCount} left` : ''}`
        : '--',
    },
    { label: 'Status', value: subscription.cancelAt ? `Cancels ${formatDate(subscription.cancelAt)}` : 'Auto-renews' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
          <p className="text-sm font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SubscriptionDashboardCard({
  subscription,
  isManaging,
  isSubscribing,
  onPause,
  onCancel,
  onResume,
  onUndoCancellation,
  onRetryPayment,
  isFetching,
}: SubscriptionDashboardCardProps) {
  const busy = isManaging || isSubscribing;
  const status = subscription?.status;
  const badge = status ? STATUS_BADGE[status] ?? { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: status } : null;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Subscription
        </CardTitle>
        {badge && (
          <Badge variant="outline" className={cn('text-xs', badge.className)}>
            {badge.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!subscription ? (
          <div className="text-center py-6">
            <p className="text-primary font-medium">No Active Subscription</p>
            <p className="text-sm text-muted-foreground mt-1">Subscribe to a plan below</p>
          </div>
        ) : (
          <>
            {status === 'trial' && subscription.trialEnd && (
              <TrialSection trialEnd={subscription.trialEnd} />
            )}

            {status === 'active' && <InfoGrid subscription={subscription} />}

            {(status === 'active' || status === 'cancellation_requested' || status === 'paused' || status === 'created' || status === 'past_due') && (
              <>
                <Separator />

                {status === 'active' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={onPause} disabled={busy}>
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                        Pause
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy}>
                            Cancel at End of Cycle
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel? Your subscription will remain active until the end of the current billing period.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onCancel(false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Yes, Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-primary" />
                      Thank you for supporting TradeQut! Payments are processed automatically on your billing date.
                    </p>
                  </>
                )}

                {status === 'cancellation_requested' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 p-3 text-sm text-orange-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                      <span>Your subscription is scheduled to cancel at the end of the current billing period. You will not be charged again.</span>
                    </div>
                    <Button variant="default" size="sm" onClick={onUndoCancellation} disabled={busy} className="w-full">
                      {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Keep My Subscription'}
                    </Button>
                  </div>
                )}

                {status === 'paused' && (
                  <Button variant="default" size="sm" onClick={onResume} disabled={busy} className="w-full">
                    {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resuming...</> : 'Resume Subscription'}
                  </Button>
                )}

                {status === 'created' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 p-3 text-sm text-orange-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                      <span>Your subscription has been created but payment is pending. Complete payment to activate your plan.</span>
                    </div>
                    <Button variant="default" size="sm" onClick={onRetryPayment} disabled={busy} className="w-full">
                      {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing Payment...</> : 'Complete Payment'}
                    </Button>
                  </div>
                )}

                {status === 'past_due' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <span>Your payment failed. Please retry or update your payment method to continue your subscription.</span>
                    </div>
                    <Button variant="default" size="sm" onClick={onRetryPayment} disabled={busy} className="w-full">
                      {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Retrying...</> : 'Retry Payment'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
