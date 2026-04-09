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
