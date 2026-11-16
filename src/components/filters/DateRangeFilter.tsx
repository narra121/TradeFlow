import { useState } from 'react';
import { format } from 'date-fns/format';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { popupOption } from '@/components/ui/popup';
import { appToday } from '@/lib/appTimeZone';
import { cn } from '@/lib/utils';
import { DatePreset, PRESET_OPTIONS, getDateRangeFromPreset, presetLabel } from '@/lib/scope';

export type { DatePreset };
export { getDateRangeFromPreset };

interface DateRangeFilterProps {
  selectedPreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  customRange?: { from: Date; to: Date };
  onCustomRangeChange?: (range: { from: Date; to: Date }) => void;
  showCustomPicker?: boolean;
  /** Phones: no icon, tighter padding, and no year when both ends are in the current year; the name keeps the full range. */
  compact?: boolean;
  className?: string;
}

/**
 * `19 – 25 Oct 2026`, `19 Oct – 25 Nov 2026`, or both dates in full across years (DESIGN-SCREENS §1.4 label). With
 * `currentYear` set and both ends in it, the year is left out (`1 Oct – 17 Nov`).
 */
export function rangeLabel(from: Date, to: Date, currentYear?: number): string {
  if (from.getFullYear() !== to.getFullYear()) return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
  const year = from.getFullYear() === currentYear ? '' : ` ${from.getFullYear()}`;
  if (from.getMonth() !== to.getMonth()) return `${format(from, 'd MMM')} – ${format(to, 'd MMM')}${year}`;
  return `${format(from, 'd')} – ${format(to, 'd MMM')}${year}`;
}

/** One trigger showing the active range; the popover lists presets and, when enabled, a custom range. */
export function DateRangeFilter({
  selectedPreset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  showCustomPicker = false,
  compact = false,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const label =
    selectedPreset === 'custom' && customRange
      ? rangeLabel(customRange.from, customRange.to)
      : presetLabel(selectedPreset);
  const shown = compact && selectedPreset === 'custom' && customRange ? rangeLabel(customRange.from, customRange.to, appToday().getFullYear()) : label;

  const choose = (preset: DatePreset) => {
    onPresetChange(preset);
    setPicking(null);
    if (preset !== 'custom') setOpen(false);
  };

  const effective = customRange ?? getDateRangeFromPreset(selectedPreset === 'custom' ? 'all' : selectedPreset);

  const pick = (which: 'from' | 'to', date: Date | undefined) => {
    if (!date || !onCustomRangeChange) return;
    const next = which === 'from' ? { from: date, to: effective.to < date ? date : effective.to } : { from: effective.from > date ? date : effective.from, to: date };
    onCustomRangeChange(next);
    setPicking(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('min-w-0 max-w-full justify-between gap-2 font-normal', compact && 'gap-1 px-2', className)} aria-label={`Date range: ${label}`} title={label}>
          {!compact && <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          <span className="truncate">{shown}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Date range" className="w-64 p-1 [@media(pointer:coarse)]:w-[21rem]">
        <ul role="listbox" aria-label="Date range presets">
          {PRESET_OPTIONS.map((p) => (
            <li key={String(p.value)} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selectedPreset === p.value}
                onClick={() => choose(p.value)}
                className={cn(popupOption, 'justify-between')}
              >
                {p.label}
                {selectedPreset === p.value && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {showCustomPicker && (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selectedPreset === 'custom'}
                onClick={() => choose('custom')}
                className={cn(popupOption, 'justify-between')}
              >
                Custom range…
                {selectedPreset === 'custom' && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            </li>
          )}
        </ul>
        {showCustomPicker && selectedPreset === 'custom' && customRange && (
          <div className="mt-1 border-t border-border p-2">
            <div className="flex gap-2">
              {(['from', 'to'] as const).map((which) => (
                <Button
                  key={which}
                  type="button"
                  variant={picking === which ? 'secondary' : 'outline'}
                  size="sm"
                  className="flex-1 font-normal"
                  onClick={() => setPicking(picking === which ? null : which)}
                  aria-label={`${which === 'from' ? 'Start' : 'End'} date ${format(customRange[which], 'd MMM yyyy')}`}
                >
                  {format(customRange[which], 'd MMM yyyy')}
                </Button>
              ))}
            </div>
            {picking && (
              <Calendar
                mode="single"
                weekStartsOn={1}
                selected={customRange[picking]}
                onSelect={(d) => pick(picking, d)}
                disabled={(d) => d > appToday()}
                initialFocus
                className="pointer-events-auto p-0 pt-2"
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
