import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, CircleHelp, CreditCard, Keyboard, LifeBuoy, LogOut, MessageSquare, Settings, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContactSupportDialog, FeedbackDialog } from '@/components/help';
import { useLogout } from '@/components/auth/useLogout';
import { useGetProfileQuery } from '@/store/api';
import { cn } from '@/lib/utils';

function initials(name?: string, email?: string): string {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

interface UserMenuProps {
  onShowShortcuts?: () => void;
  /** `rail` shows only the avatar; `bar` is the compact top-bar variant. */
  variant?: 'full' | 'rail' | 'bar';
  className?: string;
}

export function UserMenu({ onShowShortcuts, variant = 'full', className }: UserMenuProps) {
  const navigate = useNavigate();
  const { data: profile } = useGetProfileQuery();
  const { requestLogout, dialog: logoutDialog } = useLogout();
  const [dialog, setDialog] = useState<'support' | 'feedback' | null>(null);
  const name = (profile as { name?: string } | undefined)?.name;
  const email = (profile as { email?: string } | undefined)?.email;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('flex h-10 items-center gap-2 rounded-md px-1.5 text-left text-sm hover:bg-muted [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11', variant === 'full' && 'w-full', className)}
          aria-label={variant === 'full' ? undefined : `Account menu${name ? `, ${name}` : ''}`}
        >
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">{variant === 'full' ? initials(name, email) : <User className="h-4 w-4" aria-hidden="true" />}</span>
          {variant === 'full' && (
            <>
              <span className="min-w-0 flex-1 truncate">{name || email || 'Account'}</span>
              <span className="sr-only">, account menu</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={variant === 'full' ? 'top' : 'bottom'} className="w-56">
        {email && <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{email}</div>}
        <DropdownMenuItem onSelect={() => navigate('/app/settings/profile')}>
          <User className="mr-2 h-4 w-4" aria-hidden="true" /> Profile
        </DropdownMenuItem>
        {variant === 'bar' && (
          <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate('/app/settings/billing')}>
          <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" /> Plan &amp; billing
        </DropdownMenuItem>
        {variant === 'bar' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/guide" className="flex w-full items-center">
                <CircleHelp className="mr-2 h-4 w-4" aria-hidden="true" /> Guide
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('support')}>
              <LifeBuoy className="mr-2 h-4 w-4" aria-hidden="true" /> Contact support
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('feedback')}>
              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" /> Send feedback
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {onShowShortcuts && variant !== 'bar' && (
          <DropdownMenuItem onSelect={onShowShortcuts}>
            <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" /> Keyboard shortcuts
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={requestLogout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ContactSupportDialog open={dialog === 'support'} onOpenChange={(o) => !o && setDialog(null)} />
      <FeedbackDialog open={dialog === 'feedback'} onOpenChange={(o) => !o && setDialog(null)} />
      {logoutDialog}
    </DropdownMenu>
  );
}
