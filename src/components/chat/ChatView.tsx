import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { AccountPicker } from '@/components/account/AccountPicker';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AccountSwitcher, currenciesOf } from '@/components/shell/AccountSwitcher';
import { AiNote } from '@/components/shell/AiNote';
import { usePageChrome } from '@/components/shell/chrome';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useCreateChatSessionMutation, useDeleteChatSessionMutation, useGetChatMessagesQuery, useListChatSessionsQuery, useSendChatMessageMutation } from '@/store/api/chatApi';
import { useGetInsightQuery } from '@/store/api/insightsApi';
import { readApiError } from '@/lib/apiError';
import { starterQuestions, toolsLine } from '@/lib/ai/chatFormat';
import { chatTableText, chatTableView } from '@/lib/ai/chatTable';
import { isMixedCurrency } from '@/lib/ai/insightFormat';
import { citedTradeIds, renderAnswer } from '@/lib/ai/markdown';
import { formatDateShort } from '@/lib/format';
import { emitPlanSignal } from '@/lib/planErrors';
import { openTrialExpired } from '@/components/billing/readOnly';
import type { ChatMessage, QueryResult } from '@/types/chat';
import { ChatSessions } from './ChatSessions';
import { ChatTables } from './ChatTables';

interface Turn {
  user: string;
  text: string;
  /** account: the trades asked about span currencies (422 MIXED_CURRENCY, nothing charged); one account must be chosen */
  status: 'streaming' | 'done' | 'stopped' | 'error' | 'account';
  /** stored messages when the question was sent, to tell when the refetch has caught up */
  baseCount: number;
  refused?: boolean;
  /** tools run so far, from `event: tool` frames */
  tools: string[];
  tables?: QueryResult[];
  currency?: string | null;
  currencies?: string[];
}

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  onTrade: (id: string, ids?: string[]) => void;
  actions?: React.ReactNode;
  note?: string;
  pending?: boolean;
  /** the quiet line of calculations while the answer is being worked out */
  working?: string;
  tables?: QueryResult[];
  currency?: string | null;
}

function Message({ role, content, onTrade, actions, note, pending, working, tables, currency }: MessageProps) {
  const cited = role === 'assistant' ? citedTradeIds(content) : [];
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-foreground-soft">{role === 'user' ? 'You' : 'TradeQut AI'}</p>
      {role === 'user' ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      ) : (
        <>
          {working && <p className="text-xs text-muted-foreground">{working}</p>}
          <div className="space-y-2 text-sm leading-relaxed">{content ? renderAnswer(content, { onTrade }) : pending && !working ? <span className="text-muted-foreground">Thinking…</span> : null}</div>
          {tables && tables.length > 0 && <ChatTables tables={tables} currency={currency} onTrade={onTrade} />}
        </>
      )}
      {cited.length > 1 && (
        <button type="button" onClick={() => onTrade(cited[0], cited)} className="inline-flex h-6 items-center text-xs text-primary underline-offset-2 hover:underline">
          View all {cited.length} trades →
        </button>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {actions && <div className="flex items-center gap-3 text-xs">{actions}</div>}
    </div>
  );
}

/** The answer with its tables, as plain text for Copy. */
const answerText = (text: string, tables: QueryResult[] | undefined, currency: string | null | undefined) =>
  [text, ...(tables ?? []).map((t, i) => chatTableText(chatTableView(t, currency), i + 1))].join('\n\n');

export function ChatView() {
  usePageChrome({
    tabs: [
      { id: 'reports', label: 'Reports', to: '/app/insights', active: false },
      { id: 'chat', label: 'Chat', to: '/app/chat', active: true },
    ],
  });
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const trade = useTradeParam();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts();
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('s');
  const insightId = params.get('insight');
  const ref = params.get('ref');
  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, error: sessionsErrorDetail, refetch: refetchSessions } = useListChatSessionsQuery();
  const { currentData: sessionMessages, isFetching: messagesFetching, isError: messagesError, error: messagesErrorDetail, refetch: refetchMessages } = useGetChatMessagesQuery(sessionId ?? '', { skip: !sessionId });
  // `data` would keep the previous chat's messages (after New chat, and while a new chat's first answer streams), and
  // the running turn is cleared once the stored messages look caught up: only this chat's own messages count.
  const messages = useMemo(() => (sessionId ? sessionMessages ?? [] : []), [sessionId, sessionMessages]);
  const linkedId = insightId ?? sessions.find((s) => s.id === sessionId)?.insightId ?? null;
  const { data: linkedInsight } = useGetInsightQuery(linkedId ?? '', { skip: !linkedId });
  const [createSession] = useCreateChatSessionMutation();
  const [deleteSession] = useDeleteChatSessionMutation();
  const [send] = useSendChatMessageMutation();
  const [draft, setDraft] = useState(ref ? `Tell me about this trade: [#${ref}]` : '');
  const [turn, setTurn] = useState<Turn | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  // A report's chat answers from the report's own account; one chosen after MIXED_CURRENCY is kept for this chat.
  const [sessionAccount, setSessionAccount] = useState<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  // Bumped by every new turn and by a change of chat: a late reply of an older turn must not touch the current one.
  const turnSeq = useRef(0);
  const sending = useRef(false);
  const createdSession = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const row = ent.usage.find((u) => u.feature === 'ai_chat');
  const atLimit = !!row && row.limit !== null && row.used >= row.limit;
  const starters = useMemo(() => starterQuestions(linkedInsight), [linkedInsight]);
  const activeAccounts = accounts.filter((a) => a.status !== 'inactive');
  const mixed = !linkedId && isMixedCurrency(accounts, selectedAccountId);

  // The refetch after an answer replaces the local turn once the stored messages caught up.
  useEffect(() => {
    if (!turn) return;
    if (turn.status === 'done' && messages.length >= turn.baseCount + 2) setTurn(null);
  }, [messages.length, turn]);

  useEffect(() => {
    // The session this view just created arrives in the URL after its first turn started: keep that turn.
    if (sessionId && sessionId === createdSession.current) {
      createdSession.current = null;
      return;
    }
    turnSeq.current += 1;
    abort.current?.abort();
    setTurn(null);
    setProblem(null);
    setSessionAccount(undefined);
  }, [sessionId]);

  useEffect(() => () => abort.current?.abort(), []);

  const scrollToEnd = useCallback(() => endRef.current?.scrollIntoView?.({ block: 'end' }), []);
  useEffect(() => {
    if (atBottomRef.current) scrollToEnd();
  }, [messages.length, turn?.text, turn?.status, scrollToEnd]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    atBottomRef.current = near;
    setAtBottom(near);
  };

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const s = await createSession(insightId ? { insightId } : undefined).unwrap();
      createdSession.current = s.id;
      setParams({ s: s.id }, { replace: true });
      return s.id;
    } catch (e) {
      if ((e as { status?: number })?.status !== 402) setProblem(readApiError(e, 'Couldn’t start a chat.').message);
      return null;
    }
  }, [sessionId, createSession, insightId, setParams]);

  /** `account`: undefined = the chat's usual scope; a string = that account (chosen after MIXED_CURRENCY). */
  const submit = async (content: string, account?: string) => {
    const text = content.trim();
    if (!text || sending.current || turn?.status === 'streaming') return;
    if (ent.readOnly) return openTrialExpired();
    if (atLimit && row?.limit !== null && row) {
      emitPlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: row.limit ?? undefined, resetsAt: ent.periodResetsAt, message: 'You have reached your plan limit.', kind: 'mutation' });
      return;
    }
    sending.current = true;
    try {
      await sendTurn(text, account);
    } finally {
      sending.current = false;
    }
  };

  const sendTurn = async (text: string, account?: string) => {
    setProblem(null);
    const id = await ensureSession();
    if (!id) return;
    // A report's chat sends no account (the server uses the report's) unless one was chosen; any other chat sends the page's.
    const accountId = account ?? (linkedId ? sessionAccount : selectedAccountId ?? null);
    const seq = ++turnSeq.current;
    const update = (f: (t: Turn) => Turn | null) => setTurn((c) => (c && turnSeq.current === seq ? f(c) : c));
    setDraft('');
    atBottomRef.current = true;
    setTurn({ user: text, text: '', status: 'streaming', baseCount: sessionId ? messages.length : 0, tools: [] });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await send({
        sessionId: id,
        content: text,
        accountId,
        signal: controller.signal,
        onToken: (t) => update((c) => ({ ...c, text: c.text + t })),
        onTool: (name) => update((c) => ({ ...c, tools: [...c.tools, name] })),
      }).unwrap();
      update((c) => ({ ...c, status: 'done', refused: res.done.refused, tables: res.done.tables ?? [], currency: res.done.currency }));
      if (turnSeq.current === seq) setAnnounce('Answer complete');
    } catch (e) {
      const err = e as { status?: number | string; data?: { aborted?: boolean; errorCode?: string; error?: { currencies?: string[] } } };
      if (err?.data?.aborted) update((c) => ({ ...c, status: 'stopped' }));
      else if (err?.status === 402) update(() => null);
      else if (err?.data?.errorCode === 'MIXED_CURRENCY') {
        update((c) => ({ ...c, status: 'account', currencies: err.data?.error?.currencies ?? [] }));
        if (turnSeq.current === seq) setAnnounce('Choose an account to answer this question');
      } else {
        update((c) => ({ ...c, status: 'error' }));
        if (turnSeq.current === seq) setProblem(`${readApiError(e, 'The answer couldn’t be completed.').message.replace(/[.!?]*$/, '.')} Your question was not lost.`);
      }
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  const chooseAccount = (id: string) => {
    if (!turn) return;
    if (linkedId) setSessionAccount(id);
    else setSelectedAccountId(id);
    void submit(turn.user, id);
  };

  const stop = () => abort.current?.abort();
  const openCited = (id: string, ids?: string[]) => trade.openTrade(id, ids ? { ids } : undefined);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Answer copied');
    } catch {
      toast('Couldn’t copy. Select the text and copy it instead.');
    }
  };

  const newChat = () => {
    setSheet(false);
    setDraft('');
    setParams({}, { replace: false });
  };
  const select = (id: string) => {
    setSheet(false);
    setParams({ s: id });
  };

  const sessionsPane = sessionsError ? (
    <ErrorState title="Couldn’t load your chats." error={sessionsErrorDetail} onRetry={refetchSessions} />
  ) : (
    <ChatSessions sessions={sessions} loading={sessionsLoading} activeId={sessionId} onSelect={select} onDelete={setConfirmDelete} />
  );

  const empty = messages.length === 0 && !turn && !messagesFetching;
  const stored: ChatMessage[] = messages;
  const userShown = turn && turn.status !== 'done' ? stored.length < turn.baseCount + 1 : false;
  const copyButton = (text: string) => (
    <button type="button" className="inline-flex h-6 items-center px-1 text-muted-foreground underline-offset-2 hover:underline" onClick={() => void copy(text)}>Copy</button>
  );

  const accountChoice = turn?.status === 'account' && (
    <div role="group" aria-labelledby="chat-account-reason" className="space-y-2 border-l-2 border-warning pl-3">
      <p id="chat-account-reason" className="text-13 text-foreground-soft">
        {turn.currencies && turn.currencies.length > 1 ? `These trades are in ${turn.currencies.join(' and ')}` : 'These trades are in more than one currency'}, and amounts are not added across
        currencies. Choose the account to answer from. This question was not charged.
      </p>
      <AccountPicker label="Account to answer from" labelledBy="chat-account-reason" accounts={activeAccounts} value={null} onChange={chooseAccount} className="max-w-xs" />
    </div>
  );

  return (
    <div className="grid min-h-[60vh] gap-0 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      {!isMobile && (
        <aside aria-label="Chats" className="border-r border-border">
          <div className="p-3">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={newChat}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> New chat
            </Button>
          </div>
          {sessionsPane}
        </aside>
      )}

      <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-col pb-16 md:pb-0 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2">
          {linkedId ? (
            <p className="text-xs text-muted-foreground">Answers use the report’s period and account.</p>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>Answers use the last 90 days of</span>
              <AccountSwitcher />
            </div>
          )}
          <div className="flex items-center gap-2">
            {isMobile && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setSheet(true)}>Chats</Button>
                <Button type="button" variant="outline" size="sm" onClick={newChat}>New chat</Button>
              </>
            )}
            {row && row.limit !== null && <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{row.used} of {row.limit} messages this month</span>}
          </div>
        </div>
        {mixed && (
          <p className="mb-2 text-xs text-muted-foreground">
            Your accounts use {currenciesOf(accounts).join(' and ')}, so an answer needs one account: you will be asked which before anything is charged.
          </p>
        )}
        {linkedInsight && (
          <p className="mb-2 text-xs text-muted-foreground">
            Discussing the report for {formatDateShort(linkedInsight.period.from, true)} – {formatDateShort(linkedInsight.period.to, true)}.{' '}
            <Link to={`/app/insights?id=${encodeURIComponent(linkedInsight.id)}`} className="underline underline-offset-2">Open report</Link>
          </p>
        )}

        <div ref={scroller} onScroll={onScroll} role="log" aria-label="Conversation" aria-busy={turn?.status === 'streaming'} className="relative max-h-[calc(100vh-17rem)] min-h-[40vh] flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] space-y-4 py-2">
            {sessionId && messagesFetching && stored.length === 0 && !turn ? (
              <Skeleton className="h-24" />
            ) : sessionId && messagesError ? (
              <ErrorState title="Couldn’t load this chat." error={messagesErrorDetail} onRetry={refetchMessages} />
            ) : empty ? (
              <div className="space-y-3 py-6">
                <h2 className="text-sm font-semibold">Ask about your own trades</h2>
                <p className="text-13 text-muted-foreground">Answers are calculated from your journal, with the figures in a table. Pick a question or write your own.</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((q) => (
                    <Button key={q} type="button" variant="outline" size="sm" disabled={atLimit} onClick={() => void submit(q)} className="h-auto whitespace-normal py-1.5 text-left">{q}</Button>
                  ))}
                </div>
                {problem && <p role="alert" className="text-sm text-loss">{problem}</p>}
              </div>
            ) : (
              <>
                {stored.map((m) => (
                  <Message
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    onTrade={openCited}
                    tables={m.role === 'assistant' ? m.tables : undefined}
                    currency={m.currency}
                    actions={m.role === 'assistant' ? copyButton(answerText(m.content, m.tables, m.currency)) : undefined}
                  />
                ))}
                {turn && (
                  <>
                    {userShown && <Message role="user" content={turn.user} onTrade={openCited} />}
                    {turn.status === 'account' ? (
                      accountChoice
                    ) : (
                      (turn.status !== 'done' || stored.length < turn.baseCount + 2) && (
                        <Message
                          role="assistant"
                          content={turn.text}
                          pending={turn.status === 'streaming'}
                          working={turn.status === 'streaming' && turn.tools.length > 0 ? toolsLine(turn.tools) : undefined}
                          tables={turn.status === 'done' ? turn.tables : undefined}
                          currency={turn.currency}
                          onTrade={openCited}
                          note={turn.status === 'stopped' ? 'Stopped' : undefined}
                          actions={
                            turn.status === 'stopped' || turn.status === 'error' ? (
                              <button type="button" className="inline-flex h-6 items-center px-1 text-primary underline-offset-2 hover:underline" onClick={() => void submit(turn.user)}>Retry</button>
                            ) : turn.text && turn.status === 'done' ? (
                              copyButton(answerText(turn.text, turn.tables, turn.currency))
                            ) : undefined
                          }
                        />
                      )
                    )}
                  </>
                )}
                {problem && <p role="alert" className="text-sm text-loss">{problem}</p>}
              </>
            )}
            <div ref={endRef} />
          </div>
          {!atBottom && turn?.status === 'streaming' && (
            <Button type="button" size="sm" variant="outline" onClick={() => { atBottomRef.current = true; scrollToEnd(); setAtBottom(true); }} className="sticky bottom-2 ml-auto flex">
              <ArrowDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Jump to latest
            </Button>
          )}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{announce}</span>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(draft); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && turn?.status === 'streaming') stop(); }}
          className="mx-auto w-full max-w-[760px] border-t border-border py-3"
        >
          {atLimit && row ? (
            <p role="status" className="mb-2 text-sm text-foreground-soft">
              You have used {row.used} of {row.limit} messages this month.{ent.periodResetsAt ? ` Resets ${formatDateShort(ent.periodResetsAt)}.` : ''}{' '}
              <Link to="/app/settings/billing" className="text-primary underline underline-offset-2">Upgrade to Pro</Link>
            </p>
          ) : null}
          <label htmlFor="chat-input" className="sr-only">Ask about your trading</label>
          <div className="flex items-end gap-2">
            <Textarea
              id="chat-input"
              rows={2}
              value={draft}
              disabled={atLimit}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit(draft);
                }
              }}
              placeholder="Ask about your trading…"
              className="min-h-[3.25rem] resize-none"
            />
            {turn?.status === 'streaming' ? (
              <Button type="button" variant="outline" onClick={stop} aria-label="Stop answer (Esc)"><Square className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Stop</Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Send message" disabled={!draft.trim() || atLimit}><ArrowUp className="h-4 w-4" aria-hidden="true" /></Button>
            )}
          </div>
          <div className="mt-2"><AiNote /></div>
        </form>
      </section>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-3"><SheetTitle>Chats</SheetTitle></SheetHeader>
          {sessionsPane}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {sessions.find((s) => s.id === confirmDelete)?.title || 'this chat'}?</AlertDialogTitle>
            <AlertDialogDescription>The conversation is removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const id = confirmDelete;
                setConfirmDelete(null);
                if (!id) return;
                try {
                  await deleteSession(id).unwrap();
                  if (sessionId === id) setParams({}, { replace: true });
                } catch (e) {
                  toast('Couldn’t delete the chat.', { description: readApiError(e, 'Try again.').message });
                }
              }}
            >
              Delete chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
