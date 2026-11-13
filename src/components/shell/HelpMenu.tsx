import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContactSupportDialog, FeedbackDialog, WhatsNewPopover, appVersion, useWhatsNew } from '@/components/help';
import { guideLink } from '@/content/guideAnchors';

interface HelpMenuProps {
  onShowShortcuts: () => void;
  /** Shown for users who have not finished setup (E-073). */
  gettingStarted?: () => void;
}

/** `?` in the top bar: guide for this page, shortcuts, what's new, support, feedback, status. */
export function HelpMenu({ onShowShortcuts, gettingStarted }: HelpMenuProps) {
  const [dialog, setDialog] = useState<'support' | 'feedback' | null>(null);
  const [newsOpen, setNewsOpen] = useState(false);
  // The menu returns focus to its button as it closes, which would dismiss a popover opened at the same time.
  const openNewsOnClose = useRef(false);
  const { unseen, markSeen } = useWhatsNew();
  const { pathname } = useLocation();
  const page = pathname.split('/')[2] ?? '';

  return (
    <>
      <WhatsNewPopover
        open={newsOpen}
        onOpenChange={(o) => {
          setNewsOpen(o);
          if (o) markSeen();
        }}
      >
        <span className="inline-flex">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={unseen ? 'Help, new updates' : 'Help'} className="relative">
                <CircleHelp className="h-4 w-4" aria-hidden="true" />
                {unseen && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              onCloseAutoFocus={(e) => {
                if (!openNewsOnClose.current) return;
                e.preventDefault();
                openNewsOnClose.current = false;
                setNewsOpen(true);
                markSeen();
              }}
            >
              {gettingStarted && <DropdownMenuItem onSelect={gettingStarted}>Getting started</DropdownMenuItem>}
              <DropdownMenuItem asChild>
                <a href={guideLink(page)}>Guide</a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onShowShortcuts}>Keyboard shortcuts</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => (openNewsOnClose.current = true)}>
                What&apos;s new {unseen && <span className="ml-auto h-2 w-2 rounded-full bg-primary" aria-label="new" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialog('support')}>Contact support</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog('feedback')}>Send feedback</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/status">System status</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Version {appVersion()}</div>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </WhatsNewPopover>

      <ContactSupportDialog open={dialog === 'support'} onOpenChange={(o) => !o && setDialog(null)} />
      <FeedbackDialog open={dialog === 'feedback'} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  );
}
