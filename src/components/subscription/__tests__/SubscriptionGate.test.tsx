import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionGate } from '../SubscriptionGate';

function renderGate(subscription: { status: string; trialEnd?: string } | null) {
  return render(
    <MemoryRouter>
      <SubscriptionGate subscription={subscription}>
        <div data-testid="child-content">Protected Content</div>
      </SubscriptionGate>
    </MemoryRouter>
  );
}

describe('SubscriptionGate', () => {
  it('renders children normally when status is active', () => {
    renderGate({ status: 'active' });

    const child = screen.getByTestId('child-content');
    expect(child).toBeInTheDocument();
    // Should not show overlay
    expect(screen.queryByText('Subscription Required')).not.toBeInTheDocument();
  });

  it('renders children normally when status is trialing with future trialEnd', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    renderGate({ status: 'trialing', trialEnd: futureDate });

    const child = screen.getByTestId('child-content');
    expect(child).toBeInTheDocument();
    expect(screen.queryByText('Subscription Required')).not.toBeInTheDocument();
  });

  it('shows overlay when status is cancelled', () => {
    renderGate({ status: 'cancelled' });

    expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    expect(
      screen.getByText(/your subscription was cancelled/i)
    ).toBeInTheDocument();
  });

  it('shows overlay when status is trialing with past trialEnd', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    renderGate({ status: 'trialing', trialEnd: pastDate });

    expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    expect(
      screen.getByText(/your free trial has expired/i)
    ).toBeInTheDocument();
  });

  it('shows overlay when subscription is null', () => {
    renderGate(null);

    expect(screen.getByText('Subscription Required')).toBeInTheDocument();
    expect(
      screen.getByText(/a subscription is required/i)
    ).toBeInTheDocument();
  });

  it('shows "Subscribe Now" button in overlay', () => {
    renderGate({ status: 'cancelled' });

    const subscribeLink = screen.getByRole('link', { name: /subscribe now/i });
    expect(subscribeLink).toBeInTheDocument();
    expect(subscribeLink).toHaveAttribute('href', '/app/profile');
  });

  it('shows plan cards in overlay', () => {
    renderGate(null);

    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('$1.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Save 17%')).toBeInTheDocument();
  });
});
