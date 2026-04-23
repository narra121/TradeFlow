import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionGate } from '../SubscriptionGate';

function renderGate(
  subscription: { status: string; trialEnd?: string } | null,
  isLoading?: boolean
) {
  return render(
    <MemoryRouter>
      <SubscriptionGate subscription={subscription} isLoading={isLoading}>
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
    expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument();
  });

  it('renders children normally when status is trialing with future trialEnd', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    renderGate({ status: 'trialing', trialEnd: futureDate });

    const child = screen.getByTestId('child-content');
    expect(child).toBeInTheDocument();
    expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument();
  });

  it('shows overlay when status is cancelled', () => {
    renderGate({ status: 'cancelled' });

    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(
      screen.getByText(/subscribe to enjoy an ad-free experience/i)
    ).toBeInTheDocument();
  });

  it('shows overlay when status is trialing with past trialEnd', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    renderGate({ status: 'trialing', trialEnd: pastDate });

    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(
      screen.getByText(/subscribe to enjoy an ad-free experience/i)
    ).toBeInTheDocument();
  });

  it('shows overlay when subscription is null', () => {
    renderGate(null);

    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(
      screen.getByText(/subscribe to enjoy an ad-free experience/i)
    ).toBeInTheDocument();
  });

  it('shows "View Plans" link in overlay', () => {
    renderGate({ status: 'cancelled' });

    const viewPlansLink = screen.getByRole('link', { name: /view plans/i });
    expect(viewPlansLink).toBeInTheDocument();
    expect(viewPlansLink).toHaveAttribute('href', '/app/profile');
  });

  it('renders children when isLoading is true even without active subscription', () => {
    renderGate(null, true);

    const child = screen.getByTestId('child-content');
    expect(child).toBeInTheDocument();
    expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument();
  });
});
