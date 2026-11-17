import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const summary = 'You lost 4 of 5 trades taken within 15 minutes of a loss; the rest of the week was flat to slightly positive.';
// RTK while another account loads: `data` still holds the last account's insight, `currentData` is empty.
let stale = false;
vi.mock('@/store/api/insightsApi', () => ({
  useListInsightsQuery: () => (stale ? { data: { insights: [{ summary }] }, currentData: undefined, isLoading: false, isFetching: true, isError: false } : { data: { insights: [{ summary }] }, currentData: { insights: [{ summary }] }, isLoading: false, isError: false }),
}));

import { LatestInsight } from '../LatestInsight';

describe('LatestInsight', () => {
  it('wraps the finding to two lines and keeps the whole sentence in the title, not cut to one line', () => {
    render(<MemoryRouter><LatestInsight /></MemoryRouter>);
    const line = screen.getByTitle(summary);
    expect(line).toHaveClass('line-clamp-2');
    expect(line).not.toHaveClass('truncate');
  });

  it('while another account loads it draws nothing rather than the last account\'s insight', () => {
    stale = true;
    render(<MemoryRouter><LatestInsight accountId="other" /></MemoryRouter>);
    stale = false;
    expect(screen.queryByTitle(summary)).not.toBeInTheDocument();
  });
});
