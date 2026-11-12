import { useMemo } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ExternalLink } from 'lucide-react';
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
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor asChild>{children}</PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          aria-label="What’s new"
          className="z-popover w-80 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
        >
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
          <a href="/changelog" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
            All changes <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
