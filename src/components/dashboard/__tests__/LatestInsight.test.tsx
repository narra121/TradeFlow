import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const summary = 'You lost 4 of 5 trades taken within 15 minutes of a loss; the rest of the week was flat to slightly positive.';
vi.mock('@/store/api/insightsApi', () => ({ useListInsightsQuery: () => ({ data: { insights: [{ summary }] }, isLoading: false, isError: false }) }));

import { LatestInsight } from '../LatestInsight';

describe('LatestInsight', () => {
  it('wraps the finding to two lines and keeps the whole sentence in the title, not cut to one line', () => {
    render(<MemoryRouter><LatestInsight /></MemoryRouter>);
    const line = screen.getByTitle(summary);
    expect(line).toHaveClass('line-clamp-2');
    expect(line).not.toHaveClass('truncate');
  });
});
