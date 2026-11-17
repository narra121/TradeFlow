import { useEffect, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { appToday } from '@/lib/appTimeZone';
import { formatField, parseField } from '@/lib/dateTimeField';

interface ExpiryFieldProps {
  id?: string;
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** `04 Nov 2026`: `formatField` without its `, 00:00`. */
const show = (value: string) => (value ? formatField(`${value}T00:00`).slice(0, -7) : '');

/** A date without a time (an option's expiry), typed like `DateTimeField` (`4 Nov 2026`, `04/11/2026` day first) or picked from the calendar. */
export function ExpiryField({ id, value, onChange, onBlur, ...aria }: ExpiryFieldProps) {
  const [text, setText] = useState(() => show(value));
  const [bad, setBad] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(show(value));
    setBad(false);
  }, [value]);

  const commit = () => {
    const parsed = parseField(text, value ? `${value}T00:00` : '');
    if (parsed === null) {
      setBad(true);
      return;
    }
    setBad(false);
    const day = parsed.slice(0, 10);
    if (day !== value) onChange(day);
    else setText(show(value));
    onBlur?.();
  };

  const date = value ? new Date(`${value}T00:00`) : undefined;

  return (
    <div className="relative min-w-0">
      <Input
        id={id}
        value={text}
        inputMode="text"
        autoComplete="off"
        placeholder="e.g. 26 Nov 2026"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        className="pr-9 [@media(pointer:coarse)]:pr-11"
        {...aria}
        aria-invalid={aria['aria-invalid'] || bad || undefined}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Pick the expiry date" className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground [@media(pointer:coarse)]:w-11">
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" aria-label="Expiry date" className="w-auto p-2">
          <Calendar
            mode="single"
            className="p-1"
            selected={date}
            defaultMonth={date ?? appToday()}
            today={appToday()}
            onSelect={(d) => {
              if (!d) return;
              onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {bad && (
        <span role="status" className="sr-only">
          Not a date. Use a form like 26 Nov 2026.
        </span>
      )}
    </div>
  );
}
