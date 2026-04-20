import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatSessionSidebar, type ChatSessionSidebarProps } from '../ChatSessionSidebar';
import type { FirestoreChatSessionSummary } from '@/lib/firebase/firestore';

// ---------------------------------------------------------------------------
// Polyfills for jsdom (ScrollArea uses ResizeObserver internally)
// ---------------------------------------------------------------------------
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(
  overrides: Partial<FirestoreChatSessionSummary> = {},
): FirestoreChatSessionSummary {
  return {
    id: 'sess-1',
    accountId: 'acc-1',
    period: 'thisMonth',
    messageCount: 5,
    createdAt: { toMillis: () => Date.now() - 2 * 60 * 60 * 1000 }, // 2 hours ago
    expiresAt: { toMillis: () => Date.now() + 22 * 60 * 60 * 1000 },
    status: 'active',
    ...overrides,
  };
}

const defaultProps: ChatSessionSidebarProps = {
  sessions: [],
  activeSessionId: null,
  onSelectSession: vi.fn(),
  onNewChat: vi.fn(),
  sessionsLoading: false,
  isRateLimited: false,
};

function renderSidebar(props: Partial<ChatSessionSidebarProps> = {}) {
  return render(<ChatSessionSidebar {...defaultProps} {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ChatSessionSidebar', () => {
  it('renders session list with titles and dates', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: 'Morning analysis' }),
      makeSession({ id: 'sess-2', title: 'Afternoon review' }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByText('Morning analysis')).toBeInTheDocument();
    expect(screen.getByText('Afternoon review')).toBeInTheDocument();
    // Relative time text should appear (e.g., "about 2 hours ago")
    const timeTexts = screen.getAllByText(/ago/);
    expect(timeTexts.length).toBe(2);
  });

  it('highlights active session', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: 'Session A' }),
      makeSession({ id: 'sess-2', title: 'Session B' }),
    ];

    renderSidebar({ sessions, activeSessionId: 'sess-2' });

    const buttons = screen.getAllByRole('button', { name: /Session/ });
    const sessionB = buttons.find((b) => b.textContent?.includes('Session B'));
    // Active session has "bg-accent " (without the /50 hover variant)
    expect(sessionB?.className).toMatch(/\bbg-accent\b/);

    const sessionA = buttons.find((b) => b.textContent?.includes('Session A'));
    // Inactive session should only have hover:bg-accent/50, not standalone bg-accent
    expect(sessionA?.className).not.toMatch(/\bbg-accent\s/);
    expect(sessionA?.className).toContain('hover:bg-accent/50');
  });

  it('calls onSelectSession when clicking a session', async () => {
    const user = userEvent.setup();
    const onSelectSession = vi.fn();
    const sessions = [makeSession({ id: 'sess-42', title: 'My session' })];

    renderSidebar({ sessions, onSelectSession });

    await user.click(screen.getByText('My session'));
    expect(onSelectSession).toHaveBeenCalledWith('sess-42');
  });

  it('calls onNewChat when clicking New Chat button', async () => {
    const user = userEvent.setup();
    const onNewChat = vi.fn();

    renderSidebar({ onNewChat });

    await user.click(screen.getByText('New Chat'));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no sessions', () => {
    renderSidebar({ sessions: [] });

    expect(
      screen.getByText('No chat sessions yet. Start a new conversation!'),
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when sessionsLoading is true', () => {
    renderSidebar({ sessionsLoading: true });

    expect(screen.getByTestId('sessions-loading')).toBeInTheDocument();
    // Should not show empty state while loading
    expect(
      screen.queryByText('No chat sessions yet. Start a new conversation!'),
    ).not.toBeInTheDocument();
  });

  it('disables New Chat when isRateLimited', () => {
    renderSidebar({ isRateLimited: true });

    const newChatButton = screen.getByRole('button', { name: /New Chat/ });
    expect(newChatButton).toBeDisabled();
  });

  it('shows expired badge for expired sessions', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: 'Old session', status: 'expired' }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByText('Expired')).toBeInTheDocument();
    // Title should have italic styling via the italic class
    const titleElement = screen.getByText('Old session');
    expect(titleElement.className).toContain('italic');
  });

  it('shows fallback period label when no title', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: undefined, period: 'last2Months' }),
      makeSession({ id: 'sess-2', title: undefined, period: 'last6Months' }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByText('Last 2 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months')).toBeInTheDocument();
  });

  it('shows message count badge', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: 'Test', messageCount: 12 }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows spinner for generating sessions', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: 'Generating...', status: 'generating' }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByLabelText('Generating')).toBeInTheDocument();
  });

  it('renders header with title', () => {
    renderSidebar();

    expect(screen.getByText('Chat Sessions')).toBeInTheDocument();
  });

  it('uses raw period string as fallback for unknown period', () => {
    const sessions = [
      makeSession({ id: 'sess-1', title: undefined, period: 'custom-range' }),
    ];

    renderSidebar({ sessions });

    expect(screen.getByText('custom-range')).toBeInTheDocument();
  });

  it('enables New Chat button when not rate limited', () => {
    renderSidebar({ isRateLimited: false });

    const newChatButton = screen.getByRole('button', { name: /New Chat/ });
    expect(newChatButton).toBeEnabled();
  });
});
