import type { Insight } from '@/types/insights';
import type { ChatSession } from '@/types/chat';

export const FIXED_STARTERS = [
  'What is my biggest leak this month?',
  'Which setup has made me the most money?',
  'How do I perform after a losing trade?',
  'Which mistakes cost me the most?',
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export interface SessionGroup {
  label: 'Today' | 'Yesterday' | 'Earlier';
  sessions: ChatSession[];
}

/** Newest first, grouped Today / Yesterday / Earlier by the last message; empty groups are left out. */
export function groupSessions(sessions: ChatSession[], now: Date = new Date()): SessionGroup[] {
  const today = startOfDay(now);
  const groups: SessionGroup[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Earlier', sessions: [] },
  ];
  const sorted = [...sessions].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  for (const s of sorted) {
    const t = startOfDay(new Date(s.updatedAt));
    groups[t >= today ? 0 : t >= today - 86_400_000 ? 1 : 2].sessions.push(s);
  }
  return groups.filter((g) => g.sessions.length > 0);
}

/** The tools of the `event: tool` frame, in words; an unknown name is shown as sent. */
const TOOL_LABEL: Record<string, string> = {
  stats: 'figures by group',
  sequence: 'trades after a loss or a win',
  whatIf: 'a what-if replay',
  trades: 'a list of trades',
  compare: 'two periods side by side',
};

/** `Calculated: figures by group, a what-if replay` for the tools run so far (each once). */
export function toolsLine(names: string[]): string {
  return `Calculated: ${[...new Set(names)].map((n) => TOOL_LABEL[n] ?? n).join(', ')}`;
}

/** Questions that one calculation answers (stats, sequence, stats by weekday, what-if): the chat's own starters. */
export const CHAT_STARTERS = [
  'Which setup has made me the most money?',
  'How do I do after a losing trade?',
  'Which weekday costs me the most?',
  'What if I stopped after 2 losses a day?',
];

/**
 * The four calculation starters; a chat about a report opens with up to two questions on that report's findings
 * (the one thing of a weekly review, else its leaks first) in place of the last two.
 */
export function starterQuestions(insight: Insight | undefined): string[] {
  if (!insight) return CHAT_STARTERS;
  const clean = (t: string) => t.trim().replace(/[.?!]+$/, '');
  const review = insight.review;
  const fromReport = review
    ? [review.theOne, ...review.more].filter((f) => f !== null).map((f) => `Which trades make up "${clean(f.title)}"?`)
    : [...insight.sections.filter((s) => s.kind === 'leak'), ...insight.sections.filter((s) => s.kind === 'pattern')].map((s) => `What is behind this: ${clean(s.title)}?`);
  const picked = fromReport.slice(0, 2);
  return [...picked, ...CHAT_STARTERS.slice(0, 4 - picked.length)];
}
