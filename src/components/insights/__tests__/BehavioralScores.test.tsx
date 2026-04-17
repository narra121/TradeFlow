import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { BehavioralScores } from '../BehavioralScores';
import type { BehavioralScore } from '@/types/insights';

describe('BehavioralScores', () => {
  const mockScores: BehavioralScore[] = [
    { dimension: 'discipline', value: 75, label: 'Discipline' },
    { dimension: 'risk_management', value: 42, label: 'Risk Management' },
    { dimension: 'consistency', value: 88, label: 'Consistency' },
    { dimension: 'patience', value: 30, label: 'Patience' },
  ];

  it('renders all dimension labels', () => {
    render(<BehavioralScores scores={mockScores} />);
    expect(screen.getByText('discipline')).toBeInTheDocument();
    expect(screen.getByText('risk_management')).toBeInTheDocument();
    expect(screen.getByText('consistency')).toBeInTheDocument();
    expect(screen.getByText('patience')).toBeInTheDocument();
  });

  it('renders all percentage values', () => {
    render(<BehavioralScores scores={mockScores} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders "Behavioral Scores" heading', () => {
    render(<BehavioralScores scores={mockScores} />);
    expect(screen.getByText('Behavioral Scores')).toBeInTheDocument();
  });

  it('returns null for empty scores array', () => {
    const { container } = render(<BehavioralScores scores={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for undefined scores', () => {
    const { container } = render(
      <BehavioralScores scores={undefined as unknown as BehavioralScore[]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders correct number of score bars', () => {
    const { container } = render(<BehavioralScores scores={mockScores} />);
    // Each score bar uses a div with class "rounded-full bg-secondary/50" as the track
    const bars = container.querySelectorAll('.bg-secondary\\/50');
    expect(bars).toHaveLength(4);
  });

  it('renders label text below each bar', () => {
    render(<BehavioralScores scores={mockScores} />);
    expect(screen.getByText('Discipline')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Consistency')).toBeInTheDocument();
    expect(screen.getByText('Patience')).toBeInTheDocument();
  });

  it('applies success color to high-value scores', () => {
    render(<BehavioralScores scores={mockScores} />);
    const highScore = screen.getByText('75%');
    expect(highScore).toHaveClass('text-success');
    const veryHighScore = screen.getByText('88%');
    expect(veryHighScore).toHaveClass('text-success');
  });

  it('applies yellow color to mid-range scores', () => {
    render(<BehavioralScores scores={mockScores} />);
    const midScore = screen.getByText('42%');
    expect(midScore).toHaveClass('text-yellow-400');
  });

  it('applies destructive color to low scores', () => {
    render(<BehavioralScores scores={mockScores} />);
    const lowScore = screen.getByText('30%');
    expect(lowScore).toHaveClass('text-destructive');
  });
});
