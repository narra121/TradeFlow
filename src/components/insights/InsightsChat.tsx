import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, User, Bot, Square, Maximize2, Minimize2 } from 'lucide-react';
import { useFirebaseChat } from '@/hooks/useFirebaseChat';
import { ChatSessionSidebar } from '@/components/insights/ChatSessionSidebar';
import type { ChatMessage } from '@/types/insights';
import type { Trade } from '@/types/trade';

interface RateLimitBucket {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
}

interface RateLimitInfo {
  insights: RateLimitBucket;
  sessions: RateLimitBucket;
}

export interface InsightsChatProps {
  accountId: string;
  period: string;
  startDate: string;
  endDate: string;
  trades: Trade[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  rateLimits: RateLimitInfo | null;
  insightId?: string;
  insightsData?: string;
  hasInsights?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What are my biggest mistakes?',
  'How can I improve my win rate?',
  'What patterns do you see?',
  'Which trades should I have avoided?',
];

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="session-switching-skeleton">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
          {i % 2 !== 0 && (
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
          )}
          <div
            className={cn(
              'rounded-lg px-3 py-2 animate-pulse',
              i % 2 === 0 ? 'bg-primary/20 w-[60%]' : 'bg-secondary/50 w-[70%]'
            )}
          >
            <div className="h-4 rounded w-full" />
            {i % 2 !== 0 && <div className="h-4 rounded w-3/4 mt-1.5" />}
          </div>
          {i % 2 === 0 && (
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function StreamingIndicator() {
  return (
    <div className="flex gap-2 justify-start">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
      </div>
      <div className="rounded-lg px-3 py-2 bg-secondary/50 text-sm">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}

export function InsightsChat({
  accountId,
  period,
  trades,
  isFullscreen,
  onToggleFullscreen,
  rateLimits,
  insightId,
  insightsData,
  hasInsights = false,
}: InsightsChatProps) {
  const [inputText, setInputText] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    sessions,
    sessionsLoading,
    activeSessionId,
    sessionSwitching,
    messages,
    streaming,
    error,
    sessionId,
    messageCount,
    messageLimit,
    startSession,
    switchSession,
    send,
    abort,
    clearError,
  } = useFirebaseChat();

  const isSessionFull = messageCount >= messageLimit;
  const isRateLimited = rateLimits !== null && rateLimits.sessions.remaining <= 0;
  const inputDisabled = streaming || isSessionFull;

  // Auto-focus the chat session linked to the current insightId
  useEffect(() => {
    if (sessionsLoading || !insightId || activeSessionId || isNewChat) return;
    const matchingSession = sessions.find(s => s.insightId === insightId);
    if (matchingSession) {
      switchSession(matchingSession.id);
    }
  }, [sessionsLoading, sessions, insightId, activeSessionId, isNewChat, switchSession]);

  // When sessionId appears after startSession, send the pending message
  useEffect(() => {
    if (sessionId && pendingMessage) {
      send(pendingMessage);
      setPendingMessage(null);
      setIsNewChat(false);
    }
  }, [sessionId, pendingMessage, send]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streaming]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onToggleFullscreen();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || streaming) return;
    setInputText('');

    if (!sessionId || isNewChat) {
      setPendingMessage(text);
      startSession(trades, accountId, period, insightId, insightsData);
      setIsNewChat(false);
    } else {
      send(text);
    }
  }, [inputText, streaming, sessionId, isNewChat, trades, accountId, period, insightId, insightsData, startSession, send]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestedQuestion(question: string) {
    if (streaming) return;
    if (!sessionId || isNewChat) {
      setPendingMessage(question);
      startSession(trades, accountId, period, insightId, insightsData);
      setIsNewChat(false);
    } else {
      send(question);
    }
  }

  function handleSelectSession(id: string) {
    setIsNewChat(false);
    switchSession(id);
  }

  // Determine if we should show the empty/suggested state
  const showEmptyState = (messages.length === 0 && !streaming && !pendingMessage) || isNewChat;
  const showMessages = !isNewChat && messages.length > 0;

  // --- Shared UI pieces ---

  const messagesContent = (
    <>
      {sessionSwitching && !isNewChat ? (
        <MessageSkeleton />
      ) : (
        <>
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-3" />
              {hasInsights ? (
                <p className="text-sm text-muted-foreground">
                  Ask me anything about your trading performance and insights
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate insights first to start a conversation about your trading data.
                </p>
              )}
            </div>
          )}

          {showMessages && messages.map((msg: ChatMessage, i: number) => (
            <div
              key={i}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-foreground'
                )}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {!isNewChat && (streaming || pendingMessage) && <StreamingIndicator />}

          <div ref={messagesEndRef} />
        </>
      )}
    </>
  );

  const errorDisplay = error && (
    <p className="text-xs text-destructive" role="alert">
      {error}
    </p>
  );

  const sessionFullNotice = isSessionFull && !isNewChat && (
    <p className="text-xs text-muted-foreground text-center">
      You have reached the 25-message limit for this conversation. Regenerate your insights to start a new conversation.
    </p>
  );

  const suggestedQuestions = showEmptyState && (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => handleSuggestedQuestion(question)}
          disabled={isRateLimited}
          className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {question}
        </button>
      ))}
    </div>
  );

  const chatInput = (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isSessionFull && !isNewChat ? 'Session message limit reached' : 'Ask about your trades...'}
        disabled={inputDisabled && !isNewChat}
        className="flex-1"
        aria-label="Chat message input"
      />
      {streaming && !isNewChat ? (
        <Button
          size="icon"
          variant="outline"
          onClick={abort}
          aria-label="Stop generating"
        >
          <Square className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!inputText.trim() || (isSessionFull && !isNewChat) || (isRateLimited && !sessionId)}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // --- Fullscreen layout ---
  if (isFullscreen) {
    return (
      <div className="flex h-full animate-fade-in" data-testid="fullscreen-chat">
        {/* Left panel: session sidebar */}
        <div className="w-64 shrink-0 border-r border-border">
          <ChatSessionSidebar
            sessions={sessions}
            activeSessionId={isNewChat ? null : activeSessionId}
            onSelectSession={handleSelectSession}
            sessionsLoading={sessionsLoading}
            currentInsightId={insightId}
          />
        </div>

        {/* Right panel: chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">AI Chat</h2>
              {activeSessionId && !isNewChat && (
                <span className="text-xs text-muted-foreground">
                  {messageCount}/{messageLimit} messages
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              aria-label="Exit fullscreen"
              className="h-8 w-8"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messagesContent}
            </div>
          </ScrollArea>

          {/* Bottom section: error, notices, suggestions, input */}
          <div className="shrink-0 border-t border-border p-4 space-y-3">
            {errorDisplay}
            {sessionFullNotice}
            {suggestedQuestions}
            {chatInput}
            {rateLimits && !activeSessionId && !isNewChat && (
              <p className="text-xs text-muted-foreground">
                {rateLimits.sessions.remaining}/{rateLimits.sessions.limit} sessions remaining
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Embedded (card) layout ---
  return (
    <Card className="ai-glow-card border-0 animate-fade-in flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Ask AI</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {sessionId && !isNewChat && (
              <span className="text-xs text-muted-foreground">
                {messageCount}/{messageLimit} messages
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              aria-label="Expand chat"
              className="h-7 w-7"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask questions about your trading data and get AI-powered analysis
        </p>
        {rateLimits && !sessionId && (
          <p className="text-xs text-muted-foreground">
            {rateLimits.sessions.remaining}/{rateLimits.sessions.limit} sessions remaining
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[400px] pr-1">
          {messagesContent}
        </div>

        {errorDisplay}
        {sessionFullNotice}
        {suggestedQuestions}
        {chatInput}
      </CardContent>
    </Card>
  );
}
