import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { emitPlanSignal } from '@/lib/planErrors';

const checkout = vi.fn();
const refetch = vi.fn();
const plan: { proEndedAt?: string } = {};
vi.mock('@/store/api/billingApi', () => ({
  useGetEntitlementsQuery: () => ({
    data: {
      entitlements: { plan: 'free', status: 'free', ...plan, limits: { ai_extract: 5, ai_insight: 1, ai_chat: 10, broker_import: 3 }, features: { advanced_analytics: false, tax_report: false, unlimited_accounts: false, auto_sync: false } },
      usage: { ai_extract: 5, ai_insight: 0, ai_chat: 0, broker_import: 0 },
      periodResetsAt: '2026-12-01T00:00:00Z',
      billingCurrency: 'USD',
    },
    isLoading: false,
    isError: false,
    refetch,
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
  refetch.mockReset();
  delete plan.proEndedAt;
  localStorage.clear();
});

describe('describePlanSignal', () => {
  it('names what was used, when it resets and what Pro includes (QUOTA_EXCEEDED)', () => {
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_extract', limit: 5, resetsAt: '2026-12-01T00:00:00Z', message: 'x', kind: 'mutation' })).toEqual({
      title: 'You have used 5 of 5 AI extractions this month',
      body: 'Resets 1 Dec. Pro includes 200 per month.',
    });
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: 10, message: 'x', kind: 'mutation' }).title).toBe('You have used 10 of 10 AI chat messages this month');
    expect(describePlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'broker_import', limit: 3, resetsAt: '2026-12-01T00:00:00Z', message: 'x', kind: 'mutation' }).body).toBe('Resets 1 Dec. Pro includes unlimited (fair use 200/month).');
  });

  it('says a feature is part of Pro and what it answers (PLAN_REQUIRED)', () => {
    expect(describePlanSignal({ code: 'PLAN_REQUIRED', feature: 'tax_report', message: 'x', kind: 'mutation' })).toEqual({
      title: 'The tax report is part of Pro',
      body: 'See charges and tax P&L in one report.',
    });
  });

  it('says the trial ended and what still works (TRIAL_EXPIRED), never a quota sentence', () => {
    expect(describePlanSignal({ code: 'TRIAL_EXPIRED', message: 'x', kind: 'mutation' })).toEqual({
      title: 'Your free trial has ended',
      body: 'Your trades are safe, and you can still view and export them. Upgrade to Pro to add, edit or delete.',
    });
  });

  it('a former Pro user is told Pro ended, not the free trial', () => {
    expect(describePlanSignal({ code: 'TRIAL_EXPIRED', message: 'x', kind: 'mutation' }, { proEnded: true }).title).toBe('Your Pro plan has ended');
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
    expect(screen.getByText('Pro is $49.99 a year.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('a TRIAL_EXPIRED 402 from any write opens it with Upgrade to Pro and refreshes the plan (one global handler)', async () => {
    const { classifyPlanError } = await import('@/lib/planErrors');
    setup();
    const signal = classifyPlanError(402, { success: false, errorCode: 'TRIAL_EXPIRED', message: 'Your free trial has ended. Upgrade to Pro to add, edit or delete.' });
    act(() => emitPlanSignal(signal!));
    expect(await screen.findByRole('dialog', { name: 'Your free trial has ended' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument();
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText(/monthly limit|of 5/)).toBeNull();
  });

  it('after a lapsed Pro plan (proEndedAt) the TRIAL_EXPIRED dialog says Pro ended', async () => {
    plan.proEndedAt = '2026-11-12T00:00:00.000Z';
    setup();
    act(() => emitPlanSignal({ code: 'TRIAL_EXPIRED', message: 'x', kind: 'mutation' }));
    expect(await screen.findByRole('dialog', { name: 'Your Pro plan has ended' })).toBeInTheDocument();
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

describe('UpgradeDialog while it closes', () => {
  it('keeps its title and body during the exit animation instead of fading out empty', async () => {
    // jsdom runs no CSS animation; report one on exit so Radix keeps the closing dialog mounted, as a browser does.
    const real = window.getComputedStyle.bind(window);
    const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo);
      const state = (el as HTMLElement).dataset?.state;
      if (el instanceof HTMLElement && el.getAttribute('role') === 'dialog' && state) {
        return { ...style, animationName: state === 'closed' ? 'exit' : 'enter', display: 'grid', getPropertyValue: style.getPropertyValue.bind(style) } as CSSStyleDeclaration;
      }
      return style;
    });
    try {
      const user = userEvent.setup();
      setup();
      act(() => emitPlanSignal({ code: 'TRIAL_EXPIRED', message: 'x', kind: 'mutation' }));
      await screen.findByText('Your free trial has ended');
      await user.click(screen.getByRole('button', { name: 'Not now' }));
      const closing = document.querySelector('[role="dialog"][data-state="closed"]');
      expect(closing).not.toBeNull();
      expect(closing).toHaveTextContent('Your free trial has ended');
      expect(closing).toHaveTextContent('Your trades are safe');
    } finally {
      spy.mockRestore();
    }
  });
});
