import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { TrendingUp, DollarSign } from 'lucide-react';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Total P&L',
    value: 1250,
    icon: DollarSign,
  };

  it('renders without crashing', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
  });

  it('displays the title text', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
  });

  it('displays a numeric value formatted with locale string', () => {
    render(<StatCard {...defaultProps} value={1250} />);
    // toLocaleString output may vary by environment; check that the value is rendered
    expect(screen.getByText((1250).toLocaleString())).toBeInTheDocument();
  });

  it('displays a string value as-is', () => {
    render(<StatCard {...defaultProps} value="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders prefix and suffix around the value', () => {
    render(<StatCard {...defaultProps} value={500} prefix="$" suffix=" USD" />);
    const valueEl = screen.getByText(/\$500 USD/);
    expect(valueEl).toBeInTheDocument();
  });

  it('shows a positive trend indicator when trend is provided', () => {
    render(
      <StatCard
        {...defaultProps}
        trend={{ value: 12.5, isPositive: true }}
      />
    );
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('shows a negative trend indicator without plus sign', () => {
    render(
      <StatCard
        {...defaultProps}
        trend={{ value: -3.2, isPositive: false }}
      />
    );
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
  });

  it('does not render a trend badge when trend is not provided', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatCard {...defaultProps} className="my-custom-class" />
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('renders with different variant props without crashing', () => {
    const variants = ['default', 'success', 'danger', 'accent'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(
        <StatCard {...defaultProps} variant={variant} />
      );
      expect(screen.getByText('Total P&L')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders the icon element', () => {
    const { container } = render(<StatCard {...defaultProps} icon={TrendingUp} />);
    // lucide-react renders an SVG element
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
