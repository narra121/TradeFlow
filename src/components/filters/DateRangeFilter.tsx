import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export type DatePreset = 'thisWeek' | 'thisMonth' | 7 | 30 | 60 | 90 | 365 | 'all' | 'custom';

interface DateRangeFilterProps {
  selectedPreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  customRange?: { from: Date; to: Date };
  onCustomRangeChange?: (range: { from: Date; to: Date }) => void;
  showCustomPicker?: boolean;
}

export function DateRangeFilter({
  selectedPreset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  showCustomPicker = false,
}: DateRangeFilterProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const daysPresets: { value: DatePreset; label: string }[] = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
    { value: 'all', label: 'All time' },
  ];

  const periodPresets: { value: DatePreset; label: string }[] = [
    { value: 'thisWeek', label: 'This week' },
    { value: 'thisMonth', label: 'This month' },
  ];

  const handleFromSelect = (date: Date | undefined) => {
    if (date && onCustomRangeChange && customRange) {
      onCustomRangeChange({ from: date, to: customRange.to });
      setFromOpen(false);
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date && onCustomRangeChange && customRange) {
      onCustomRangeChange({ from: customRange.from, to: date });
      setToOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
        <span className="px-2 text-sm text-muted-foreground">Last</span>
        {daysPresets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onPresetChange(preset.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              selectedPreset === preset.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
        {showCustomPicker && (
          <button
            onClick={() => onPresetChange('custom')}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              selectedPreset === 'custom'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Custom
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
        {periodPresets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onPresetChange(preset.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              selectedPreset === preset.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showCustomPicker && selectedPreset === 'custom' && customRange && (
        <div className="flex items-center gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal gap-2",
                  !customRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {customRange.from ? format(customRange.from, "MMM d, yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.from}
                onSelect={handleFromSelect}
                disabled={(date) => date > new Date() || date > customRange.to}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal gap-2",
                  !customRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {customRange.to ? format(customRange.to, "MMM d, yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.to}
                onSelect={handleToSelect}
                disabled={(date) => date > new Date() || date < customRange.from}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
}

export function getDateRangeFromPreset(preset: DatePreset, customRange?: { from: Date; to: Date }): { from: Date; to: Date } {
  const now = new Date();
  if (preset === 'custom' && customRange) {
    return customRange;
  }
  if (preset === 'all') {
    // All time: start from Jan 1, 2000 to cover any possible trade date
    return { from: new Date('2000-01-01'), to: now };
  }
  if (preset === 'thisWeek') {
    // Start from the beginning of this week (Sunday)
    return { from: startOfWeek(now), to: now };
  }
  if (preset === 'thisMonth') {
    // Start from the beginning of this month
    return { from: startOfMonth(now), to: now };
  }
  const days = typeof preset === 'number' ? preset : 30;
  return { from: subDays(now, days), to: now };
}
