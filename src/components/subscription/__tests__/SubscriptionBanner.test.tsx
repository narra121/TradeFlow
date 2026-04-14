import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionBanner } from '../SubscriptionBanner';

describe('SubscriptionBanner', () => {
  const defaultProps = {
    reason: 'trial_expired' as const,
    onSubscribe: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders trial_expired message with date', () => {
    render(
      <SubscriptionBanner
        {...defaultProps}
        reason="trial_expired"
        trialEnd="2026-04-10T00:00:00.000Z"
      />
    );

    // The message includes the formatted date (locale-dependent format)
    expect(
      screen.getByText(/your free trial ended on/i)
    ).toBeInTheDocument();
  });

  it('renders payment_failed message', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="payment_failed" />
    );

    expect(
      screen.getByText(/payment failed/i)
    ).toBeInTheDocument();
  });

  it('renders subscription_cancelled message', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="subscription_cancelled" />
    );

    expect(
      screen.getByText(/your subscription was cancelled/i)
    ).toBeInTheDocument();
  });

  it('shows correct CTA button text per reason', () => {
    const { unmount: u1 } = render(
      <SubscriptionBanner {...defaultProps} reason="trial_expired" />
    );
    expect(screen.getByRole('button', { name: 'Subscribe Now' })).toBeInTheDocument();
    u1();

    const { unmount: u2 } = render(
      <SubscriptionBanner {...defaultProps} reason="payment_failed" />
    );
    expect(screen.getByRole('button', { name: 'Update Payment' })).toBeInTheDocument();
    u2();

    render(
      <SubscriptionBanner {...defaultProps} reason="subscription_cancelled" />
    );
    expect(screen.getByRole('button', { name: 'Resubscribe' })).toBeInTheDocument();
  });

  it('calls onSubscribe when CTA button is clicked', async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();

    render(
      <SubscriptionBanner {...defaultProps} onSubscribe={onSubscribe} />
    );

    await user.click(screen.getByRole('button', { name: 'Subscribe Now' }));

    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when X button is clicked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onDismiss = vi.fn();

    render(
      <SubscriptionBanner {...defaultProps} onDismiss={onDismiss} />
    );

    await user.click(screen.getByRole('button', { name: /dismiss banner/i }));

    // The component waits 300ms for animation before calling onDismiss
    vi.advanceTimersByTime(300);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not render when dismissed via sessionStorage', () => {
    sessionStorage.setItem('tradeQut_banner_dismissed', 'true');

    const { container } = render(
      <SubscriptionBanner {...defaultProps} />
    );

    // Component returns null when previously dismissed
    expect(container.innerHTML).toBe('');
  });
});
