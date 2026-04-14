import { describe, it, expect } from 'vitest';
import { getSubscriptionBannerReason } from '../subscriptionUtils';

describe('getSubscriptionBannerReason', () => {
  it('returns null when subscription is undefined', () => {
    expect(getSubscriptionBannerReason(undefined)).toBeNull();
  });

  it('returns null when subscription is null', () => {
    expect(getSubscriptionBannerReason(null)).toBeNull();
  });

  it('returns null for active subscription', () => {
    expect(getSubscriptionBannerReason({ status: 'active' })).toBeNull();
  });

  it('returns null for cancellation_requested status', () => {
    expect(getSubscriptionBannerReason({ status: 'cancellation_requested' })).toBeNull();
  });

  it('returns trial_active for active trial with future trialEnd', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    expect(getSubscriptionBannerReason({ status: 'trial', trialEnd: futureDate })).toBe('trial_active');
  });

  it('returns trial_expired for trial with past trialEnd', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(getSubscriptionBannerReason({ status: 'trial', trialEnd: pastDate })).toBe('trial_expired');
  });

  it('returns trial_expired for trial without trialEnd', () => {
    expect(getSubscriptionBannerReason({ status: 'trial' })).toBe('trial_expired');
  });

  it('returns subscription_cancelled for cancelled status', () => {
    expect(getSubscriptionBannerReason({ status: 'cancelled' })).toBe('subscription_cancelled');
  });

  it('returns payment_failed for past_due status', () => {
    expect(getSubscriptionBannerReason({ status: 'past_due' })).toBe('payment_failed');
  });

  it('returns subscription_ended for completed status', () => {
    expect(getSubscriptionBannerReason({ status: 'completed' })).toBe('subscription_ended');
  });

  it('returns subscription_ended for paused status', () => {
    expect(getSubscriptionBannerReason({ status: 'paused' })).toBe('subscription_ended');
  });

  it('returns no_subscription for created status', () => {
    expect(getSubscriptionBannerReason({ status: 'created' })).toBe('no_subscription');
  });

  it('returns null for unknown status', () => {
    expect(getSubscriptionBannerReason({ status: 'unknown_status' })).toBeNull();
  });
});
