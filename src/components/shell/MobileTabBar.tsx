import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, CircleHelp, LayoutDashboard, LifeBuoy, ListOrdered, MessageSquare, MoreHorizontal, Plus, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContactSupportDialog, FeedbackDialog } from '@/components/help';
import { ALL_NAV_ITEMS, TAB_ITEMS } from '@/components/shell/navItems';
import { guideLink } from '@/content/guideAnchors';
import { cn } from '@/lib/utils';

const TABS = [
  { to: TAB_ITEMS[0], label: 'Home', icon: LayoutDashboard },
  { to: TAB_ITEMS[1], label: 'Trades', icon: ListOrdered },
  { to: TAB_ITEMS[2], label: 'Calendar', icon: CalendarDays },
];

interface MobileTabBarProps {
  onAddTrade: () => void;
}

const tabClass = 'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]';

/** Primary navigation under 768 px: three destinations, add, and a "More" sheet for the rest. */
export function MobileTabBar({ onAddTrade }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [dialog, setDialog] = useState<'support' | 'feedback' | null>(null);
  const navigate = useNavigate();
  const rest = ALL_NAV_ITEMS.filter((i) => !(TAB_ITEMS as readonly string[]).includes(i.to));

  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar-background pb-safe md:hidden">
        {TABS.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(tabClass, isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={onAddTrade} className={cn(tabClass, 'text-foreground')} aria-label="Add trade">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
        {TABS.slice(2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(tabClass, isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className={cn(tabClass, 'text-muted-foreground')} aria-haspopup="dialog">
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto pb-safe">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="mt-2">
            {rest.map(({ to, label, icon: Icon, ai }) => (
              <li key={to}>
                <button
                  type="button"
                  data-prefetch={to}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(to);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-muted"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  {label}
                  {ai && <span className="rounded bg-accent/15 px-1 text-[11px] font-medium text-accent-text">AI</span>}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                data-prefetch="/app/settings/profile"
                onClick={() => {
                  setMoreOpen(false);
                  navigate('/app/settings/profile');
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-muted"
              >
                <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Profile
              </button>
            </li>
          </ul>
          <p id="more-help" className="mt-2 border-t border-border px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">Help</p>
          <ul aria-labelledby="more-help">
            <li>
              <a href={guideLink('')} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-sm hover:bg-muted">
                <CircleHelp className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Guide
              </a>
            </li>
            <li>
              <button type="button" onClick={() => { setMoreOpen(false); setDialog('support'); }} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-muted">
                <LifeBuoy className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Contact support
              </button>
            </li>
            <li>
              <button type="button" onClick={() => { setMoreOpen(false); setDialog('feedback'); }} className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left text-sm hover:bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> Send feedback
              </button>
            </li>
            <li>
              <a href="/status" className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-sm hover:bg-muted">
                <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> System status
              </a>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
      <ContactSupportDialog open={dialog === 'support'} onOpenChange={(o) => !o && setDialog(null)} />
      <FeedbackDialog open={dialog === 'feedback'} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  );
}
