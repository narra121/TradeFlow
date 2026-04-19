import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionGateProps {
  children: React.ReactNode;
  subscription: {
    status: string;
    trialEnd?: string;
  } | null;
  /** When true, subscription data hasn't loaded yet -- render children to avoid flashing the gate */
  isLoading?: boolean;
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

export function SubscriptionGate({ children, subscription, isLoading }: SubscriptionGateProps) {
  const active = useMemo(() => isSubscriptionActive(subscription), [subscription]);

  // If subscription data hasn't loaded yet, don't flash the gate
  if (isLoading) return <>{children}</>;

  if (active) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[60vh]">
      {/* Blurred background content */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <div className="blur-sm opacity-30">{children}</div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0f]/70 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 rounded-xl border border-white/10 bg-[#0a0a0f]/95 p-6 sm:p-8 shadow-2xl text-center">
          {/* Lock icon */}
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
            Premium Feature
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Subscribe to unlock AI-powered insights and enjoy an ad-free experience.
          </p>

          {/* CTA */}
          <Button asChild variant="glow" size="lg" className="w-full">
            <Link to="/app/profile">View Plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
