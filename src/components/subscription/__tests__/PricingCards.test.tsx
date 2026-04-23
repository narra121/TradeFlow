import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PricingCards } from '../PricingCards';

// Mock useCurrency to return USD by default
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ currency: 'USD' as const, loading: false }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PricingCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 tier cards (Free, Monthly, Yearly)', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('shows "MOST POPULAR" badge on yearly card', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
  });

  it('shows USD prices ($0, $1.99, $19.99)', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$1.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('shows transparency note', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(
      screen.getByText(
        'These charges are purely to cover development and infrastructure costs only and may increase in future if the infrastructure cost increases.'
      )
    ).toBeInTheDocument();
  });

  it('shows all features on each card', () => {
    renderWithRouter(<PricingCards context="landing" />);

    // Each feature label appears 3 times (once per card)
    const entries = screen.getAllByText('Unlimited trade entries');
    expect(entries).toHaveLength(3);
  });

  it('shows strikethrough for paid-only features on the free card', () => {
    renderWithRouter(<PricingCards context="landing" />);

    const adTexts = screen.getAllByText('Ad-free experience');
    expect(adTexts[0]).toHaveClass('line-through');
    expect(adTexts[1]).not.toHaveClass('line-through');
  });

  it('shows "Includes ads" note on free card and "No ads" on paid cards', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByText('Includes ads')).toBeInTheDocument();
    // Two paid cards with "No ads" prefix (yearly has extra info)
    expect(screen.getByText('No ads')).toBeInTheDocument();
    expect(screen.getByText(/No ads \u2022 ~\$1\.67\/month/)).toBeInTheDocument();
  });

  it('shows "Your Plan" badge in profile context for free users', () => {
    renderWithRouter(
      <PricingCards context="profile" currentStatus={null} />
    );

    expect(screen.getByText('Your Plan')).toBeInTheDocument();
  });

  it('does not show "Your Plan" badge for active subscribers', () => {
    renderWithRouter(
      <PricingCards context="profile" currentStatus="active" />
    );

    expect(screen.queryByText('Your Plan')).not.toBeInTheDocument();
  });

  it('shows subscribe buttons in profile context for free users', () => {
    const onSelectPlan = vi.fn();
    renderWithRouter(
      <PricingCards
        context="profile"
        currentStatus={null}
        onSelectPlan={onSelectPlan}
      />
    );

    expect(screen.getByRole('button', { name: 'Current Plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Subscribe Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe Yearly' })).toBeInTheDocument();
  });

  it('calls onSelectPlan with correct period when subscribe buttons are clicked', async () => {
    const user = userEvent.setup();
    const onSelectPlan = vi.fn();

    renderWithRouter(
      <PricingCards
        context="profile"
        currentStatus={null}
        onSelectPlan={onSelectPlan}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Subscribe Monthly' }));
    expect(onSelectPlan).toHaveBeenCalledWith('monthly');

    await user.click(screen.getByRole('button', { name: 'Subscribe Yearly' }));
    expect(onSelectPlan).toHaveBeenCalledWith('yearly');
  });

  it('does not show subscribe buttons for active subscribers on paid cards', () => {
    renderWithRouter(
      <PricingCards context="profile" currentStatus="active" />
    );

    expect(screen.queryByRole('button', { name: 'Subscribe Monthly' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subscribe Yearly' })).not.toBeInTheDocument();
  });

  it('shows "Get Started" links in landing context', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByRole('link', { name: 'Get Started Free' })).toBeInTheDocument();

    const getStartedLinks = screen.getAllByRole('link', { name: 'Get Started' });
    expect(getStartedLinks).toHaveLength(2);

    // All links should point to /signup
    expect(screen.getByRole('link', { name: 'Get Started Free' })).toHaveAttribute('href', '/signup');
    getStartedLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/signup');
    });
  });

  it('disables subscribe buttons when isProcessing is true', () => {
    renderWithRouter(
      <PricingCards
        context="profile"
        currentStatus={null}
        onSelectPlan={vi.fn()}
        isProcessing
      />
    );

    // Both paid cards show Processing...
    const processingButtons = screen.getAllByRole('button', { name: 'Processing...' });
    expect(processingButtons).toHaveLength(2);
    processingButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows period labels (forever, per month, per year)', () => {
    renderWithRouter(<PricingCards context="landing" />);

    expect(screen.getByText('forever')).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
    expect(screen.getByText('per year')).toBeInTheDocument();
  });
});
