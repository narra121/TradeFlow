import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { InsightsChat } from '../InsightsChat';
import type { ChatMessage } from '@/types/insights';

const mockSend = vi.fn();
const mockAbort = vi.fn();

let mockReturn: {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  send: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

vi.mock('@/hooks/useFirebaseAI', () => ({
  useFirebaseChat: () => mockReturn,
}));

describe('InsightsChat', () => {
  const defaultProps = {
    accountId: 'acc-1',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    trades: [{ tradeId: 't1', pnl: 50 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturn = {
      messages: [],
      streaming: false,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };
  });

  it('renders "Ask AI" heading', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(
      screen.getByText(/Ask questions about your trading data/)
    ).toBeInTheDocument();
  });

  it('renders suggested questions when no messages', () => {
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

  it('calls send when send button is clicked', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question');
    await user.click(screen.getByLabelText('Send message'));
    expect(mockSend).toHaveBeenCalledWith('test question');
  });

  it('calls send when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question{Enter}');
    expect(mockSend).toHaveBeenCalledWith('test question');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask about your trades...');
    await user.type(input, 'test question{Enter}');
    expect(input).toHaveValue('');
  });

  it('calls send when clicking a suggested question', async () => {
    const user = userEvent.setup();
    render(<InsightsChat {...defaultProps} />);
    await user.click(screen.getByText('What are my biggest mistakes?'));
    expect(mockSend).toHaveBeenCalledWith('What are my biggest mistakes?');
  });

  it('renders empty state prompt when no messages', () => {
    render(<InsightsChat {...defaultProps} />);
    expect(
      screen.getByText('Ask me anything about your trading performance')
    ).toBeInTheDocument();
  });

  it('renders user and model messages', () => {
    mockReturn = {
      messages: [
        { role: 'user', text: 'What are my patterns?' },
        { role: 'model', text: 'Based on your trades, I see...' },
      ],
      streaming: false,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('What are my patterns?')).toBeInTheDocument();
    expect(screen.getByText('Based on your trades, I see...')).toBeInTheDocument();
  });

  it('hides suggested questions when messages exist', () => {
    mockReturn = {
      messages: [{ role: 'user', text: 'test' }],
      streaming: false,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.queryByText('What are my biggest mistakes?')).not.toBeInTheDocument();
  });

  it('shows stop button when streaming', () => {
    mockReturn = {
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByLabelText('Stop generating')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument();
  });

  it('calls abort when stop button is clicked', async () => {
    const user = userEvent.setup();
    mockReturn = {
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    await user.click(screen.getByLabelText('Stop generating'));
    expect(mockAbort).toHaveBeenCalled();
  });

  it('shows error message when error exists', () => {
    mockReturn = {
      messages: [],
      streaming: false,
      error: 'Something went wrong',
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('disables input when streaming', () => {
    mockReturn = {
      messages: [{ role: 'user', text: 'test' }],
      streaming: true,
      error: null,
      send: mockSend,
      abort: mockAbort,
    };

    render(<InsightsChat {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask about your trades...')).toBeDisabled();
  });
});
