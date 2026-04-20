import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { InsightsChat } from '../InsightsChat';
import type { ChatMessage } from '@/types/insights';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockStartSession = vi.fn();
const mockSend = vi.fn();
const mockAbort = vi.fn();
const mockSwitchSession = vi.fn();
const mockClearError = vi.fn();

let mockChatReturn: {
  sessions: any[];
  sessionsLoading: boolean;
  activeSessionId: string | null;
  sessionId: string | null;
  sessionSwitching: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  messageCount: number;
  messageLimit: number;
  startSession: ReturnType<typeof vi.fn>;
  switchSession: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
};

vi.mock('@/hooks/useFirebaseChat', () => ({
  useFirebaseChat: () => mockChatReturn,
}));

vi.mock('@/components/insights/ChatSessionSidebar', () => ({
  ChatSessionSidebar: ({ sessions, activeSessionId, onSelectSession, onNewChat, sessionsLoading, isRateLimited }: any) => (
    <div data-testid="chat-session-sidebar" data-active-session={activeSessionId} data-loading={sessionsLoading}>
      <span data-testid="sidebar-session-count">{sessions.length}</span>
      <button data-testid="sidebar-new-chat" onClick={onNewChat}>New Chat</button>
      {sessions.map((s: any) => (
        <button key={s.id} data-testid={`sidebar-session-${s.id}`} onClick={() => onSelectSession(s.id)}>
          {s.title || s.id}
        </button>
      ))}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('InsightsChat', () => {
  const defaultProps = {
    accountId: 'acc-1',
    period: 'thisMonth',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    trades: [{ tradeId: 't1', pnl: 50 }] as any[],
    isFullscreen: false,
    onToggleFullscreen: vi.fn(),
    rateLimits: null as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatReturn = {
      sessions: [],
      sessionsLoading: false,
      activeSessionId: null,
      sessionId: null,
      sessionSwitching: false,
      messages: [],
      streaming: false,
      error: null,
      messageCount: 0,
      messageLimit: 25,
      startSession: mockStartSession,
      switchSession: mockSwitchSession,
      send: mockSend,
      abort: mockAbort,
      clearError: mockClearError,
    };
  });

  it('renders "Ask AI" heading in embedded mode', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(
      screen.getByText(/Ask questions about your trading data/),
    ).toBeInTheDocument();
  });

  it('renders suggested questions when no messages and no session', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('What are my biggest mistakes?')).toBeInTheDocument();
    expect(screen.getByText('How can I improve my win rate?')).toBeInTheDocument();
    expect(screen.getByText('What patterns do you see?')).toBeInTheDocument();
    expect(screen.getByText('Which trades should I have avoided?')).toBeInTheDocument();
  });

  it('renders input field with placeholder', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask about your trades...')).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByLabelText('Send message')).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question');
    expect(screen.getByLabelText('Send message')).toBeEnabled();
  });

  it('calls startSession on first message when no session exists', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question');
    await user.click(screen.getByLabelText('Send message'));

    expect(mockStartSession).toHaveBeenCalledWith(
      defaultProps.trades,
      defaultProps.accountId,
      defaultProps.period,
    );
  });

  it('calls send for subsequent messages when session exists', async () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'First question' }, { role: 'model', text: 'Response' }],
    };

    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'follow up');
    await user.click(screen.getByLabelText('Send message'));

    expect(mockSend).toHaveBeenCalledWith('follow up');
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('calls startSession via Enter key when no session', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question{Enter}');

    expect(mockStartSession).toHaveBeenCalledWith(
      defaultProps.trades,
      defaultProps.accountId,
      defaultProps.period,
    );
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question{Enter}');
    expect(input).toHaveValue('');
  });

  it('calls startSession when clicking a suggested question', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    await user.click(screen.getByText('What are my biggest mistakes?'));

    expect(mockStartSession).toHaveBeenCalledWith(
      defaultProps.trades,
      defaultProps.accountId,
      defaultProps.period,
    );
  });

  it('renders empty state prompt when no messages', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(
      screen.getByText('Ask me anything about your trading performance'),
    ).toBeInTheDocument();
  });

  it('renders user and model messages', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [
        { role: 'user', text: 'What are my patterns?' },
        { role: 'model', text: 'Based on your trades, I see...' },
      ],
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('What are my patterns?')).toBeInTheDocument();
    expect(screen.getByText('Based on your trades, I see...')).toBeInTheDocument();
  });

  it('hides suggested questions when messages exist', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'test' }],
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.queryByText('What are my biggest mistakes?')).not.toBeInTheDocument();
  });

  it('shows stop button when streaming', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByLabelText('Stop generating')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument();
  });

  it('calls abort when stop button is clicked', async () => {
    const user = userEvent.setup();
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
    };

    render(<InsightsChat {...defaultProps} />);
    await user.click(screen.getByLabelText('Stop generating'));
    expect(mockAbort).toHaveBeenCalled();
  });

  it('shows error message when error exists', () => {
    mockChatReturn = {
      ...mockChatReturn,
      error: 'Something went wrong',
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('disables input when streaming', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask about your trades...')).toBeDisabled();
  });

  it('shows message counter when session exists', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messageCount: 5,
      messageLimit: 25,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('5/25 messages')).toBeInTheDocument();
  });

  it('shows session limit reached message and disables input', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messageCount: 25,
      messageLimit: 25,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(
      screen.getByText(/Message limit reached for this session/),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Session message limit reached'),
    ).toBeDisabled();
  });

  it('shows rate limit info when rateLimits are available and no session', () => {
    render(
      <InsightsChat
        {...defaultProps}
        rateLimits={{
          insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
          sessions: { used: 3, limit: 6, remaining: 3, resetAt: null },
        }}
      />,
    );
    expect(screen.getByText('3/6 sessions remaining')).toBeInTheDocument();
  });

  it('disables suggested questions when rate limited', () => {
    render(
      <InsightsChat
        {...defaultProps}
        rateLimits={{
          insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
          sessions: { used: 6, limit: 6, remaining: 0, resetAt: new Date() },
        }}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /What are my biggest|How can I|What patterns|Which trades/ });
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  // --- New tests for fullscreen/embedded modes ---

  it('shows expand button in embedded mode', () => {
    render(<InsightsChat {...defaultProps} isFullscreen={false} />);
    expect(screen.getByLabelText('Expand chat')).toBeInTheDocument();
  });

  it('calls onToggleFullscreen when expand button is clicked', async () => {
    const toggleFn = vi.fn();
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} isFullscreen={false} onToggleFullscreen={toggleFn} />);
    await user.click(screen.getByLabelText('Expand chat'));
    expect(toggleFn).toHaveBeenCalled();
  });

  it('shows session sidebar in fullscreen mode', () => {
    render(<InsightsChat {...defaultProps} isFullscreen={true} />);
    expect(screen.getByTestId('chat-session-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('fullscreen-chat')).toBeInTheDocument();
  });

  it('does not show session sidebar in embedded mode', () => {
    render(<InsightsChat {...defaultProps} isFullscreen={false} />);
    expect(screen.queryByTestId('chat-session-sidebar')).not.toBeInTheDocument();
  });

  it('shows minimize button in fullscreen mode', () => {
    render(<InsightsChat {...defaultProps} isFullscreen={true} />);
    expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument();
  });

  it('calls onToggleFullscreen when minimize button is clicked', async () => {
    const toggleFn = vi.fn();
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} isFullscreen={true} onToggleFullscreen={toggleFn} />);
    await user.click(screen.getByLabelText('Exit fullscreen'));
    expect(toggleFn).toHaveBeenCalled();
  });

  it('Escape key exits fullscreen', async () => {
    const toggleFn = vi.fn();
    render(<InsightsChat {...defaultProps} isFullscreen={true} onToggleFullscreen={toggleFn} />);

    // Fire Escape keydown on document
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(toggleFn).toHaveBeenCalled();
  });

  it('Escape key does not trigger when not fullscreen', () => {
    const toggleFn = vi.fn();
    render(<InsightsChat {...defaultProps} isFullscreen={false} onToggleFullscreen={toggleFn} />);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(toggleFn).not.toHaveBeenCalled();
  });

  it('shows loading skeleton during sessionSwitching', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      sessionSwitching: true,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByTestId('session-switching-skeleton')).toBeInTheDocument();
  });

  it('shows "AI Chat" title in fullscreen mode', () => {
    render(<InsightsChat {...defaultProps} isFullscreen={true} />);
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
  });

  it('renders sidebar with sessions in fullscreen mode', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessions: [
        { id: 's1', title: 'Session 1', accountId: 'acc-1', period: 'thisMonth', messageCount: 5, createdAt: { toMillis: () => 1000 }, expiresAt: { toMillis: () => 2000 }, status: 'active' },
        { id: 's2', title: 'Session 2', accountId: 'acc-1', period: 'thisMonth', messageCount: 3, createdAt: { toMillis: () => 900 }, expiresAt: { toMillis: () => 2000 }, status: 'active' },
      ],
    };

    render(<InsightsChat {...defaultProps} isFullscreen={true} />);
    expect(screen.getByTestId('sidebar-session-count')).toHaveTextContent('2');
  });

  it('calls switchSession when selecting a session in sidebar', async () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessions: [
        { id: 's1', title: 'Session 1', accountId: 'acc-1', period: 'thisMonth', messageCount: 5, createdAt: { toMillis: () => 1000 }, expiresAt: { toMillis: () => 2000 }, status: 'active' },
      ],
    };

    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} isFullscreen={true} />);
    await user.click(screen.getByTestId('sidebar-session-s1'));
    expect(mockSwitchSession).toHaveBeenCalledWith('s1');
  });

  it('shows empty state and suggested questions after New Chat in fullscreen', async () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
      activeSessionId: 'session-42',
      messages: [{ role: 'user', text: 'test' }, { role: 'model', text: 'response' }],
    };

    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} isFullscreen={true} />);

    // Click new chat in sidebar
    await user.click(screen.getByTestId('sidebar-new-chat'));

    // Should show empty state and suggested questions
    expect(screen.getByText('Ask me anything about your trading performance')).toBeInTheDocument();
    expect(screen.getByText('What are my biggest mistakes?')).toBeInTheDocument();
  });
});
