import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User, Bot, Square } from 'lucide-react';
import { useFirebaseChat } from '@/hooks/useFirebaseAI';
import type { ChatMessage } from '@/types/insights';

interface InsightsChatProps {
  accountId: string;
  startDate: string;
  endDate: string;
  trades: unknown[];
}

const SUGGESTED_QUESTIONS = [
  'What are my biggest mistakes?',
  'How can I improve my win rate?',
  'What patterns do you see?',
  'Which trades should I have avoided?',
];

export function InsightsChat({ accountId, startDate, endDate, trades }: InsightsChatProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context = JSON.stringify({ accountId, startDate, endDate, tradeCount: trades.length });
  const { messages, streaming, error, send, abort } = useFirebaseChat(context);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streaming]);

  function handleSend() {
    const text = inputText.trim();
    if (!text || streaming) return;
    setInputText('');
    send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestedQuestion(question: string) {
    if (streaming) return;
    send(question);
  }

  return (
    <Card className="ai-glow-card border-0 animate-fade-in flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">Ask AI</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask questions about your trading data and get AI-powered analysis
        </p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[400px] pr-1">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Ask me anything about your trading performance
              </p>
            </div>
          )}

          {messages.map((msg: ChatMessage, i: number) => (
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

          {streaming && (
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
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Suggested questions */}
        {messages.length === 0 && !streaming && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your trades..."
            disabled={streaming}
            className="flex-1"
            aria-label="Chat message input"
          />
          {streaming ? (
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
              disabled={!inputText.trim()}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
