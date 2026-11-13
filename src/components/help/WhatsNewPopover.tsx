import { useMemo } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { CHANGELOG_ENTRIES, type ChangelogEntry } from '@/content/changelog/entries';
import { formatDateShort } from '@/lib/format';

interface WhatsNewPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The element the popover hangs from (the `?` button). */
  children: React.ReactNode;
  entries?: readonly ChangelogEntry[];
}

/** The three newest user-facing changelog entries (title, date, one line) and a link to all of them. */
export function WhatsNewPopover({ open, onOpenChange, children, entries = CHANGELOG_ENTRIES }: WhatsNewPopoverProps) {
  const shown = useMemo(() => entries.filter((e) => e.inApp !== false).slice(0, 3), [entries]);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent align="end" aria-label="What’s new" className="w-80 p-3">
          <h2 className="text-sm font-semibold">What’s new</h2>
          {shown.length === 0 ? (
            <p className="mt-2 text-13 text-muted-foreground">Nothing new yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {shown.map((e) => (
                <li key={e.id} className="py-2 first:pt-0">
                  <p className="flex items-baseline justify-between gap-2 text-13 font-medium">
                    <span>{e.title}</span>
                    <time dateTime={e.date} className="shrink-0 text-xs font-normal text-muted-foreground">{formatDateShort(e.date, true)}</time>
                  </p>
                  {e.changes[0] && <p className="mt-0.5 text-xs text-muted-foreground">{e.changes[0].text}</p>}
                </li>
              ))}
            </ul>
          )}
          <a href="/changelog" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
            All changes
          </a>
      </PopoverContent>
    </Popover>
  );
}
