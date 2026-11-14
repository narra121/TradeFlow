import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/components/help', () => ({
  ContactSupportDialog: () => null,
  FeedbackDialog: () => null,
  WhatsNewPopover: ({ children }: { children: ReactNode }) => <>{children}</>,
  appVersion: () => 'test',
  useWhatsNew: () => ({ unseen: true, markSeen: vi.fn() }),
}));

import { HelpMenu } from '../HelpMenu';

describe('HelpMenu', () => {
  it('names the unseen-news dot as an image, so its label is allowed (axe aria-prohibited-attr)', async () => {
    render(
      <MemoryRouter initialEntries={['/app/tradelog']}>
        <HelpMenu onShowShortcuts={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Help, new updates' }));
    const item = await screen.findByRole('menuitem', { name: /What.s new/ });
    expect(within(item).getByRole('img', { name: 'new' })).toBeInTheDocument();
  });
});
