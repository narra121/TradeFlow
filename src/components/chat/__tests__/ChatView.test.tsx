import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PLAN_SIGNAL_EVENT } from '@/lib/planErrors';
import type { ChatMessage, ChatSession, QueryResult } from '@/types/chat';
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
let sessionsFailure: unknown;
let messagesFailure: unknown;

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/hooks/useTradeParam', () => ({ useTradeParam: () => ({ openTrade }) }));
let readOnly = false;
vi.mock('@/hooks/useEntitlements', () => ({ useEntitlements: () => ({ usage: readOnly ? [] : [{ feature: 'ai_chat', ...usage }], readOnly, periodResetsAt: '2026-12-01T00:00:00.000Z' }) }));
vi.mock('@/store/api/insightsApi', () => ({ useGetInsightQuery: (id: string, o?: { skip?: boolean }) => ({ data: o?.skip ? undefined : insights.find((i) => i.id === id) }) }));
type Acc = { id: string; name: string; currency: string; status: string; balance: number };
let accounts: Acc[] = [];
let selectedAccountId: string | null = null;
const setSelectedAccountId = vi.fn();
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts, selectedAccountId, selectedAccount: accounts.find((a) => a.id === selectedAccountId) ?? null, setSelectedAccountId }),
}));
vi.mock('@/store/api/chatApi', () => ({
  useListChatSessionsQuery: () => ({ data: sessions, isLoading: false, isError: !!sessionsFailure, error: sessionsFailure, refetch: vi.fn() }),
  useGetChatMessagesQuery: () => ({ data: messages, isFetching: false, isError: !!messagesFailure, error: messagesFailure, refetch: vi.fn() }),
  useCreateChatSessionMutation: () => [createSession],
  useDeleteChatSessionMutation: () => [deleteSession],
  useSendChatMessageMutation: () => [send],
}));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.search}</p>;
}
/** The app's router moves URL changes into a transition (App.tsx), so the new `?s=` renders after the turn that was set with it. */
const renderChat = (route = '/app/chat') => render(<MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ChatView /><Where /></MemoryRouter>);
const session = (id: string, title: string, updatedAt = new Date().toISOString()): ChatSession => ({ id, title, createdAt: updatedAt, updatedAt, messageCount: 2 });
const msg = (id: string, role: 'user' | 'assistant', content: string): ChatMessage => ({ id, role, content, createdAt: '2026-11-11T10:00:00.000Z' });
const box = () => screen.getByRole('textbox', { name: 'Ask about your trading' });

beforeEach(() => {
  [createSession, deleteSession, send, openTrade, setSelectedAccountId].forEach((f) => f.mockReset());
  accounts = [{ id: 'a1', name: 'FTMO 100K', currency: 'USD', status: 'active', balance: 100000 }];
  selectedAccountId = null;
  sessions = [];
  messages = [];
  insights = [];
  usage = { used: 2, limit: 500 };
  readOnly = false;
  mobile = false;
  sessionsFailure = undefined;
  messagesFailure = undefined;
  createSession.mockReturnValue(call({ id: 's-new', title: '', createdAt: '', updatedAt: '', messageCount: 0 }));
});

describe('ChatView empty thread', () => {
  it('offers the four calculation starters and names the account and period the answers use', () => {
    renderChat();
    expect(screen.getByText('Answers use the last 90 days of')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account: All accounts' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter((b) => /^(What|Which|How)/.test(b.textContent ?? '')).map((b) => b.textContent)).toEqual([
      'Which setup has made me the most money?', 'How do I do after a losing trade?', 'Which weekday costs me the most?', 'What if I stopped after 2 losses a day?',
    ]);
    expect(screen.getByText('2 of 500 messages this month')).toBeInTheDocument();
  });

  it('a chat about a report opens with a question on its finding and answers from the report’s scope', () => {
    insights = [{ id: 'i1', createdAt: '', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: '', model: '', tradeCount: 5, sections: [{ kind: 'leak', title: 'Trades after 20:00 lose', body: '' }] }];
    renderChat('/app/chat?insight=i1');
    expect(screen.getByRole('button', { name: 'What is behind this: Trades after 20:00 lose?' })).toBeInTheDocument();
    expect(screen.getByText('Answers use the report’s period and account.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Account:/ })).toBeNull();
  });

  it('a starter creates a session, sends the question and puts the session in the URL', async () => {
    send.mockReturnValue(call({ content: 'x', done: { messageId: 'm' } }));
    renderChat();
    await userEvent.click(screen.getByRole('button', { name: 'Which weekday costs me the most?' }));
    expect(createSession).toHaveBeenCalled();
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's-new', content: 'Which weekday costs me the most?' })));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('?s=s-new'));
  });

  it('the first answer of a new chat streams on: the session id arriving in the URL does not wipe the running turn', async () => {
    let emit: (t: string) => void = () => undefined;
    send.mockImplementation((args: { onToken: (t: string) => void }) => {
      emit = args.onToken;
      args.onToken('First ');
      return { unwrap: () => new Promise(() => undefined), abort: vi.fn() };
    });
    renderChat();
    await userEvent.click(screen.getByRole('button', { name: 'Which weekday costs me the most?' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('?s=s-new'));
    act(() => emit('tokens'));
    expect(await screen.findByText('First tokens')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop answer/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Which weekday costs me the most?' })).toBeNull();
  });

  it('a second Enter or a double click while the session is being created sends nothing more', async () => {
    let created: (v: unknown) => void = () => undefined;
    createSession.mockReturnValue({ unwrap: () => new Promise((r) => (created = r)), abort: vi.fn() });
    send.mockReturnValue(call({ content: 'x', done: { messageId: 'm' } }));
    renderChat();
    await userEvent.type(box(), 'Hello{Enter}');
    await userEvent.keyboard('{Enter}{Enter}');
    expect(createSession).toHaveBeenCalledTimes(1);
    await act(async () => created({ id: 's-new', title: '', createdAt: '', updatedAt: '', messageCount: 0 }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('a double-clicked starter creates one session and sends one question', async () => {
    send.mockReturnValue(call({ content: 'x', done: { messageId: 'm' } }));
    renderChat();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Which weekday costs me the most?' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(createSession).toHaveBeenCalledTimes(1);
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
    expect(openTrade).toHaveBeenCalledWith('t2', undefined);
    await userEvent.click(within(log).getByRole('button', { name: /View all 2 trades/ }));
    expect(openTrade).toHaveBeenCalledWith('t1', { ids: ['t1', 't2'] });
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

  it('shows the API message of a failed answer, and the connection message only without a response', async () => {
    sessions = [session('s1', 'x')];
    send.mockReturnValueOnce(call({ status: 500, data: { message: 'The assistant is overloaded' } }, true));
    const { unmount } = renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Why?{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('The assistant is overloaded. Your question was not lost.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/internet connection/i);
    unmount();
    send.mockReturnValueOnce(call({ status: 'FETCH_ERROR', data: 'x' }, true));
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Why?{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Check your internet connection/);
  });

  it('shows the API message when a chat cannot be started', async () => {
    createSession.mockReturnValueOnce(call({ status: 400, data: { message: 'You have too many open chats.' } }, true));
    renderChat('/app/chat');
    await userEvent.type(box(), 'Hello{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('You have too many open chats.');
    expect(send).not.toHaveBeenCalled();
  });

  it('shows the API message when the chat list or a chat fails to load', () => {
    sessionsFailure = { status: 500, data: { message: 'Chats are being moved.' } };
    messagesFailure = { status: 404, data: { message: 'That chat no longer exists.' } };
    renderChat('/app/chat?s=s1');
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('Chats are being moved.'))).toBe(true);
    expect(alerts.some((a) => a.textContent?.includes('That chat no longer exists.'))).toBe(true);
    expect(alerts.every((a) => !/internet connection/i.test(a.textContent ?? ''))).toBe(true);
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

  it('after the trial, sending opens the upgrade dialog (TRIAL_EXPIRED) and creates or sends nothing', async () => {
    readOnly = true;
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    renderChat();
    await userEvent.type(box(), 'Hello{Enter}');
    window.removeEventListener(PLAN_SIGNAL_EVENT, seen);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ code: 'TRIAL_EXPIRED' });
    expect(createSession).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a starter at the limit opens the upgrade dialog instead of sending', async () => {
    usage = { used: 10, limit: 10 };
    const seen = vi.fn();
    window.addEventListener(PLAN_SIGNAL_EVENT, seen);
    renderChat();
    expect(screen.getByRole('button', { name: 'Which weekday costs me the most?' })).toBeDisabled();
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

describe('ChatView calculations, tables and accounts', () => {
  const stats: QueryResult = {
    columns: ['setup', 'trades', 'wins', 'winRate', 'net', 'avgR', 'avgRLow', 'avgRHigh', 'verdict', 'label'],
    rows: [['Reversal', 6, 5, 0.8333, 844.79, 1.1, null, null, 'watch', 'too-few'], ['Pullback', 13, 7, 0.5385, 287.57, 0.3, null, null, 'watch', 'too-few']],
    label: 'too-few',
    tradeIds: ['r1', 'r2', 'p1'],
  };

  it('sends the page account, shows the calculation line while it works and draws the done frame tables under the answer', async () => {
    sessions = [session('s1', 'x')];
    selectedAccountId = 'a1';
    let finish: (v: unknown) => void = () => undefined;
    send.mockImplementation((args: { onTool: (n: string) => void }) => {
      args.onTool('stats');
      return { unwrap: () => new Promise((r) => (finish = r)), abort: vi.fn() };
    });
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Which setup has made me the most money?{Enter}');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'a1' }));
    expect(await screen.findByText('Calculated: figures by group')).toBeInTheDocument();
    await act(async () => finish({ content: 'Reversal made the most (table 1).', done: { messageId: 'm', tables: [stats], currency: 'USD', tradeIds: [] } }));
    expect(screen.queryByText(/^Calculated:/)).toBeNull();
    const table = screen.getByRole('table', { name: /Table 1 · Too few trades: numbers will move a lot/ });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Setup', 'Trades', 'Win rate', 'Net P&L', 'Avg R', 'Evidence']);
    expect(within(table).getByRole('rowheader', { name: 'Reversal' }).closest('tr')).toHaveTextContent('Reversal683.3%+$844.79+1.10RToo early to tell');
    expect(screen.getByRole('region', { name: /Table 1/ })).toHaveAttribute('tabindex', '0');
    await userEvent.click(screen.getByRole('button', { name: 'View 3 trades →' }));
    expect(openTrade).toHaveBeenCalledWith('r1', { ids: ['r1', 'r2', 'p1'] });
  });

  it('stored answers keep their tables; a trades table links each row to its trade', async () => {
    sessions = [session('s1', 'x')];
    messages = [msg('1', 'user', 'Worst trades?'), { ...msg('2', 'assistant', 'Your two worst trades:'), currency: 'INR', tables: [{ columns: ['date', 'symbol', 'direction', 'setup', 'net', 'r'], rows: [['2026-11-03', 'NIFTY', 'Long', 'Breakout', -994.42, -1.2]], label: 'too-few', tradeIds: ['t7'] }] }];
    renderChat('/app/chat?s=s1');
    await userEvent.click(screen.getByRole('button', { name: '03 Nov 2026' }));
    expect(openTrade).toHaveBeenCalledWith('t7', { ids: ['t7'] });
    expect(screen.getByRole('table')).toHaveTextContent('−₹994.42');
  });

  it('all accounts in two currencies: the answer asks for an account (nothing charged) and resends the same question with it', async () => {
    sessions = [session('s1', 'x')];
    accounts = [...accounts, { id: 'a2', name: 'Zerodha F&O', currency: 'INR', status: 'active', balance: 500000 }];
    send.mockReturnValueOnce(call({ status: 422, data: { errorCode: 'MIXED_CURRENCY', message: 'These trades are in INR and USD.', error: { currencies: ['INR', 'USD'] } } }, true));
    renderChat('/app/chat?s=s1');
    expect(screen.getByText(/Your accounts use USD and INR, so an answer needs one account/)).toBeInTheDocument();
    await userEvent.type(box(), 'Which weekday costs me the most?{Enter}');
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ accountId: null }));
    const group = await screen.findByRole('group', { name: /These trades are in INR and USD.*This question was not charged/ });
    expect(screen.queryByRole('alert')).toBeNull();
    send.mockReturnValueOnce(call({ content: 'Monday', done: { messageId: 'm', tables: [] } }));
    await userEvent.click(within(group).getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Zerodha F&O.*INR/ }));
    expect(setSelectedAccountId).toHaveBeenCalledWith('a2');
    await waitFor(() => expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ content: 'Which weekday costs me the most?', accountId: 'a2' })));
  });

  it('a chat about a report sends no account until one is chosen', async () => {
    insights = [{ id: 'i1', createdAt: '', period: { from: '2026-10-01', to: '2026-10-31' }, accountId: null, summary: '', model: '', tradeCount: 5, sections: [] }];
    sessions = [{ ...session('s1', 'x'), insightId: 'i1' }];
    selectedAccountId = 'a1';
    send.mockReturnValue(call({ content: 'ok', done: { messageId: 'm', tables: [] } }));
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Summarise it{Enter}');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ accountId: undefined }));
  });

  it('opening another chat stops the running answer, and its late end does not touch the new chat', async () => {
    sessions = [session('s1', 'First'), session('s2', 'Second')];
    let fail: (e: unknown) => void = () => undefined;
    send.mockImplementationOnce((args: { onToken: (t: string) => void }) => {
      args.onToken('Half');
      return { unwrap: () => new Promise((_r, j) => (fail = j)), abort: vi.fn() };
    });
    renderChat('/app/chat?s=s1');
    await userEvent.type(box(), 'Long one{Enter}');
    expect(await screen.findByText('Half')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('complementary', { name: 'Chats' })).getByRole('button', { name: 'Second' }));
    expect(send.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => fail({ status: 'CUSTOM_ERROR', data: { aborted: true } }));
    expect(screen.queryByText('Half')).toBeNull();
    expect(screen.queryByText('Stopped')).toBeNull();
  });
});