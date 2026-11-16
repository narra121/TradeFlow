import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { groupSessions } from '@/lib/ai/chatFormat';
import { cn } from '@/lib/utils';
import type { ChatSession } from '@/types/chat';

interface ChatSessionsProps {
  sessions: ChatSession[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  /** The account a chat's answers used, shown under its title; undefined when unknown. */
  accountName?: (accountId: string) => string | undefined;
}

/** Left list, grouped Today / Yesterday / Earlier. */
export function ChatSessions({ sessions, loading, activeId, onSelect, onDelete, accountName }: ChatSessionsProps) {
  if (loading) return <div className="space-y-1 p-3"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>;
  // A chat whose first question never got an answer (left, asked for an account, failed) holds nothing to go back to.
  const shown = sessions.filter((s) => s.messageCount > 0 || s.id === activeId);
  if (shown.length === 0) return <p className="px-3 py-2 text-13 text-muted-foreground">No chats yet.</p>;
  return (
    <div>
      {groupSessions(shown).map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h3 className="px-3 pb-1 pt-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</h3>
          <ul>
            {g.sessions.map((s) => {
              const on = s.id === activeId;
              const title = s.title || 'New chat';
              // The same question asked of two accounts would otherwise be two identical entries.
              const account = s.accountId ? accountName?.(s.accountId) : undefined;
              return (
                <li key={s.id} className={cn('flex items-center border-l-2', on ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted')}>
                  <button type="button" onClick={() => onSelect(s.id)} aria-current={on ? 'true' : undefined} title={title} className="min-h-10 min-w-0 flex-1 px-3 py-1 text-left text-13 [@media(pointer:coarse)]:min-h-11">
                    <span className="block truncate">{title}</span>{' '}
                    {account &&<span className="block truncate text-xs text-muted-foreground">{account}</span>}
                  </button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete chat ${title}`} onClick={() => onDelete(s.id)} className="mr-1 shrink-0 text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
