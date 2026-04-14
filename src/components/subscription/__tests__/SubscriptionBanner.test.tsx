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
    sessionStorage.setItem('tradeQut_banner_dismissed_trial_expired', 'true');

    const { container } = render(
      <SubscriptionBanner {...defaultProps} />
    );

    // Component returns null when previously dismissed
    expect(container.innerHTML).toBe('');
  });

  it('renders trial_active message with date', () => {
    render(
      <SubscriptionBanner
        {...defaultProps}
        reason="trial_active"
        trialEnd="2026-05-10T00:00:00.000Z"
      />
    );

    expect(
      screen.getByText(/your free trial expires on/i)
    ).toBeInTheDocument();
  });

  it('renders trial_active message without date', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="trial_active" />
    );

    expect(
      screen.getByText(/you are on a free trial/i)
    ).toBeInTheDocument();
  });

  it('shows Subscribe Now button for trial_active reason', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="trial_active" />
    );

    expect(screen.getByRole('button', { name: 'Subscribe Now' })).toBeInTheDocument();
  });

  it('renders subscription_ended message', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="subscription_ended" />
    );

    expect(
      screen.getByText(/your subscription has ended/i)
    ).toBeInTheDocument();
  });

  it('renders no_subscription message', () => {
    render(
      <SubscriptionBanner {...defaultProps} reason="no_subscription" />
    );

    expect(
      screen.getByText(/subscribe to access all tradeQut features/i)
    ).toBeInTheDocument();
  });

  it('uses reason-specific dismiss keys so dismissing one reason does not affect another', () => {
    sessionStorage.setItem('tradeQut_banner_dismissed_trial_expired', 'true');

    // trial_expired should be dismissed
    const { container: c1, unmount: u1 } = render(
      <SubscriptionBanner {...defaultProps} reason="trial_expired" />
    );
    expect(c1.innerHTML).toBe('');
    u1();

    // payment_failed should still render (different dismiss key)
    const { container: c2 } = render(
      <SubscriptionBanner {...defaultProps} reason="payment_failed" />
    );
    expect(c2.innerHTML).not.toBe('');
  });
});
