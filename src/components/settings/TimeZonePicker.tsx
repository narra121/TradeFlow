import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Picker } from '@/components/ui/picker';
import { browserZone, canonicalZone, zoneList } from '@/components/settings/timeZones';

interface TimeZonePickerProps {
  id: string;
  /** Stored zone; empty means this browser's zone. */
  value: string;
  onChange: (zone: string) => void;
}

/** Type-to-filter list of IANA zones; the browser's zone reads `from this browser` and appears once. */
export function TimeZonePicker({ id, value, onChange }: TimeZonePickerProps) {
  const [open, setOpen] = useState(false);
  const here = browserZone();
  const current = canonicalZone(value || here);
  const options = useMemo(() => zoneList(current).map((z) => ({ value: z, label: z === here ? `${z} (from this browser)` : z })), [current, here]);
  const label = current === here ? `${current} (from this browser)` : current;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-8 w-full max-w-xs items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm hover:border-muted-foreground/60 max-md:h-11"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <Picker
          mode="single"
          label="Time zone"
          placeholder="Find a time zone…"
          options={options}
          value={current}
          className="w-full"
          autoFocus
          onChange={(z) => {
            setOpen(false);
            onChange(z);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
