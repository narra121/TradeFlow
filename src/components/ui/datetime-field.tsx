import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatField, parseField, toLocalValue } from '@/lib/dateTimeField';
import { cn } from '@/lib/utils';

interface DateTimeFieldProps {
  id?: string;
  /** Local `YYYY-MM-DDTHH:mm`, or empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Adds a `Now` button (the Closed field). */
  showNow?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  className?: string;
}

/**
 * Date and time in one field (D.2 `DateTimeField`, F-026): typed as `4 Nov 2026, 14:30` in a 24-hour clock and parsed on
 * blur, or picked from the calendar popover; `Now` fills the current minute. The browser's own date control is not used:
 * it follows the browser's locale and 12-hour clock.
 */
export function DateTimeField({ id, value, onChange, onBlur, showNow, className, ...aria }: DateTimeFieldProps) {
  const [text, setText] = useState(() => formatField(value));
  const [bad, setBad] = useState(false);
  const [open, setOpen] = useState(false);

  // Follow changes made elsewhere (the calendar, `Now`, a reset).
  useEffect(() => {
    setText(formatField(value));
    setBad(false);
  }, [value]);

  const commit = () => {
    const parsed = parseField(text, value);
    if (parsed === null) {
      setBad(true);
      return;
    }
    setBad(false);
    if (parsed !== value) onChange(parsed);
    else setText(formatField(value));
    onBlur?.();
  };

  const date = value ? new Date(value) : undefined;
  const time = value ? value.slice(11, 16) : '';

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="relative min-w-0 flex-1">
        <Input
          id={id}
          value={text}
          inputMode="text"
          autoComplete="off"
          placeholder="4 Nov 2026, 14:30"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className="pr-9"
          {...aria}
          aria-invalid={aria['aria-invalid'] || bad || undefined}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Pick a date" className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground">
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label="Date and time" className="w-auto p-2">
            <Calendar
              mode="single"
              className="p-1"
              selected={date}
              defaultMonth={date}
              onSelect={(d) => {
                if (!d) return;
                const keep = date ?? new Date();
                d.setHours(keep.getHours(), keep.getMinutes(), 0, 0);
                onChange(toLocalValue(d));
              }}
            />
            <label className="mt-2 flex items-center justify-between gap-2 border-t border-border px-1 pt-2 text-13">
              Time (24 h)
              <Input
                aria-label="Time, 24 hour"
                value={time}
                placeholder="14:30"
                onChange={(e) => {
                  const m = /^(\d{1,2}):(\d{2})$/.exec(e.target.value.trim());
                  if (m && value) onChange(`${value.slice(0, 11)}${m[1].padStart(2, '0')}:${m[2]}`);
                }}
                className="h-8 w-24 text-center"
              />
            </label>
          </PopoverContent>
        </Popover>
      </div>
      {showNow && (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => onChange(toLocalValue(new Date()))}>
          Now
        </Button>
      )}
      {bad && (
        <span role="status" className="sr-only">
          Not a date. Use a form like 4 Nov 2026, 14:30.
        </span>
      )}
    </div>
  );
}
