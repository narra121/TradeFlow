import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ status: 'trialing', plan: 'trial', trialDaysLeft: 1, trialEndsAt: '2026-11-15T10:00:00.000Z', readOnly: false }) }));
vi.mock('@/hooks/useOnline', () => ({ useOnline: () => true }));

import { NoticeSlot } from '../NoticeSlot';

describe('NoticeSlot', () => {
  it('lets the sentence wrap on phones and cuts it to one line only from md up', () => {
    render(
      <MemoryRouter>
        <NoticeSlot />
      </MemoryRouter>,
    );
    const text = screen.getByText(/Free trial: 1 day left/);
    expect(text).toHaveClass('md:truncate');
    expect(text).not.toHaveClass('truncate');
    expect(screen.getByRole('status')).toHaveClass('min-h-9', 'md:h-9');
    expect(screen.getByRole('status')).not.toHaveClass('h-9');
  });
});
