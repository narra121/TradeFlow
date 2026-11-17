import { formatDayText } from '@/lib/format';

/** Indian financial year of a date, `2026-27` (1 April to 31 March). */
export function financialYear(now: Date = new Date()): string {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** The current financial year and the three before it, newest first. */
export function financialYears(now: Date = new Date(), count = 4): string[] {
  const current = Number(financialYear(now).slice(0, 4));
  return Array.from({ length: count }, (_, i) => `${current - i}-${String((current - i + 1) % 100).padStart(2, '0')}`);
}

export function formatFyRange(from: string, to: string): string {
  return `${formatDayText(from, true)} – ${formatDayText(to, true)}`;
}
