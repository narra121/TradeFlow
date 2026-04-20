import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { FirestoreChatSessionSummary } from '@/lib/firebase/firestore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ChatSessionSidebarProps {
  sessions: FirestoreChatSessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  sessionsLoading: boolean;
  currentInsightId?: string;
}

function periodLabel(period: string): string {
  const labels: Record<string, string> = {
    thisMonth: 'This Month',
    last2Months: 'Last 2 Months',
    last3Months: 'Last 3 Months',
    last6Months: 'Last 6 Months',
    last1Year: 'Last 1 Year',
  };
  return labels[period] || period;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-3" data-testid="sessions-loading">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg px-3 py-2 space-y-2">
          <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
          <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  sessionsLoading,
  currentInsightId,
}: ChatSessionSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Chat Sessions</h3>
      </div>

      <ScrollArea className="flex-1">
        {sessionsLoading ? (
          <LoadingSkeleton />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 pt-10">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No chat sessions yet. Ask a question to start a conversation.
            </p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="p-2 space-y-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isExpired = session.status === 'expired';
                const isGenerating = session.status === 'generating';
                const isOldInsight = currentInsightId != null
                  && session.insightId != null
                  && session.insightId !== currentInsightId;
                const isDisabled = isOldInsight && !isActive;
                const title = session.title || periodLabel(session.period);
                const timeAgo = formatDistanceToNow(session.createdAt.toMillis(), {
                  addSuffix: true,
                });

                const sessionButton = (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => !isDisabled && onSelectSession(session.id)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 transition-colors duration-150',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-accent/50',
                      isExpired && !isActive && !isDisabled && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'text-sm font-medium truncate flex-1',
                          (isExpired || isDisabled) && 'italic text-muted-foreground'
                        )}
                      >
                        {title}
                      </span>
                      {isGenerating && (
                        <Loader2
                          className="w-3.5 h-3.5 shrink-0 animate-spin text-primary"
                          aria-label="Generating"
                        />
                      )}
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] px-1.5 py-0"
                      >
                        {session.messageCount}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {timeAgo}
                      </span>
                      {isExpired && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          Expired
                        </Badge>
                      )}
                    </div>
                  </button>
                );

                if (isDisabled) {
                  return (
                    <Tooltip key={session.id}>
                      <TooltipTrigger asChild>
                        {sessionButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <p className="text-xs">
                          This conversation is based on previous insights. Continue with the latest chat session.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return sessionButton;
              })}
            </div>
          </TooltipProvider>
        )}
      </ScrollArea>
    </div>
  );
}
