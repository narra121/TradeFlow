import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AiNote } from '@/components/shell/AiNote';
import { usePageChrome } from '@/components/shell/chrome';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useCreateChatSessionMutation, useDeleteChatSessionMutation, useGetChatMessagesQuery, useListChatSessionsQuery, useSendChatMessageMutation } from '@/store/api/chatApi';
import { useListInsightsQuery } from '@/store/api/insightsApi';
import { starterQuestions } from '@/lib/ai/chatFormat';
import { citedTradeIds, renderAnswer } from '@/lib/ai/markdown';
import { formatDateShort } from '@/lib/format';
import { emitPlanSignal } from '@/lib/planErrors';
import type { ChatMessage } from '@/types/chat';
import { ChatSessions } from './ChatSessions';

interface Turn {
  user: string;
  text: string;
  status: 'streaming' | 'done' | 'stopped' | 'error';
  /** stored messages when the question was sent, to tell when the refetch has caught up */
  baseCount: number;
  refused?: boolean;
}

function Message({ role, content, onTrade, actions, note, pending }: { role: 'user' | 'assistant'; content: string; onTrade: (id: string) => void; actions?: React.ReactNode; note?: string; pending?: boolean }) {
  const cited = role === 'assistant' ? citedTradeIds(content) : [];
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-foreground-soft">{role === 'user' ? 'You' : 'TradeQut AI'}</p>
      {role === 'user' ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      ) : (
        <div className="space-y-2 text-sm leading-relaxed">{content ? renderAnswer(content, { onTrade }) : pending ? <span className="text-muted-foreground">Thinking…</span> : null}</div>
      )}
      {cited.length > 1 && (
        <button type="button" onClick={() => onTrade(cited[0])} className="inline-flex h-6 items-center text-xs text-primary underline-offset-2 hover:underline">
          View all {cited.length} trades →
        </button>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {actions && <div className="flex items-center gap-3 text-xs">{actions}</div>}
    </div>
  );
}

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
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('s');
  const insightId = params.get('insight');
  const ref = params.get('ref');
  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useListChatSessionsQuery();
  const { data: messages = [], isFetching: messagesFetching, isError: messagesError, refetch: refetchMessages } = useGetChatMessagesQuery(sessionId ?? '', { skip: !sessionId });
  const { data: insightList } = useListInsightsQuery({ limit: 1 });
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
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const row = ent.usage.find((u) => u.feature === 'ai_chat');
  const atLimit = !!row && row.limit !== null && row.used >= row.limit;
  const starters = useMemo(() => starterQuestions(insightList?.insights[0]), [insightList]);
  const linkedInsight = insightId ? insightList?.insights.find((i) => i.id === insightId) : undefined;

  // The refetch after an answer replaces the local turn once the stored messages caught up.
  useEffect(() => {
    if (!turn) return;
    if (turn.status === 'done' && messages.length >= turn.baseCount + 2) setTurn(null);
  }, [messages.length, turn]);

  useEffect(() => {
    setTurn(null);
    setProblem(null);
  }, [sessionId]);

  const scrollToEnd = useCallback(() => endRef.current?.scrollIntoView?.({ block: 'end' }), []);
  useEffect(() => {
    if (atBottomRef.current) scrollToEnd();
  }, [messages.length, turn?.text, scrollToEnd]);

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
      setParams({ s: s.id }, { replace: true });
      return s.id;
    } catch (e) {
      if ((e as { status?: number })?.status !== 402) setProblem('Couldn’t start a chat. Check your connection and try again.');
      return null;
    }
  }, [sessionId, createSession, insightId, setParams]);

  const submit = async (content: string) => {
    const text = content.trim();
    if (!text || turn?.status === 'streaming') return;
    if (atLimit && row?.limit !== null && row) {
      emitPlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_chat', limit: row.limit ?? undefined, resetsAt: ent.periodResetsAt, message: 'You have reached your plan limit.', kind: 'mutation' });
      return;
    }
    setProblem(null);
    const id = await ensureSession();
    if (!id) return;
    setDraft('');
    atBottomRef.current = true;
    setTurn({ user: text, text: '', status: 'streaming', baseCount: sessionId ? messages.length : 0 });
    abort.current = new AbortController();
    try {
      const res = await send({ sessionId: id, content: text, signal: abort.current.signal, onToken: (t) => setTurn((c) => (c ? { ...c, text: c.text + t } : c)) }).unwrap();
      setTurn((c) => (c ? { ...c, status: 'done', refused: res.done.refused } : c));
      setAnnounce('Answer complete');
    } catch (e) {
      const err = e as { status?: number | string; data?: { aborted?: boolean } };
      if (err?.data?.aborted) setTurn((c) => (c ? { ...c, status: 'stopped' } : c));
      else if (err?.status === 402) setTurn(null);
      else {
        setTurn((c) => (c ? { ...c, status: 'error' } : c));
        setProblem('The answer couldn’t be completed. Your question was not lost.');
      }
    } finally {
      abort.current = null;
    }
  };

  const stop = () => abort.current?.abort();

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
    <ErrorState title="Couldn’t load your chats." onRetry={refetchSessions} />
  ) : (
    <ChatSessions sessions={sessions} loading={sessionsLoading} activeId={sessionId} onSelect={select} onDelete={setConfirmDelete} />
  );

  const empty = messages.length === 0 && !turn && !messagesFetching;
  const stored: ChatMessage[] = messages;
  const userShown = turn && turn.status !== 'done' ? stored.length < turn.baseCount + 1 : false;

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
          <p className="text-xs text-muted-foreground">Answers use all your accounts and trades.</p>
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
        {linkedInsight && (
          <p className="mb-2 text-xs text-muted-foreground">
            Discussing the report for {formatDateShort(linkedInsight.period.from, true)} – {formatDateShort(linkedInsight.period.to, true)}.{' '}
            <Link to={`/app/insights?id=${encodeURIComponent(linkedInsight.id)}`} className="underline underline-offset-2">Open report</Link>
          </p>
        )}

        <div ref={scroller} onScroll={onScroll} role="log" aria-label="Conversation" aria-busy={turn?.status === 'streaming'} className="relative max-h-[calc(100vh-17rem)] min-h-[40vh] flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] space-y-4 py-2">
            {sessionId && messagesFetching && stored.length === 0 ? (
              <Skeleton className="h-24" />
            ) : sessionId && messagesError ? (
              <ErrorState title="Couldn’t load this chat." onRetry={refetchMessages} />
            ) : empty ? (
              <div className="space-y-3 py-6">
                <h2 className="text-sm font-semibold">Ask about your own trades</h2>
                <p className="text-13 text-muted-foreground">Answers come from your journal. Pick a question or write your own.</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((q) => (
                    <Button key={q} type="button" variant="outline" size="sm" disabled={atLimit} onClick={() => void submit(q)} className="h-auto whitespace-normal py-1.5 text-left">{q}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {stored.map((m) => (
                  <Message
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    onTrade={(id) => trade.openTrade(id)}
                    actions={m.role === 'assistant' ? <button type="button" className="inline-flex h-6 items-center px-1 text-muted-foreground underline-offset-2 hover:underline" onClick={() => void copy(m.content)}>Copy</button> : undefined}
                  />
                ))}
                {turn && (
                  <>
                    {userShown && <Message role="user" content={turn.user} onTrade={(id) => trade.openTrade(id)} />}
                    {(turn.status !== 'done' || stored.length < turn.baseCount + 2) && (
                      <Message
                        role="assistant"
                        content={turn.text}
                        pending={turn.status === 'streaming'}
                        onTrade={(id) => trade.openTrade(id)}
                        note={turn.status === 'stopped' ? 'Stopped' : undefined}
                        actions={
                          turn.status === 'stopped' || turn.status === 'error' ? (
                            <button type="button" className="inline-flex h-6 items-center px-1 text-primary underline-offset-2 hover:underline" onClick={() => void submit(turn.user)}>Retry</button>
                          ) : turn.text ? (
                            <button type="button" className="inline-flex h-6 items-center px-1 text-muted-foreground underline-offset-2 hover:underline" onClick={() => void copy(turn.text)}>Copy</button>
                          ) : undefined
                        }
                      />
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
                } catch {
                  toast('Couldn’t delete the chat. Try again.');
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
