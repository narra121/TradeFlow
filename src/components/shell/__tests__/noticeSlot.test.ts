import { describe, expect, it } from 'vitest';
import { pickNotice, type NoticeInput } from '../NoticeSlot';

const base: NoticeInput = { online: true, plan: 'pro', trialDaysLeft: null };

describe('pickNotice', () => {
  it('shows nothing when everything is fine', () => {
    expect(pickNotice(base)).toBeNull();
  });

  it('prefers offline, then payment failed, then trial ended, then the trial reminder, then no-account', () => {
    expect(pickNotice({ ...base, online: false, status: 'past_due' })?.id).toBe('offline');
    expect(pickNotice({ ...base, status: 'past_due', tradesWithoutAccount: 2 })?.id).toBe('payment-failed');
    expect(pickNotice({ ...base, plan: 'free', trialEnded: true, tradesWithoutAccount: 2 })?.id).toBe('trial-ended');
    expect(pickNotice({ ...base, plan: 'trial', trialDaysLeft: 3, tradesWithoutAccount: 2 })?.id).toBe('trial-3');
    expect(pickNotice({ ...base, tradesWithoutAccount: 2 })?.id).toBe('no-account');
  });

  it('reminds at 3 days and again at 1 day under different ids so a dismissal does not hide the last one', () => {
    const dismissed = new Set(['trial-3']);
    expect(pickNotice({ ...base, plan: 'trial', trialDaysLeft: 3, dismissed })).toBeNull();
    expect(pickNotice({ ...base, plan: 'trial', trialDaysLeft: 1, dismissed })?.id).toBe('trial-1');
    expect(pickNotice({ ...base, plan: 'trial', trialDaysLeft: 9 })).toBeNull();
  });

  it('never lets a blocking notice be dismissed and states the count correctly', () => {
    const n = pickNotice({ ...base, status: 'past_due', dismissed: new Set(['payment-failed']) });
    expect(n?.id).toBe('payment-failed');
    expect(n?.dismissible).toBe(false);
    expect(pickNotice({ ...base, tradesWithoutAccount: 1 })?.text).toBe('1 trade has no account and is not counted in statistics.');
  });

  it('shows getting started only while steps remain', () => {
    expect(pickNotice({ ...base, gettingStarted: { done: 2, total: 3 } })?.text).toBe('Getting started 2 of 3');
    expect(pickNotice({ ...base, gettingStarted: { done: 3, total: 3 } })).toBeNull();
  });
});
