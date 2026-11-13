import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
const saveWritable = vi.fn();
const refetch = vi.fn();
vi.mock('@/store/api/billingApi', () => ({
  useGetEntitlementsQuery: () => ({ data: response, isLoading: false, isError, error: failure, refetch }),
  useCreateCheckoutMutation: () => [(a: unknown) => ({ unwrap: () => checkout(a) }), { isLoading: false }],
  useOpenPortalMutation: () => [() => ({ unwrap: () => portal() }), { isLoading: false }],
  useSaveWritableAccountsMutation: () => [(a: unknown) => ({ unwrap: () => saveWritable(a) }), { isLoading: false }],
}));
vi.mock('@/store/api/accountsApi', () => ({ useGetAccountsQuery: () => ({ data: { accounts }, isLoading: false }) }));

import { BillingView } from '../BillingView';
import { PlanCard } from '../PlanCard';
import { UsageMeter } from '../UsageMeter';
import { planRowText, planState } from '../planState';
import { yearlySavingPercent } from '../freeLimits';

type Ent = EntitlementsResponse['entitlements'] & Record<string, unknown>;
const NOW = new Date('2026-11-11T12:00:00Z');

const base = (over: Partial<Ent> = {}, usage: Partial<EntitlementsResponse['usage']> = {}, extra: Partial<EntitlementsResponse> = {}): EntitlementsResponse => ({
  entitlements: {
    plan: 'free', status: 'free',
    limits: { ai_extract: 5, ai_insight: 1, ai_chat: 10, broker_import: 3 },
    features: { advanced_analytics: false, tax_report: false, unlimited_accounts: false, auto_sync: false },
    ...over,
  } as unknown as Ent,
  usage: { ai_extract: 0, ai_insight: 0, ai_chat: 0, broker_import: 0, ...usage },
  periodResetsAt: '2026-12-01T00:00:00Z',
  billingCurrency: 'USD',
  ...extra,
});
const pro = (over: Partial<Ent> = {}) =>
  base({ plan: 'pro', status: 'active', limits: { ai_extract: 200, ai_insight: 30, ai_chat: 500, broker_import: 200 }, features: { advanced_analytics: true, tax_report: true, unlimited_accounts: true, auto_sync: true }, ...over });

const wrap = (path = '/app/settings/billing') => render(<MemoryRouter initialEntries={[path]}><BillingView /></MemoryRouter>);

const assign = vi.fn();
const realLocation = window.location;
beforeEach(() => {
  isError = false;
  failure = undefined;
  accounts = [{ id: 'a1', name: 'FTMO', currency: 'USD' }];
  [checkout, portal, saveWritable, refetch, assign].forEach((m) => m.mockReset());
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
  it('trial', () => {
    const s = planState({ plan: 'trial', status: 'trialing', trialDaysLeft: 9, trialEndsAt: '2026-11-20T12:00:00Z' }, NOW);
    expect(s).toMatchObject({ kind: 'trial', sentence: 'Pro trial — 9 days left. No card on file; on 20 Nov you move to Free.', action: 'upgrade' });
    expect(planState({ plan: 'trial', trialDaysLeft: 1 }, NOW).sentence).toBe('Pro trial — 1 day left. No card on file.');
  });
  it('free after a trial that ended within 14 days, then plain Free', () => {
    const recent = planState({ plan: 'free', status: 'free', trialEndedAt: '2026-11-05T00:00:00Z' }, NOW);
    expect(recent).toMatchObject({ kind: 'trial_ended', sentence: 'Your Pro trial ended on 05 Nov 2026. You are on Free.', showWhatChanged: true });
    expect(planState({ plan: 'free', trialEndedAt: '2026-09-01T00:00:00Z' }, NOW)).toMatchObject({ kind: 'free', sentence: 'Free plan.', showWhatChanged: false });
    expect(planState({ plan: 'free' }, NOW).sentence).toBe('Free plan.');
  });
  it('pro renewing with price and date, and dropping clauses the API did not return', () => {
    expect(planState({ plan: 'pro', status: 'active', interval: 'year', amount: 79, currency: 'USD', renewsAt: '2027-01-03T00:00:00Z' }, NOW).sentence).toBe('Pro — $79.00 a year. Renews on 03 Jan 2027.');
    expect(planState({ plan: 'pro', status: 'active', renewsAt: '2027-01-03T00:00:00Z' }, NOW).sentence).toBe('Pro — renews on 03 Jan 2027.');
    expect(planState({ plan: 'pro', status: 'active' }, NOW)).toMatchObject({ sentence: 'Pro — active.', action: 'manage' });
  });
  it('legacy price is stated', () => {
    expect(planState({ plan: 'pro', status: 'active', legacyPrice: true, renewsAt: '2027-01-03T00:00:00Z' }, NOW).sentence).toBe('Pro (legacy price) — renews on 03 Jan 2027.');
  });
  it('cancelled at period end', () => {
    expect(planState({ plan: 'pro', status: 'canceling', endsAt: '2027-01-03T00:00:00Z' }, NOW)).toMatchObject({
      kind: 'pro_canceling',
      sentence: 'Pro — ends on 03 Jan 2027. After that you move to Free; your trades stay.',
      action: 'manage',
    });
  });
  it('payment failed', () => {
    expect(planState({ plan: 'pro', status: 'past_due' }, NOW)).toMatchObject({ kind: 'past_due', sentence: 'Your last payment failed. Update your card to keep Pro.', action: 'update_card' });
  });
});

describe('plan row (sidebar footer)', () => {
  it('text per state', () => {
    expect(planRowText({ plan: 'trial', trialDaysLeft: 9 })).toEqual({ text: 'Pro trial · 9 days left', action: undefined, tone: 'neutral' });
    expect(planRowText({ plan: 'trial', trialDaysLeft: 2 })).toMatchObject({ text: 'Pro trial · 2 days left', action: 'Upgrade', tone: 'warning' });
    expect(planRowText({ plan: 'free' })).toMatchObject({ text: 'Free plan', action: 'Upgrade' });
    expect(planRowText({ plan: 'pro', status: 'canceling', endsAt: '2027-01-03T00:00:00Z' })).toMatchObject({ text: 'Pro ends 03 Jan' });
    expect(planRowText({ plan: 'pro', status: 'past_due' })).toMatchObject({ text: 'Payment failed', action: 'Update card', tone: 'error' });
    expect(planRowText({ plan: 'pro', status: 'active' })).toBeNull();
  });

  it('renders a link to billing and no filled button', () => {
    response = base({ plan: 'free' });
    render(<MemoryRouter><PlanCard /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Free plan' })).toHaveAttribute('href', '/app/settings/billing');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('yearlySavingPercent', () => {
  it('is 17 % in USD and in INR (CONTRACT §4)', () => {
    expect(yearlySavingPercent('USD')).toBe(17);
    expect(yearlySavingPercent('INR')).toBe(17);
  });
});

describe('BillingView', () => {
  it('shows the trial sentence, what changes on Free, usage and the plans table; Upgrade opens checkout with yearly by default', async () => {
    response = base({ plan: 'trial', status: 'trialing', trialEndsAt: new Date(Date.now() + 8.5 * 86_400_000).toISOString() }, { broker_import: 4 });
    checkout.mockResolvedValue({ url: 'https://checkout.stripe.test/cs_test_1' });
    wrap();
    expect(screen.getByText(/Pro trial — 9 days left\. No card on file; on \d+ \w+ you move to Free\./)).toBeInTheDocument();
    const what = screen.getByRole('region', { name: /If you move to Free/ });
    expect(what).toHaveTextContent('3 broker imports a month (you used 4)');
    expect(what).toHaveTextContent('Edge, Timing and Risk analytics');
    expect(screen.getByRole('region', { name: /Usage this month/ })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Free and Pro compared' });
    expect(within(table).getByText('After your trial')).toBeInTheDocument();
    expect(within(table).getByText('$49.99 a year')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
    expect(checkout).toHaveBeenCalledWith({ interval: 'year' });
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.stripe.test/cs_test_1'));
  });

  it('switching to monthly changes the price and is remembered for the next upgrade entry', async () => {
    response = base();
    wrap();
    await userEvent.click(screen.getByRole('radio', { name: /Monthly/ }));
    expect(within(screen.getByRole('table')).getByText('$4.99 a month')).toBeInTheDocument();
    expect(localStorage.getItem('tq.billing.interval')).toBe('month');
  });

  it('the Free column prints the price as $0 and the usage row is AI reports', () => {
    response = base();
    wrap();
    const row = within(screen.getByRole('table')).getByRole('row', { name: /^Price/ });
    expect(row.textContent).toMatch(/^Price\$0\$49\.99/);
    expect(screen.getByText('AI reports')).toBeInTheDocument();
  });

  it('shows INR prices for an INR billing currency', () => {
    response = base({}, {}, { billingCurrency: 'INR' });
    wrap();
    expect(within(screen.getByRole('table')).getByText('₹4,999.00 a year')).toBeInTheDocument();
  });

  it('an inline error replaces a failed checkout, never a toast', async () => {
    response = base();
    checkout.mockRejectedValue({ status: 503, data: { errorCode: 'PRICE_NOT_CONFIGURED', message: 'Checkout is not available right now.' } });
    wrap();
    await userEvent.click(screen.getAllByRole('button', { name: 'Upgrade to Pro' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout is not available right now.');
    expect(assign).not.toHaveBeenCalled();
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

  it('Free with three accounts: the chooser limits the choice to two and saves it', async () => {
    response = base();
    accounts = [{ id: 'a1', name: 'FTMO', currency: 'USD' }, { id: 'a2', name: 'Zerodha', currency: 'INR' }, { id: 'a3', name: 'Demo', currency: 'USD' }];
    saveWritable.mockResolvedValue({ writableAccountIds: ['a1', 'a2'] });
    wrap();
    expect(screen.getByText('Choose the 2 accounts you keep adding trades to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save choice' })).toBeDisabled();
    await userEvent.click(screen.getByRole('option', { name: /FTMO/ }));
    await userEvent.click(screen.getByRole('option', { name: /Zerodha/ }));
    expect(screen.getByRole('option', { name: /Demo/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Untick one to choose a different account.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /Demo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choice' }));
    expect(saveWritable).toHaveBeenCalledWith(['a1', 'a2']);
    expect(await screen.findByText('Saved. The other accounts are read-only on Free.')).toBeInTheDocument();
  });

  it('Free with 100 accounts: search, pick two, they are listed first and Save sits outside the scrolling list', async () => {
    response = base();
    accounts = Array.from({ length: 100 }, (_, i) => ({ id: `a${i + 1}`, name: `Account ${String(i + 1).padStart(3, '0')}`, currency: i % 2 ? 'INR' : 'USD' }));
    saveWritable.mockResolvedValue({ writableAccountIds: ['a64', 'a2'] });
    wrap();
    const list = screen.getByRole('listbox', { name: 'Accounts that stay writable' });
    // One change event instead of a keystroke at a time: each keystroke redraws all 100 rows.
    const search = screen.getByRole('searchbox', { name: 'Search accounts' });
    fireEvent.change(search, { target: { value: '064' } });
    fireEvent.click(within(list).getByText('Account 064'));
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(within(list).getByText('Account 002'));

    const rows = within(list).getAllByRole('option');
    expect(rows).toHaveLength(100);
    expect(rows.slice(0, 2).map((o) => o.textContent)).toEqual(['Account 002INR', 'Account 064INR']);
    expect(within(screen.getByRole('group', { name: 'Stay writable' })).getAllByRole('option')).toHaveLength(2);
    expect(rows.slice(2).every((o) => o.getAttribute('aria-disabled') === 'true')).toBe(true);

    const save = screen.getByRole('button', { name: 'Save choice' });
    expect(list).not.toContainElement(save);
    await userEvent.click(save);
    expect(saveWritable).toHaveBeenCalledWith(['a64', 'a2']);
  });

  it('says so when the choice cannot be saved', async () => {
    response = base();
    accounts = [{ id: 'a1', name: 'FTMO', currency: 'USD' }, { id: 'a2', name: 'Zerodha', currency: 'INR' }, { id: 'a3', name: 'Demo', currency: 'USD' }];
    saveWritable.mockRejectedValue({ status: 500, data: {} });
    wrap();
    await userEvent.click(screen.getByRole('option', { name: /FTMO/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save choice' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/save your choice|try again/i);
  });

  it('no chooser within the Free limit', () => {
    response = base();
    wrap();
    expect(screen.queryByText(/you keep adding trades to/)).toBeNull();
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

  it('back from checkout once Pro shows: Payment received', () => {
    response = pro();
    wrap('/app/settings/billing?session_id=cs_test_1');
    expect(screen.getByRole('status')).toHaveTextContent('Payment received — Pro is active.');
  });

  it('back from checkout while Free still shows: confirming, then the slow message after 30 s', () => {
    vi.useFakeTimers({ now: Date.now(), toFake: ['setInterval', 'clearInterval', 'Date'] });
    response = base();
    wrap('/app/settings/billing?session_id=cs_test_2');
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
