import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { StreakTimeline } from '../StreakTimeline';
import type { StreakInfo } from '@/types/insights';

describe('StreakTimeline', () => {
  const winStreak: StreakInfo = {
    type: 'win',
    length: 5,
    totalPnl: 1200,
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    tradeIds: ['t1', 't2', 't3', 't4', 't5'],
  };

  const lossStreak: StreakInfo = {
    type: 'loss',
    length: 3,
    totalPnl: -600,
    startDate: '2026-04-06',
    endDate: '2026-04-08',
    tradeIds: ['t6', 't7', 't8'],
  };

  const mockStreaks: StreakInfo[] = [winStreak, lossStreak];

  it('renders "Win/Loss Streaks" heading', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={null}
      />
    );
    expect(screen.getByText('Win/Loss Streaks')).toBeInTheDocument();
  });

  it('renders best win streak value', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={null}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Best Win Streak')).toBeInTheDocument();
  });

  it('renders worst loss streak value', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={null}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Worst Loss Streak')).toBeInTheDocument();
  });

  it('shows current win streak badge', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={winStreak}
      />
    );
    expect(screen.getByText(/Current: 5 wins in a row/)).toBeInTheDocument();
  });

  it('shows current loss streak badge', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={lossStreak}
      />
    );
    expect(screen.getByText(/Current: 3 losses in a row/)).toBeInTheDocument();
  });

  it('does not show current streak badge when null', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={null}
      />
    );
    expect(screen.queryByText(/Current:/)).not.toBeInTheDocument();
  });

  it('renders nothing when streaks array is empty', () => {
    const { container } = render(
      <StreakTimeline
        streaks={[]}
        longestWinStreak={null}
        longestLossStreak={null}
        currentStreak={null}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows 0 for longest streak when null', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={null}
        longestLossStreak={null}
        currentStreak={null}
      />
    );
    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBe(2);
  });

  it('displays streak date prefix', () => {
    render(
      <StreakTimeline
        streaks={mockStreaks}
        longestWinStreak={winStreak}
        longestLossStreak={lossStreak}
        currentStreak={null}
      />
    );
    expect(screen.getByText('04-01')).toBeInTheDocument();
    expect(screen.getByText('04-06')).toBeInTheDocument();
  });
});
