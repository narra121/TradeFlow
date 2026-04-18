import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles } from 'lucide-react';
import { insightsApi } from '@/lib/api/insights';

interface InsightsChatProps {
  accountId?: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
}

export function InsightsChat({ accountId, startDate, endDate, totalTrades }: InsightsChatProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What's my best symbol?",
    "Am I overtrading?",
    "What time should I trade?",
    "Show my win rate by strategy",
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user' as const, content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await insightsApi.chat({
        message: msg,
        accountId,
        startDate,
        endDate,
        history: messages,
      });
      const { reply, suggestedQuestions: newSuggestions } = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (newSuggestions?.length) setSuggestedQuestions(newSuggestions);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, accountId, startDate, endDate, messages]);

  return (
    <div className="flex flex-col h-[60vh] min-h-[400px] rounded-lg border border-border bg-card/50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial bot message */}
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary/50 rounded-lg rounded-tl-sm px-3 py-2 max-w-[80%]">
              <p className="text-sm text-foreground">
                Hi! I have access to your {totalTrades} trades. Ask me anything about your trading performance.
              </p>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'justify-end')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={cn(
              'rounded-lg px-3 py-2 max-w-[80%] text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-secondary/50 text-foreground rounded-tl-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary/50 rounded-lg rounded-tl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 text-xs rounded-full border border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Privacy note */}
      <div className="px-4 pb-1">
        <p className="text-[10px] text-muted-foreground/50">
          Your trade data stays on our servers. Only aggregated stats are sent to AI.
        </p>
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about your trades..."
          disabled={loading}
          className="flex-1 bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
