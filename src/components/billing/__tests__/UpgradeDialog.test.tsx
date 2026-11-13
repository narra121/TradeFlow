import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { emitPlanSignal } from '@/lib/planErrors';

const checkout = vi.fn();
vi.mock('@/store/api/billingApi', () => ({
  useGetEntitlementsQuery: () => ({
    data: {
      entitlements: { plan: 'free', status: 'free', limits: { ai_extract: 5, ai_insight: 1, ai_chat: 10, broker_import: 3 }, features: { advanced_analytics: false, tax_report: false, unlimited_accounts: false, auto_sync: false } },
      usage: { ai_extract: 5, ai_insight: 0, ai_chat: 0, broker_import: 0 },
      periodResetsAt: '2026-12-01T00:00:00Z',
      billingCurrency: 'USD',
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateCheckoutMutation: () => [(a: unknown) => ({ unwrap: () => checkout(a) }), { isLoading: false }],
  useOpenPortalMutation: () => [() => ({ unwrap: () => Promise.resolve({ url: 'x' }) }), { isLoading: false }],
}));

import { UpgradeDialog } from '../UpgradeDialog';
import { describePlanSignal } from '../planSignalCopy';

const setup = () =>
  render(
    <MemoryRouter>
      <UpgradeDialog />
    </MemoryRouter>,
  );

beforeEach(() => {
  checkout.mockReset();
  localStorage.clear();
});

describe('describePlanSignal', () => {
  it('names what was used, when it resets and what Pro includes (QUOTA_EXCEEDED)', () => {
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_extract', limit: 5, resetsAt: '2026-12-01T00:00:00Z', message: 'x', kind: 'mutation' })).toEqual({
      title: 'You have used 5 of 5 AI extractions this month',
      body: 'Resets 01 Dec. Pro includes 200 per month.',
    });
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: 10, message: 'x', kind: 'mutation' }).title).toBe('You have used 10 of 10 AI chat messages this month');
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, resetsAt: '2026-12-01T00:00:00Z', message: 'x', kind: 'mutation' }).body).toBe('Resets 01 Dec. Pro includes unlimited (fair use 200/month).');
  });

  it('says a feature is part of Pro and what it answers (PLAN_REQUIRED)', () => {
    expect(describePlanSignal({ code: 'PLAN_REQUIRED', feature: 'unlimited_accounts', message: 'x', kind: 'mutation' })).toEqual({
      title: 'More than 2 trading accounts is part of Pro',
      body: 'Keep every account in one journal.',
    });
  });

  it('uses the server message when the feature is unknown', () => {
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', message: 'Limit hit', kind: 'mutation' }).body).toBe('Limit hit');
  });
});

describe('UpgradeDialog', () => {
  it('opens on a mutation quota signal with the numbers from the payload and the price', async () => {
    setup();
    act(() => emitPlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_extract', limit: 5, resetsAt: '2026-12-01T00:00:00Z', message: 'x', kind: 'mutation' }));
    expect(await screen.findByText('You have used 5 of 5 AI extractions this month')).toBeInTheDocument();
    expect(screen.getByText('Pro is $79.00 a year.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('ignores query signals (those render a locked preview in place)', () => {
    setup();
    act(() => emitPlanSignal({ code: 'PLAN_REQUIRED', feature: 'advanced_analytics', message: 'x', kind: 'query' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Upgrade to Pro uses the same checkout call as the billing page', async () => {
    checkout.mockRejectedValue({ status: 503, data: { message: 'Checkout is not available right now.' } });
    setup();
    act(() => emitPlanSignal({ code: 'PLAN_REQUIRED', feature: 'tax_report', message: 'x', kind: 'mutation' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Upgrade to Pro' }));
    expect(checkout).toHaveBeenCalledWith({ interval: 'year' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Checkout is not available right now.');
  });

  it('Not now closes it', async () => {
    setup();
    act(() => emitPlanSignal({ code: 'PLAN_REQUIRED', feature: 'tax_report', message: 'x', kind: 'mutation' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
