import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  it('is a status when it has a label', () => {
    render(<Skeleton aria-label="Loading your profile" />);
    expect(screen.getByRole('status', { name: 'Loading your profile' })).toBeInTheDocument();
  });

  it('has no role when unlabelled', () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstElementChild).not.toHaveAttribute('role');
  });

  it('keeps a role the caller passes', () => {
    render(<Skeleton role="presentation" aria-label="x" />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
