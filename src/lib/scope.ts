import { subDays } from 'date-fns/subDays';
import { subMonths } from 'date-fns/subMonths';
import { startOfWeek } from 'date-fns/startOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { formatLocalDateOnly, } from '@/lib/dateUtils';
import { parseLocalDate } from '@/lib/format';

export type DatePreset =
  | 'thisWeek'
  | 'thisMonth'
  | 'last2Months'
  | 'last3Months'
  | 'last6Months'
  | 'last1Year'
  | 7
  | 30
  | 60
  | 90
  | 365
  | 'all'
  | 'custom';

export const SCOPE_KEY = 'tq.scope';
export const TRADELOG_KEY = 'tq.tradelog';
export const ALL_TIME_START = '2000-01-01';

/** Presets offered in the filter, in display order. */
export const PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last year' },
];

export function presetLabel(preset: DatePreset): string {
  if (preset === 'custom') return 'Custom range';
  const hit = PRESET_OPTIONS.find((p) => p.value === preset);
  if (hit) return hit.label;
  const legacy: Record<string, string> = {
    last2Months: 'Last 2 months',
    last3Months: 'Last 3 months',
    last6Months: 'Last 6 months',
    last1Year: 'Last year',
    60: 'Last 60 days',
  };
  return legacy[String(preset)] ?? 'All time';
}

/** Weeks start on Monday. `to` is always the end of the supplied `now`, never a cached date. */
export function getDateRangeFromPreset(
  preset: DatePreset,
  customRange?: { from: Date; to: Date },
  now: Date = new Date(),
): { from: Date; to: Date } {
  if (preset === 'custom' && customRange) return customRange;
  if (preset === 'all') return { from: parseLocalDate(ALL_TIME_START), to: now };
  if (preset === 'thisWeek') return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
  if (preset === 'thisMonth') return { from: startOfMonth(now), to: now };
  if (preset === 'last2Months') return { from: startOfMonth(subMonths(now, 1)), to: now };
  if (preset === 'last3Months') return { from: startOfMonth(subMonths(now, 2)), to: now };
  if (preset === 'last6Months') return { from: startOfMonth(subMonths(now, 5)), to: now };
  if (preset === 'last1Year') return { from: startOfMonth(subMonths(now, 11)), to: now };
  // Both ends are inclusive: "Last 7 days" is today and the six days before it.
  const days = typeof preset === 'number' ? preset : 30;
  return { from: subDays(now, days - 1), to: now };
}

export interface PersistedScope {
  accountId: string | null;
  datePreset: DatePreset;
  customFrom?: string;
  customTo?: string;
}

export function loadScope(): PersistedScope | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SCOPE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedScope>;
    return {
      accountId: typeof parsed.accountId === 'string' ? parsed.accountId : null,
      datePreset: (parsed.datePreset as DatePreset) ?? 'all',
      customFrom: parsed.customFrom,
      customTo: parsed.customTo,
    };
  } catch {
    return null;
  }
}

export function saveScope(scope: PersistedScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, JSON.stringify(scope));
  } catch {
    // storage unavailable (private mode / quota): scope simply is not persisted
  }
}

const DRAFT_PREFIX = 'tq.draft.';

function draftKeys(): string[] {
  try {
    return Object.keys(sessionStorage).filter((k) => k.startsWith(DRAFT_PREFIX));
  } catch {
    return [];
  }
}

/** True when this tab holds an unsaved trade draft. */
export function hasTradeDrafts(): boolean {
  return draftKeys().length > 0;
}

/** Log out only: drafts are not per user, so the next person in this tab must not be offered them. A session that ended keeps them. */
export function clearTradeDrafts(): void {
  draftKeys().forEach((k) => sessionStorage.removeItem(k));
}

/** Called on logout and on a global 401. */
export function clearPersistedViewState(): void {
  try {
    localStorage.removeItem(SCOPE_KEY);
    sessionStorage.removeItem(TRADELOG_KEY);
  } catch {
    // nothing to clear
  }
}

export function resolveRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const custom =
    preset === 'custom' && customFrom && customTo
      ? { from: parseLocalDate(customFrom), to: parseLocalDate(customTo) }
      : undefined;
  const effective: DatePreset = preset === 'custom' && !custom ? 'all' : preset;
  const range = getDateRangeFromPreset(effective, custom, now);
  return { startDate: formatLocalDateOnly(range.from), endDate: formatLocalDateOnly(range.to) };
}
