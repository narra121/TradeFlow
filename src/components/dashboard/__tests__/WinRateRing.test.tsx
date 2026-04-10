import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WinRateRing } from '../WinRateRing';

describe('WinRateRing', () => {
  const defaultProps = {
    winRate: 65,
    wins: 13,
    losses: 7,
  };

  it('renders without crashing', () => {
    render(<WinRateRing {...defaultProps} />);
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
  });

  it('displays the heading', () => {
    render(<WinRateRing {...defaultProps} />);
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
  });

  it('displays the win rate percentage', () => {
    render(<WinRateRing {...defaultProps} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('displays the wins count', () => {
    render(<WinRateRing {...defaultProps} />);
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('Wins')).toBeInTheDocument();
  });

  it('displays the losses count', () => {
    render(<WinRateRing {...defaultProps} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
  });

  it('renders the SVG ring graphic', () => {
    const { container } = render(<WinRateRing {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Should have two circle elements (background and progress)
    const circles = svg!.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('renders with 0% win rate', () => {
    render(<WinRateRing winRate={0} wins={0} losses={10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders with 100% win rate', () => {
    render(<WinRateRing winRate={100} wins={20} losses={0} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders the gradient definition in SVG', () => {
    const { container } = render(<WinRateRing {...defaultProps} />);
    const gradient = container.querySelector('#winRateGradient');
    expect(gradient).toBeInTheDocument();
  });
});

describe('WinRateRing – extended coverage', () => {
  it('renders 0% win rate correctly with full offset on progress circle', () => {
    const { container } = render(<WinRateRing winRate={0} wins={0} losses={10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // wins
    expect(screen.getByText('10')).toBeInTheDocument(); // losses

    // The progress circle strokeDashoffset should equal circumference (no progress shown)
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    const circumference = 2 * Math.PI * 45;
    expect(progressCircle.getAttribute('stroke-dashoffset')).toBe(String(circumference));
  });

  it('renders 100% win rate with zero offset on progress circle', () => {
    const { container } = render(<WinRateRing winRate={100} wins={20} losses={0} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument(); // wins
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();

    // The progress circle strokeDashoffset should be 0 (full ring)
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute('stroke-dashoffset')).toBe('0');
  });

  it('handles 0 wins and 0 losses (no trades taken)', () => {
    render(<WinRateRing winRate={0} wins={0} losses={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    // Both wins and losses display '0' – there should be at least two '0' elements
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
  });

  it('renders with large numbers (999 wins)', () => {
    render(<WinRateRing winRate={99} wins={999} losses={10} />);
    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles NaN winRate without crashing', () => {
    // winRate.toFixed(0) on NaN returns 'NaN' string
    render(<WinRateRing winRate={NaN} wins={0} losses={0} />);
    // The component should still render the heading and layout
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('Wins')).toBeInTheDocument();
    expect(screen.getByText('Losses')).toBeInTheDocument();
  });
});
