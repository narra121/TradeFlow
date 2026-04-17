import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { ProfileScoreCard } from '../ProfileScoreCard';
import type { TraderProfile } from '@/types/insights';

describe('ProfileScoreCard', () => {
  const mockProfile: TraderProfile = {
    type: 'day_trader',
    typeLabel: 'Day Trader',
    aggressivenessScore: 6,
    aggressivenessLabel: 'Aggressive',
    trend: null,
    summary: 'Active day trader with moderate risk',
  };

  it('renders trader type label', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('Day Trader')).toBeInTheDocument();
  });

  it('renders aggressiveness score', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders aggressiveness label', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('Aggressive')).toBeInTheDocument();
  });

  it('renders summary text', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('Active day trader with moderate risk')).toBeInTheDocument();
  });

  it('renders "Trader Profile" heading', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('Trader Profile')).toBeInTheDocument();
  });

  it('applies green score color for low score (2)', () => {
    const lowProfile: TraderProfile = {
      ...mockProfile,
      aggressivenessScore: 2,
      aggressivenessLabel: 'Conservative',
    };
    const { container } = render(<ProfileScoreCard profile={lowProfile} />);
    const scoreEl = screen.getByText('2');
    expect(scoreEl).toHaveClass('text-success');
  });

  it('applies red score color for high score (9)', () => {
    const highProfile: TraderProfile = {
      ...mockProfile,
      aggressivenessScore: 9,
      aggressivenessLabel: 'Very Aggressive',
    };
    render(<ProfileScoreCard profile={highProfile} />);
    const scoreEl = screen.getByText('9');
    expect(scoreEl).toHaveClass('text-destructive');
  });

  it('renders trend indicator when trend is "up"', () => {
    const trendProfile: TraderProfile = {
      ...mockProfile,
      trend: 'up',
    };
    render(<ProfileScoreCard profile={trendProfile} />);
    expect(screen.getByText('Trending up')).toBeInTheDocument();
  });

  it('renders trend indicator when trend is "down"', () => {
    const trendProfile: TraderProfile = {
      ...mockProfile,
      trend: 'down',
    };
    render(<ProfileScoreCard profile={trendProfile} />);
    expect(screen.getByText('Trending down')).toBeInTheDocument();
  });

  it('renders "Stable" trend indicator for unknown trend values', () => {
    const trendProfile: TraderProfile = {
      ...mockProfile,
      trend: 'flat',
    };
    render(<ProfileScoreCard profile={trendProfile} />);
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('does not render any trend indicator when trend is null', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.queryByText('Trending up')).not.toBeInTheDocument();
    expect(screen.queryByText('Trending down')).not.toBeInTheDocument();
    expect(screen.queryByText('Stable')).not.toBeInTheDocument();
  });

  it('renders the /10 denominator', () => {
    render(<ProfileScoreCard profile={mockProfile} />);
    expect(screen.getByText('/10')).toBeInTheDocument();
  });

  it('applies blue score color for mid-range score (4)', () => {
    const midProfile: TraderProfile = {
      ...mockProfile,
      aggressivenessScore: 4,
    };
    render(<ProfileScoreCard profile={midProfile} />);
    const scoreEl = screen.getByText('4');
    expect(scoreEl).toHaveClass('text-blue-400');
  });

  it('applies yellow score color for moderately high score (7)', () => {
    const modProfile: TraderProfile = {
      ...mockProfile,
      aggressivenessScore: 7,
    };
    render(<ProfileScoreCard profile={modProfile} />);
    const scoreEl = screen.getByText('7');
    expect(scoreEl).toHaveClass('text-yellow-400');
  });
});
