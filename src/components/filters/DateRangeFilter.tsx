import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export type DatePreset = 7 | 30 | 60 | 90 | 'custom';

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

  const presets: { value: DatePreset; label: string }[] = [
    { value: 7, label: 'Last 7 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 60, label: 'Last 60 Days' },
    { value: 90, label: 'Last 90 Days' },
  ];

  if (showCustomPicker) {
    presets.push({ value: 'custom', label: 'Custom' });
  }

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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
        {presets.map((preset) => (
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
    </div>
  );
}

export function getDateRangeFromPreset(preset: DatePreset, customRange?: { from: Date; to: Date }): { from: Date; to: Date } {
  const now = new Date();
  if (preset === 'custom' && customRange) {
    return customRange;
  }
  const days = typeof preset === 'number' ? preset : 30;
  return { from: subDays(now, days), to: now };
}
