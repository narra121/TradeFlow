import { addDays, addMonths, addYears, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeFilter, type DatePreset } from '@/components/filters/DateRangeFilter';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { parseLocalDate } from '@/lib/format';
import { getDateRangeFromPreset } from '@/lib/scope';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';

/** Moves the active range by one unit of its preset: a week, a month, N days, a year; custom ranges move by their own length. */
export function shiftRange(preset: DatePreset, start: string, end: string, dir: 1 | -1): { startDate: string; endDate: string } | null {
  if (preset === 'all') return null;
  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  const fmt = formatLocalDateOnly;
  if (preset === 'thisWeek') {
    // The whole Monday-Sunday week before or after, not the partial "this week" moved by seven days.
    const monday = addDays(addDays(from, -((from.getDay() + 6) % 7)), 7 * dir);
    return { startDate: fmt(monday), endDate: fmt(addDays(monday, 6)) };
  }
  if (preset === 'thisMonth' || preset === 'last2Months' || preset === 'last3Months' || preset === 'last6Months') {
    const months = preset === 'thisMonth' ? 1 : preset === 'last2Months' ? 2 : preset === 'last3Months' ? 3 : 6;
    const nf = addMonths(from, months * dir);
    return { startDate: fmt(nf), endDate: fmt(addDays(addMonths(nf, months), -1)) };
  }
  if (preset === 'last1Year' || preset === 365) return { startDate: fmt(addYears(from, dir)), endDate: fmt(addYears(to, dir)) };
  const length = Math.max(1, differenceInCalendarDays(to, from) + 1);
  return { startDate: fmt(addDays(from, length * dir)), endDate: fmt(addDays(to, length * dir)) };
}

/** `‹ [This month ▾] ›`: the one period control of the scope bar (second control after the account). */
export function ScopePeriod() {
  const dispatch = useAppDispatch();
  const f = useAppSelector((s) => s.trades.filters);

  const onPreset = (preset: DatePreset) => {
    const custom = preset === 'custom' ? { from: parseLocalDate(f.customFrom ?? f.startDate), to: parseLocalDate(f.customTo ?? f.endDate) } : undefined;
    const r = getDateRangeFromPreset(preset, custom);
    dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(r.from), endDate: formatLocalDateOnly(r.to), datePreset: preset }));
  };
  const step = (dir: 1 | -1) => {
    const next = shiftRange(f.datePreset, f.startDate, f.endDate, dir);
    if (next) dispatch(setDateRangeFilter({ ...next, datePreset: 'custom' }));
  };
  const disabled = f.datePreset === 'all';
  const custom = f.datePreset === 'custom' ? { from: parseLocalDate(f.startDate), to: parseLocalDate(f.endDate) } : undefined;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon-sm" className="hidden md:inline-flex" onClick={() => step(-1)} disabled={disabled} aria-label="Previous period">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <DateRangeFilter
        selectedPreset={f.datePreset}
        onPresetChange={onPreset}
        customRange={custom}
        onCustomRangeChange={(r) => dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(r.from), endDate: formatLocalDateOnly(r.to), datePreset: 'custom' }))}
        showCustomPicker
        className="h-7"
      />
      <Button type="button" variant="ghost" size="icon-sm" className="hidden md:inline-flex" onClick={() => step(1)} disabled={disabled} aria-label="Next period">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
