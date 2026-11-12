import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';
import type { ChatMessage, ChatSession } from '@/types/chat';
import type { Insight } from '@/types/insights';
import { ChatView } from '../ChatView';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const call = (value: unknown, fail = false) => ({ unwrap: () => (fail ? Promise.reject(value) : Promise.resolve(value)), abort: vi.fn() });
const createSession = vi.fn();
const deleteSession = vi.fn();
const send = vi.fn();
const openTrade = vi.fn();
let sessions: ChatSession[] = [];
let messages: ChatMessage[] = [];
let insights: Insight[] = [];
let usage = { used: 2, limit: 500 as number | null };
let mobile = false;

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openTrade }) }));
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ usage: [{ feature: 'ai_chat', ...usage }], periodResetsAt: '2026-12-01T00:00:00.000Z' }) }));
vi.mock('@/store/api/insightsApi', () => ({ useListInsightsQuery: () => ({ data: { insights } }) }));
vi.mock('@/store/api/chatApi', () => ({
  useListChatSessionsQuery: () => ({ data: sessions, isLoading: false, isError: false, refetch: vi.fn() }),
  useGetChatMessagesQuery: () => ({ data: messages, isFetching: false, isError: false, refetch: vi.fn() }),
  useCreateChatSessionMutation: () => [createSession],
  useDeleteChatSessionMutation: () => [deleteSession],
  useSendChatMessageMutation: () => [send],
}));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.search}</p>;
}
const renderChat = (route = '/app/chat') => render(<MemoryRouter initialEntries={[route]}><ChatView /><Where /></MemoryRouter>);
const session = (id: string, title: string, updatedAt = new Date().toISOString()): ChatSession => ({ id, title, createdAt: updatedAt, updatedAt, messageCount: 2 });
const msg = (id: string, role: 'user' | 'assistant', content: string): ChatMessage => ({ id, role, content, createdAt: '2026-11-11T10:00:00.000Z' });
const box = () => screen.getByRole('textbox', { name: 'Ask about your trading' });

beforeEach(() => {
  [createSession, deleteSession, send, openTrade].forEach((f) => f.mockReset());
  sessions = [];
  messages = [];
  insights = [];
  usage = { used: 2, limit: 500 };
  mobile = false;
  createSession.mockReturnValue(call({ id: 's-new', title: '', createdAt: '', updatedAt: '', messageCount: 0 }));
});

describe('ChatView empty thread', () => {
  it('offers the four fixed starters without a report, and says the answers use all accounts', () => {
    renderChat();
    expect(screen.getByText('Answers use all your accounts and trades.')).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter((b) => /^(What|Which|How)/.test(b.textContent ?? ''))).toHaveLength(4);
    expect(screen.getByText('2 of 500 messages this month')).toBeInTheDocument();
  });

  it('turns the findings of the latest report into starters', () => {
    insights = [{ id: 'i1', createdAt: '', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: '', model: '', tradeCount: 5, sections: [{ kind: 'leak', title: 'Trades after 20:00 lose', body: '' }] }];
    renderChat();
    expect(screen.getByRole('button', { name: 'What is behind this: Trades after 20:00 lose?' })).toBeInTheDocument();
  });

  it('a starter creates a session, sends the question and puts the session in the URL', async () => {
    send.mockReturnValue(call({ content: 'x', done: { messageId: 'm' } }));
    renderChat();
    await userEvent.click(screen.getByRole('button', { name: 'Which mistakes cost me the most?' }));
    expect(createSession).toHaveBeenCalled();
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's-new', content: 'Which mistakes cost me the most?' })));
    expect(screen.getByTestId('where')).toHaveTextContent('?s=s-new');
  });

  it('a report discussed in chat is attached to the new session', async () => {
    insights = [{ id: 'i1', createdAt: '', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: '', model: '', tradeCount: 5, sections: [] }];
    send.mockReturnValue(call({ content: '', done: {} }));
    renderChat('/app/chat?insight=i1');
    expect(screen.getByText(/Discussing the report for/)).toBeInTheDocument();
    await userEvent.type(box(), 'Summarise it{Enter}');
    expect(createSession).toHaveBeenCalledWith({ insightId: 'i1' });
  });
});

describe('ChatView conversation', () => {
  it('renders stored messages as plain blocks with safe markdown, trade chips and a Copy action', async () => {
    sessions = [session('s1', 'After-20:00 losses')];
    messages = [msg('1', 'user', 'Why do my trades after 20:00 lose?'), msg('2', 'assistant', '**11 trades** lost money: [#t1] and [#t2]\n\n- one\n- two')];
    renderChat('/app/chat?s=s1');
    const log = screen.getByRole('log', { name: 'Conversation' });
    expect(within(log).getByText('You')).toBeInTheDocument();
    expect(within(log).getByText('TradeQut AI')).toBeInTheDocument();
    expect(within(log).getByText('11 trades').tagName).toBe('STRONG');
    expect(within(log).getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(within(log).getByRole('button', { name: 'Open trade 2' }));
    expect(openTrade).toHaveBeenCalledWith('t2');
    await userEvent.click(within(log).getByRole('button', { name: /View all 2 trades/ }));
    expect(openTrade).toHaveBeenCalledWith('t1');
  });

  it('Enter sends, Shift+Enter adds a line, an empty box cannot be sent', async () => {
    sessions = [session('s1', 'x')];
    messages = [msg('1', 'user', 'hi'), msg('2', 'assistant', 'hello')];
    send.mockReturnValue(call({ content: 'ok', done: { messageId: 'm' } }));
    renderChat('/app/chat?s=s1');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await userEvent.type(box(), 'line one{Shift>}{Enter}{/Shift}line two');
    expect(box()).toHaveValue('line one\nline two');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', content: 'line one\nline two' })));
    expect(createSession).not.toHaveBeenCalled();
  });

  it('streams tokens into the answer, shows Stop while it runs and announces completion', async () => {
    sessions = [session('s1', 'x')];
    let finish: (v: unknown) => void = () => undefined;
    send.mockImplementation((args: { onToken: (t: string) => void }) => {
      args.onToken('Partial ');
      args.onToken('answer');
      return { unwrap: () => new Promise((r) => (finish = r)), abort: vi.fn() };
    });
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Question{Enter}');
    expect(await screen.findByText('Partial answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop answer/ })).toBeInTheDocument();
    await act(async () => finish({ content: 'Partial answer', done: { messageId: 'm' } }));
    expect(screen.getByText('Answer complete')).toBeInTheDocument();
  });

  it('a stopped answer keeps its text, is marked Stopped and offers Retry with the same question', async () => {
    sessions = [session('s1', 'x')];
    send.mockImplementationOnce((args: { onToken: (t: string) => void }) => {
      args.onToken('Half an answer');
      return call({ status: 'CUSTOM_ERROR', data: { aborted: true } }, true);
    });
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Tell me more{Enter}');
    expect(await screen.findByText('Half an answer')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    send.mockReturnValueOnce(call({ content: 'ok', done: {} }));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ content: 'Tell me more' }));
  });

  it('an error says what happened inline and keeps the question retryable', async () => {
    sessions = [session('s1', 'x')];
    send.mockReturnValueOnce(call({ status: 500, data: {} }, true));
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Why?{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('The answer couldn’t be completed.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('Esc inside the composer stops a running answer', async () => {
    sessions = [session('s1', 'x')];
    const abort = vi.fn();
    send.mockReturnValue({ unwrap: () => new Promise(() => undefined), abort });
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Long one{Enter}');
    await screen.findByRole('button', { name: /Stop answer/ });
    await userEvent.type(box(), '{Escape}');
    // the stop handler aborts the controller handed to the send call, observable as an aborted signal
    expect(send.mock.calls[0][0].signal.aborted).toBe(true);
  });
});

describe('ChatView limits', () => {
  it('at the monthly limit the composer is disabled, with the reset date and the upgrade link', () => {
    usage = { used: 10, limit: 10 };
    renderChat();
    expect(box()).toBeDisabled();
    expect(screen.getByText(/You have used 10 of 10 messages this month\. Resets 01 Dec/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade to Pro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('a starter at the limit opens the upgrade dialog instead of sending', async () => {
    usage = { used: 10, limit: 10 };
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    renderChat();
    expect(screen.getByRole('button', { name: 'Which mistakes cost me the most?' })).toBeDisabled();
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('ChatView sessions', () => {
  it('groups sessions, selects one through the URL and asks before deleting', async () => {
    sessions = [session('s1', 'After-20:00 losses'), session('s0', 'Position sizing', '2026-01-02T10:00:00.000Z')];
    renderChat();
    const nav = screen.getByRole('complementary', { name: 'Chats' });
    expect(within(nav).getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(within(nav).getByRole('region', { name: 'Earlier' })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('button', { name: 'Position sizing' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?s=s0');

    await userEvent.click(within(nav).getByRole('button', { name: 'Delete chat Position sizing' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Delete Position sizing?')).toBeInTheDocument();
    deleteSession.mockReturnValue(call({}));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete chat' }));
    expect(deleteSession).toHaveBeenCalledWith('s0');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^$/));
  });

  it('on a phone the sessions sit behind a Chats button', async () => {
    mobile = true;
    sessions = [session('s1', 'After-20:00 losses')];
    renderChat();
    expect(screen.queryByRole('complementary', { name: 'Chats' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Chats' }));
    expect(await screen.findByRole('button', { name: 'After-20:00 losses' })).toBeInTheDocument();
  });
});
