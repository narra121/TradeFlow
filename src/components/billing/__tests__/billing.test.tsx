import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { daysLeft } from '@/hooks/useEntitlements';
import type { EntitlementsResponse } from '@/types/entitlements';

let response: EntitlementsResponse | undefined;
let isError = false;
let failure: unknown;
let accounts: { id: string; name: string; currency: string }[] = [];
const checkout = vi.fn();
const portal = vi.fn();
const verify = vi.fn();
const refetch = vi.fn();
vi.mock('@/store/api/billingApi', () => ({
  useGetEntitlementsQuery: () => ({ data: response, isLoading: false, isError, error: failure, refetch }),
  useCreateCheckoutMutation: () => [(a: unknown) => ({ unwrap: () => checkout(a) }), { isLoading: false }],
  useOpenPortalMutation: () => [() => ({ unwrap: () => portal() }), { isLoading: false }],
  useVerifyCheckoutMutation: () => [(id: string) => ({ unwrap: () => verify(id) })],
}));
vi.mock('@/store/api/accountsApi', () => ({ useGetAccountsQuery: () => ({ data: { accounts }, isLoading: false }) }));

import { BillingView } from '../BillingView';
import { PlanCard } from '../PlanCard';
import { UsageMeter } from '../UsageMeter';
import { planRowText, planState } from '../planState';
import { yearlySavingPercent } from '../freeLimits';

type Ent = EntitlementsResponse['entitlements'] & Record<string, unknown>;
const NOW = new Date('2026-11-11T12:00:00Z');
const READ_FEATURES = { advanced_analytics: true, tax_report: true, unlimited_accounts: true, auto_sync: false };
const ALL_FEATURES = { advanced_analytics: true, tax_report: true, unlimited_accounts: true, auto_sync: true };
const PRO_LIMITS = { ai_extract: 200, ai_insight: 30, ai_chat: 500, broker_import: 200 };

const base = (over: Partial<Ent> = {}, usage: Partial<EntitlementsResponse['usage']> = {}, extra: Partial<EntitlementsResponse> = {}): EntitlementsResponse => ({
  entitlements: {
    plan: 'trial', status: 'trialing', trialEndsAt: new Date(Date.now() + 8.5 * 86_400_000).toISOString(),
    limits: PRO_LIMITS,
    features: ALL_FEATURES,
    ...over,
  } as unknown as Ent,
  usage: { ai_extract: 0, ai_insight: 0, ai_chat: 0, broker_import: 0, ...usage },
  periodResetsAt: '2026-12-01T00:00:00Z',
  billingCurrency: 'USD',
  writableAccountIds: null,
  ...extra,
});
const readOnly = (over: Partial<Ent> = {}) =>
  base(
    { plan: 'free', status: 'free', trialEndsAt: undefined, trialEndedAt: '2026-11-05T00:00:00Z', limits: { ai_extract: 0, ai_insight: 0, ai_chat: 0, broker_import: 0 }, features: READ_FEATURES, ...over },
    {},
    { writableAccountIds: [] },
  );
const pro = (over: Partial<Ent> = {}) => base({ plan: 'pro', status: 'active', trialEndsAt: undefined, ...over });

const wrap = (path = '/app/settings/billing') => render(<MemoryRouter initialEntries={[path]}><BillingView /></MemoryRouter>);

const assign = vi.fn();
const realLocation = window.location;
beforeEach(() => {
  isError = false;
  failure = undefined;
  accounts = [{ id: 'a1', name: 'FTMO', currency: 'USD' }];
  [checkout, portal, verify, refetch, assign].forEach((m) => m.mockReset());
  verify.mockResolvedValue({ status: 'active' });
  localStorage.clear();
  Object.defineProperty(window, 'location', { value: { ...realLocation, assign }, writable: true, configurable: true });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true });
  vi.useRealTimers();
});

describe('daysLeft', () => {
  it('counts whole days left in the trial', () => {
    expect(daysLeft('2026-11-20T12:00:00Z', NOW)).toBe(9);
    expect(daysLeft('2026-11-11T12:00:01Z', NOW)).toBe(1);
    expect(daysLeft('2026-11-01T00:00:00Z', NOW)).toBe(0);
    expect(daysLeft(undefined, NOW)).toBeNull();
  });
});

describe('planState — one sentence and one action per state', () => {
  it('trial: days left, every Pro feature, read-only after the end date', () => {
    const s = planState({ plan: 'trial', status: 'trialing', trialDaysLeft: 9, trialEndsAt: '2026-11-20T12:00:00Z' });
    expect(s).toMatchObject({
      kind: 'trial',
      sentence: 'Free trial: 9 days left, with every Pro feature. No card on file; on 20 Nov your journal becomes read-only unless you upgrade.',
      action: 'upgrade',
      showWhatChanged: true,
    });
    expect(planState({ plan: 'trial', trialDaysLeft: 1 }).sentence).toBe('Free trial: 1 day left, with every Pro feature. No card on file.');
  });
  it('read-only after the trial, and after Pro ended; no "Free plan" anywhere', () => {
    expect(planState({ plan: 'free', status: 'free', trialEndedAt: '2026-11-05T00:00:00Z' })).toMatchObject({
      kind: 'read_only',
      sentence: 'Your free trial ended on 05 Nov 2026. Your journal is read-only: you can view and export, but not add, edit or delete.',
      action: 'upgrade',
      showWhatChanged: true,
    });
    expect(planState({ plan: 'free', trialEndedAt: '2026-01-01T00:00:00Z', proEndedAt: '2026-11-01T00:00:00Z' }).sentence).toBe(
      'Pro ended on 01 Nov 2026. Your journal is read-only: you can view and export, but not add, edit or delete.',
    );
    expect(planState({ plan: 'free' }).sentence).not.toMatch(/Free plan|on Free/);
  });
  it('pro renewing with price and date, and dropping clauses the API did not return', () => {
    expect(planState({ plan: 'pro', status: 'active', interval: 'year', amount: 79, currency: 'USD', renewsAt: '2027-01-03T00:00:00Z' }).sentence).toBe('Pro — $79.00 a year. Renews on 03 Jan 2027.');
    expect(planState({ plan: 'pro', status: 'active', renewsAt: '2027-01-03T00:00:00Z' }).sentence).toBe('Pro — renews on 03 Jan 2027.');
    expect(planState({ plan: 'pro', status: 'active' })).toMatchObject({ sentence: 'Pro — active.', action: 'manage' });
  });
  it('legacy price is stated', () => {
    expect(planState({ plan: 'pro', status: 'active', legacyPrice: true, renewsAt: '2027-01-03T00:00:00Z' }).sentence).toBe('Pro (legacy price) — renews on 03 Jan 2027.');
  });
  it('cancelled at period end', () => {
    expect(planState({ plan: 'pro', status: 'canceling', endsAt: '2027-01-03T00:00:00Z' })).toMatchObject({
      kind: 'pro_canceling',
      sentence: 'Pro — ends on 03 Jan 2027. After that your journal is read-only; your trades stay.',
      action: 'manage',
    });
  });
  it('payment failed', () => {
    expect(planState({ plan: 'pro', status: 'past_due' })).toMatchObject({ kind: 'past_due', sentence: 'Your last payment failed. Update your card to keep Pro.', action: 'update_card' });
  });
});

describe('plan row (sidebar footer)', () => {
  it('text per state: trial days left, Read-only + Upgrade, Pro ends, Payment failed', () => {
    expect(planRowText({ plan: 'trial', trialDaysLeft: 9 })).toEqual({ text: 'Free trial · 9 days left', action: undefined, tone: 'neutral' });
    expect(planRowText({ plan: 'trial', trialDaysLeft: 2 })).toMatchObject({ text: 'Free trial · 2 days left', action: 'Upgrade', tone: 'warning' });
    expect(planRowText({ plan: 'free' })).toMatchObject({ text: 'Read-only', action: 'Upgrade' });
    expect(planRowText({ plan: 'pro', status: 'canceling', endsAt: '2027-01-03T00:00:00Z' })).toMatchObject({ text: 'Pro ends 03 Jan' });
    expect(planRowText({ plan: 'pro', status: 'past_due' })).toMatchObject({ text: 'Payment failed', action: 'Update card', tone: 'error' });
    expect(planRowText({ plan: 'pro', status: 'active' })).toBeNull();
  });

  it('renders a link to billing and no filled button', () => {
    response = readOnly();
    render(<MemoryRouter><PlanCard /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Read-only' })).toHaveAttribute('href', '/app/settings/billing');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the trial days left', () => {
    response = base();
    render(<MemoryRouter><PlanCard /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Free trial · 9 days left' })).toBeInTheDocument();
  });
});

describe('yearlySavingPercent', () => {
  it('is 17 % in USD and in INR (CONTRACT §4)', () => {
    expect(yearlySavingPercent('USD')).toBe(17);
    expect(yearlySavingPercent('INR')).toBe(17);
  });
});

describe('BillingView', () => {
  it('trial: the sentence, what changes when it ends, usage and the Free trial vs Pro table; Upgrade opens checkout yearly', async () => {
    response = base({}, { broker_import: 4 });
    checkout.mockResolvedValue({ url: 'https://checkout.stripe.test/cs_test_1' });
    wrap();
    expect(screen.getByText(/^Free trial: 9 days left, with every Pro feature\. No card on file; on \d+ \w+ your journal becomes read-only unless you upgrade\.$/)).toBeInTheDocument();
    const what = screen.getByRole('region', { name: /When your trial ends/ });
    expect(what).toHaveTextContent('Add, edit or delete trades');
    expect(screen.getByRole('region', { name: /Usage this month/ })).toHaveTextContent('4 of 200');
    const table = screen.getByRole('table', { name: 'Free trial and Pro compared' });
    expect(within(table).getByRole('columnheader', { name: /Free trial/ })).toHaveTextContent('Your plan');
    expect(within(table).getByRole('columnheader', { name: 'Pro' })).toBeInTheDocument();
    expect(within(table).getByText('$49.99 a year')).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /^When it ends/ })).toHaveTextContent('Read-only');
    expect(document.body.textContent).not.toMatch(/Free plan|on Free|move to Free/);
    await userEvent.click(screen.getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
    expect(checkout).toHaveBeenCalledWith({ interval: 'year' });
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.test/cs_test_1'));
  });

  it('read-only: the sentence names what still works, no usage meters, Upgrade to Pro', () => {
    response = readOnly();
    wrap();
    expect(screen.getByText('Your free trial ended on 05 Nov 2026. Your journal is read-only: you can view and export, but not add, edit or delete.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your journal is read-only' })).toHaveTextContent('export your data');
    expect(screen.queryByRole('region', { name: /Usage this month/ })).toBeNull();
    expect(within(screen.getByRole('table')).getByRole('columnheader', { name: /Free trial/ })).toHaveTextContent('Ended');
    expect(screen.getAllByRole('button', { name: 'Upgrade to Pro' }).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/Free plan|on Free/);
  });

  it('switching to monthly changes the price and is remembered for the next upgrade entry', async () => {
    response = base();
    wrap();
    await userEvent.click(screen.getByRole('radio', { name: /Monthly/ }));
    expect(within(screen.getByRole('table')).getByText('$4.99 a month')).toBeInTheDocument();
    expect(localStorage.getItem('tq.billing.interval')).toBe('month');
  });

  it('the Free trial column prints $0 for 14 days and the usage row is AI reports', () => {
    response = base();
    wrap();
    const row = within(screen.getByRole('table')).getByRole('row', { name: /^Price/ });
    expect(row.textContent).toMatch(/^Price\$0 for 14 days\$49\.99/);
    expect(screen.getByText('AI reports')).toBeInTheDocument();
  });

  it('shows INR prices for an INR billing currency', () => {
    response = base({}, {}, { billingCurrency: 'INR' });
    wrap();
    expect(within(screen.getByRole('table')).getByText('₹4,999.00 a year')).toBeInTheDocument();
  });

  describe('a failed checkout shows the API message next to the button that was pressed (former leaf 4.1)', () => {
    const PRICE_NOT_CONFIGURED = { status: 503, data: { success: false, errorCode: 'PRICE_NOT_CONFIGURED', message: 'Pro checkout is not available right now. Please try again later.' } };

    it('the Plans table button: the alert is inside the Plans section and scrolled into view', async () => {
      const scrolled = vi.fn();
      Element.prototype.scrollIntoView = scrolled;
      response = readOnly();
      checkout.mockRejectedValue(PRICE_NOT_CONFIGURED);
      wrap();
      const plans = screen.getByRole('region', { name: 'Plans' });
      await userEvent.click(within(plans).getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
      const alert = await within(plans).findByRole('alert');
      expect(alert).toHaveTextContent('Pro checkout is not available right now. Please try again later.');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(scrolled).toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });

    it('the status button: the alert sits in the plan section', async () => {
      response = base();
      checkout.mockRejectedValue(PRICE_NOT_CONFIGURED);
      wrap();
      const plan = screen.getByRole('region', { name: 'Your plan' });
      await userEvent.click(within(plan).getByRole('button', { name: 'Upgrade to Pro' }));
      expect(await within(plan).findByRole('alert')).toHaveTextContent('Pro checkout is not available right now. Please try again later.');
    });
  });

  it('a checkout failure without an HTTP response reads as a connection problem; a body-less 400 keeps our sentence', async () => {
    response = base();
    checkout.mockRejectedValueOnce({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' });
    wrap();
    await userEvent.click(screen.getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/internet connection/i);
    checkout.mockRejectedValueOnce({ status: 400 });
    await userEvent.click(screen.getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
    await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("Couldn't open checkout. Try again in a moment."));
  });

  it('Pro: sentence, Manage billing opens the portal, no plans table but a Compare plans disclosure', async () => {
    response = pro({ interval: 'year', amount: 79, currency: 'USD', renewsAt: '2027-01-03T00:00:00Z' });
    portal.mockResolvedValue({ url: 'https://billing.stripe.test/p/1' });
    wrap();
    expect(screen.getByText('Pro — $79.00 a year. Renews on 03 Jan 2027.')).toBeInTheDocument();
    expect(screen.getByText(/Invoices and payment method open in Stripe's secure portal\. Billed in USD\./)).toBeInTheDocument();
    expect(screen.getByText('Compare plans')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Manage billing' }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://billing.stripe.test/p/1'));
  });

  it('payment failed: the sentence with Update card, announced once (the notice slot owns the alert)', () => {
    response = pro({ status: 'past_due' });
    wrap();
    expect(screen.getByText('Your last payment failed. Update your card to keep Pro.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Update card' })).toBeInTheDocument();
  });

  it('error: shows the API message; the connection message only without a response', () => {
    isError = true;
    response = undefined;
    failure = { status: 500, data: { message: 'Billing is being updated.' } };
    const { unmount } = wrap();
    expect(screen.getByRole('alert')).toHaveTextContent('Billing is being updated.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    failure = { status: 'FETCH_ERROR' };
    wrap();
    expect(screen.getByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('error: Couldn’t load your plan with Retry and no purchase button', async () => {
    isError = true;
    response = undefined;
    wrap();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your plan.");
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('checkout cancelled: a neutral note', () => {
    response = base();
    wrap('/app/settings/billing?checkout=cancelled');
    expect(screen.getByRole('status')).toHaveTextContent('Checkout was cancelled. Nothing was charged.');
  });

  it('back from checkout: the session is verified at once and Pro shows', async () => {
    response = pro();
    wrap('/app/settings/billing?session_id=cs_test_1');
    expect(verify).toHaveBeenCalledWith('cs_test_1');
    expect(screen.getByRole('status')).toHaveTextContent('Payment received — Pro is active.');
  });

  it('back from checkout while read-only still shows: verify, confirming, then the slow message after 30 s', () => {
    vi.useFakeTimers({ now: Date.now(), toFake: ['setInterval', 'clearInterval', 'Date'] });
    response = readOnly();
    verify.mockRejectedValue({ status: 500 });
    wrap('/app/settings/billing?session_id=cs_test_2');
    expect(verify).toHaveBeenCalledWith('cs_test_2');
    expect(screen.getByText('We are confirming your payment…')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(refetch).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('This is taking longer than usual. Refresh, or contact support — you have not been charged twice.');
  });
});

describe('UsageMeter', () => {
  const row = (used: number, limit: number | null) => ({ feature: 'ai_extract' as const, used, limit, ratio: limit ? Math.min(1, used / limit) : null });

  it('shows used of limit with a progressbar valuetext', () => {
    render(<UsageMeter row={row(6, 200)} />);
    expect(screen.getByText('6 of 200')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '6 of 200 ai extractions this month');
  });

  it('says the limit is reached and when it resets', () => {
    render(<UsageMeter row={row(5, 5)} resetsAt="2026-12-01T00:00:00Z" />);
    expect(screen.getByText('Limit reached — resets 01 Dec')).toBeInTheDocument();
  });

  it('unlimited shows the count and the word, no bar', () => {
    render(<UsageMeter row={row(4, null)} />);
    expect(screen.getByText('4 · unlimited')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
