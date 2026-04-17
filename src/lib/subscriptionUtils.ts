export type BannerReason = 'trial_active' | 'trial_expired' | 'subscription_cancelled' | 'payment_failed' | 'subscription_ended' | 'no_subscription' | 'free_with_ads';

export function getSubscriptionBannerReason(sub: any): BannerReason | null {
  if (!sub) return null;
  if (sub.status === 'active') return null;
  if (sub.status === 'cancellation_requested') return null;
  if (sub.status === 'trial') {
    if (sub.trialEnd && new Date(sub.trialEnd) > new Date()) return 'trial_active';
    return 'free_with_ads';
  }
  if (sub.status === 'cancelled') return 'free_with_ads';
  if (sub.status === 'past_due') return 'payment_failed';
  if (sub.status === 'completed' || sub.status === 'paused') return 'free_with_ads';
  if (sub.status === 'created') return 'free_with_ads';
  return null;
}
