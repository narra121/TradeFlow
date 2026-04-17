import { describe, it, expect } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { InsightsSummary } from '../InsightsSummary';

describe('InsightsSummary', () => {
  it('renders the summary text', () => {
    render(<InsightsSummary summary="You have been trading well this week with improved discipline." />);
    expect(
      screen.getByText('You have been trading well this week with improved discipline.')
    ).toBeInTheDocument();
  });

  it('renders with long text without truncation', () => {
    const longSummary =
      'Your trading performance over the past 30 days shows a marked improvement in risk management. ' +
      'Win rate has increased from 48% to 63%, and your average risk-reward ratio improved from 1.2:1 to 2.1:1. ' +
      'However, there are still signs of revenge trading after consecutive losses, particularly on volatile pairs. ' +
      'Consider implementing a mandatory cooldown period after two consecutive losses to protect your capital.';
    render(<InsightsSummary summary={longSummary} />);
    expect(screen.getByText(longSummary)).toBeInTheDocument();
  });

  it('renders "Overall Assessment" heading', () => {
    render(<InsightsSummary summary="Good performance overall." />);
    expect(screen.getByText('Overall Assessment')).toBeInTheDocument();
  });

  it('renders the icon area with an SVG', () => {
    const { container } = render(<InsightsSummary summary="Test summary" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('returns null when summary is an empty string', () => {
    const { container } = render(<InsightsSummary summary="" />);
    expect(container.innerHTML).toBe('');
  });
});
