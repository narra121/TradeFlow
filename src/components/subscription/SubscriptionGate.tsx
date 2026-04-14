import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubscriptionGateProps {
  children: React.ReactNode;
  subscription: {
    status: string;
    trialEnd?: string;
  } | null;
}

const ACTIVE_STATUSES = ['active', 'trialing'];

function isSubscriptionActive(subscription: SubscriptionGateProps['subscription']): boolean {
  if (!subscription) return false;

  if (ACTIVE_STATUSES.includes(subscription.status)) {
    // If trialing, check if trial hasn't expired
    if (subscription.status === 'trialing' && subscription.trialEnd) {
      return new Date(subscription.trialEnd) > new Date();
    }
    return true;
  }

  return false;
}

function getReasonText(status: string | undefined): string {
  switch (status) {
    case 'trialing':
      return 'Your free trial has expired. Choose a plan to continue using TradeQut.';
    case 'canceled':
    case 'cancelled':
      return 'Your subscription was cancelled. Resubscribe to regain access.';
    case 'past_due':
      return 'Your payment is past due. Please update your payment method.';
    case 'unpaid':
      return 'Your subscription payment failed. Update your billing info to continue.';
    default:
      return 'A subscription is required to access this feature. Choose a plan below.';
  }
}

const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    priceUsd: '$1.99',
    priceInr: '\u20B999',
    period: '/month',
    badge: null,
  },
  {
    id: 'annual',
    name: 'Annual',
    priceUsd: '$19.99',
    priceInr: '\u20B9999',
    period: '/year',
    badge: 'Save 17%',
  },
] as const;

const features = [
  'Unlimited trade logging',
  'Advanced analytics & insights',
  'AI-powered trade extraction',
  'Goal tracking & reports',
];

export function SubscriptionGate({ children, subscription }: SubscriptionGateProps) {
  const active = useMemo(() => isSubscriptionActive(subscription), [subscription]);

  if (active) {
    return <>{children}</>;
  }

  const reasonText = getReasonText(subscription?.status);

  return (
    <div className="relative w-full h-full min-h-[60vh]">
      {/* Blurred background content */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="blur-sm opacity-30">{children}</div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]/70 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[#0a0a0f]/95 p-6 sm:p-8 shadow-2xl">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-semibold text-center text-foreground mb-2">
            Subscription Required
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm mx-auto">
            {reasonText}
          </p>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-lg border p-4 transition-colors',
                  plan.badge
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-white/10 bg-white/[0.02]'
                )}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    {plan.badge}
                  </Badge>
                )}
                <p className="text-sm font-medium text-foreground mb-2">{plan.name}</p>
                <div className="mb-1">
                  <span className="text-lg sm:text-xl font-bold text-foreground">{plan.priceUsd}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.priceInr}{plan.period}</p>
              </div>
            ))}
          </div>

          {/* Features list */}
          <ul className="space-y-2 mb-6">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button asChild variant="glow" size="lg" className="w-full mb-3">
            <Link to="/app/profile">Subscribe Now</Link>
          </Button>

          {/* Back link */}
          <div className="text-center">
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
