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

let mockChatReturn: {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  sessionId: string | null;
  messageCount: number;
  messageLimit: number;
  startSession: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

vi.mock('@/hooks/useFirebaseChat', () => ({
  useFirebaseChat: () => mockChatReturn,
}));

let mockRateLimitsReturn: any = null;

vi.mock('@/hooks/useRateLimits', () => ({
  useRateLimits: () => mockRateLimitsReturn,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatReturn = {
      messages: [],
      streaming: false,
      error: null,
      sessionId: null,
      messageCount: 0,
      messageLimit: 25,
      startSession: mockStartSession,
      send: mockSend,
      abort: mockAbort,
    };
    mockRateLimitsReturn = null;
  });

  it('renders "Ask AI" heading', () => {
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
      messages: [{ role: 'user', text: 'test' }],
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.queryByText('What are my biggest mistakes?')).not.toBeInTheDocument();
  });

  it('shows stop button when streaming', () => {
    mockChatReturn = {
      ...mockChatReturn,
      sessionId: 'session-42',
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
    mockRateLimitsReturn = {
      insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
      sessions: { used: 3, limit: 6, remaining: 3, resetAt: null },
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('3/6 sessions remaining')).toBeInTheDocument();
  });

  it('disables suggested questions when rate limited', () => {
    mockRateLimitsReturn = {
      insights: { used: 0, limit: 6, remaining: 6, resetAt: null },
      sessions: { used: 6, limit: 6, remaining: 0, resetAt: new Date() },
    };

    render(<InsightsChat {...defaultProps} />);
    const buttons = screen.getAllByRole('button', { name: /What are my biggest|How can I|What patterns|Which trades/ });
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
