import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Clock, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscriptionBannerProps {
  reason: 'trial_active' | 'trial_expired' | 'subscription_cancelled' | 'payment_failed' | 'subscription_ended' | 'no_subscription' | 'free_with_ads';
  trialEnd?: string;
  onSubscribe: () => void;
  onDismiss: () => void;
}

const bannerConfig = {
  trial_active: {
    icon: Sparkles,
    bgClass: 'bg-primary/5 border-primary/20',
    iconClass: 'text-primary',
    ctaLabel: 'Subscribe Now',
  },
  trial_expired: {
    icon: Clock,
    bgClass: 'bg-amber-500/10 border-amber-500/30',
    iconClass: 'text-amber-400',
    ctaLabel: 'Subscribe Now',
  },
  payment_failed: {
    icon: CreditCard,
    bgClass: 'bg-red-500/10 border-red-500/30',
    iconClass: 'text-red-400',
    ctaLabel: 'Update Payment',
  },
  subscription_cancelled: {
    icon: AlertTriangle,
    bgClass: 'bg-white/5 border-white/10',
    iconClass: 'text-muted-foreground',
    ctaLabel: 'Resubscribe',
  },
  subscription_ended: {
    icon: AlertTriangle,
    bgClass: 'bg-white/5 border-white/10',
    iconClass: 'text-muted-foreground',
    ctaLabel: 'Renew',
  },
  no_subscription: {
    icon: Sparkles,
    bgClass: 'bg-white/5 border-white/10',
    iconClass: 'text-muted-foreground',
    ctaLabel: 'Subscribe Now',
  },
  free_with_ads: {
    icon: Sparkles,
    bgClass: 'bg-primary/5 border-primary/20',
    iconClass: 'text-primary',
    ctaLabel: 'Go Ad-Free',
  },
} as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getMessage(reason: SubscriptionBannerProps['reason'], trialEnd?: string): string {
  switch (reason) {
    case 'trial_active':
      return trialEnd
        ? `Your free trial expires on ${formatDate(trialEnd)}. Subscribe now — you'll be charged from ${formatDate(trialEnd)}.`
        : 'You are on a free trial. Subscribe now to continue after it ends.';
    case 'trial_expired':
      return trialEnd
        ? `Your free trial ended on ${formatDate(trialEnd)}. Subscribe to continue.`
        : 'Your free trial has ended. Subscribe to continue.';
    case 'payment_failed':
      return 'Payment failed. Update your card to keep your subscription.';
    case 'subscription_cancelled':
      return 'Your subscription was cancelled. Resubscribe to continue.';
    case 'subscription_ended':
      return 'Your subscription has ended. Renew to continue.';
    case 'no_subscription':
      return 'Subscribe to unlock AI Insights and go ad-free.';
    case 'free_with_ads':
      return 'Enjoying TradeQut? Subscribe to remove ads and support development.';
  }
}

export function SubscriptionBanner({ reason, trialEnd, onSubscribe, onDismiss }: SubscriptionBannerProps) {
  const dismissKey = `tradeQut_banner_dismissed_${reason}`;
  const [dismissing, setDismissing] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(dismissKey);
    if (dismissed === 'true') {
      setMounted(false);
    }
  }, [dismissKey]);

  const handleDismiss = () => {
    setDismissing(true);
    sessionStorage.setItem(dismissKey, 'true');
    // Wait for slide-up animation to complete before unmounting
    setTimeout(() => {
      setMounted(false);
      onDismiss();
    }, 300);
  };

  if (!mounted) return null;

  const config = bannerConfig[reason];
  const Icon = config.icon;
  const message = getMessage(reason, trialEnd);

  return (
    <div
      className={cn(
        'sticky top-0 z-50 w-full border-b',
        config.bgClass,
        dismissing
          ? 'animate-banner-slide-up'
          : 'animate-banner-slide-down'
      )}
      style={{
        animationDuration: '300ms',
        animationFillMode: 'forwards',
      }}
    >
      <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('shrink-0 flex items-center justify-center', config.iconClass)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <p className="text-sm text-foreground truncate">{message}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={reason === 'payment_failed' ? 'destructive' : 'default'}
            onClick={onSubscribe}
            className="text-xs sm:text-sm"
          >
            {config.ctaLabel}
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
