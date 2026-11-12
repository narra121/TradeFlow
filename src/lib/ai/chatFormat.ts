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

/** Up to four questions from the findings of the latest report (leaks first), else the fixed ones. */
export function starterQuestions(insight: Insight | undefined): string[] {
  if (!insight) return FIXED_STARTERS;
  const findings = [...insight.sections.filter((s) => s.kind === 'leak'), ...insight.sections.filter((s) => s.kind === 'pattern'), ...insight.sections.filter((s) => s.kind === 'strength')];
  const questions = findings.slice(0, 4).map((s) => {
    const title = s.title.trim().replace(/[.?!]+$/, '');
    return s.kind === 'strength' ? `How can I do more of this: ${title}?` : `What is behind this: ${title}?`;
  });
  return questions.length > 0 ? questions : FIXED_STARTERS;
}
