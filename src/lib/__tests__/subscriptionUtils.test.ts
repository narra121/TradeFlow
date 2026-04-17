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

  it('returns free_with_ads for trial with past trialEnd', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    expect(getSubscriptionBannerReason({ status: 'trial', trialEnd: pastDate })).toBe('free_with_ads');
  });

  it('returns free_with_ads for trial without trialEnd', () => {
    expect(getSubscriptionBannerReason({ status: 'trial' })).toBe('free_with_ads');
  });

  it('returns free_with_ads for cancelled status', () => {
    expect(getSubscriptionBannerReason({ status: 'cancelled' })).toBe('free_with_ads');
  });

  it('returns payment_failed for past_due status', () => {
    expect(getSubscriptionBannerReason({ status: 'past_due' })).toBe('payment_failed');
  });

  it('returns free_with_ads for completed status', () => {
    expect(getSubscriptionBannerReason({ status: 'completed' })).toBe('free_with_ads');
  });

  it('returns free_with_ads for paused status', () => {
    expect(getSubscriptionBannerReason({ status: 'paused' })).toBe('free_with_ads');
  });

  it('returns free_with_ads for created status', () => {
    expect(getSubscriptionBannerReason({ status: 'created' })).toBe('free_with_ads');
  });

  it('returns null for unknown status', () => {
    expect(getSubscriptionBannerReason({ status: 'unknown_status' })).toBeNull();
  });
});
