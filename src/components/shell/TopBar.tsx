import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileUp, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { HelpMenu } from '@/components/shell/HelpMenu';
import { UserMenu } from '@/components/shell/UserMenu';
import { useChromeState } from '@/components/shell/chrome';
import { titleForPath } from '@/components/shell/navItems';
import { useTradeParam } from '@/hooks/useTradeParam';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onOpenPalette: () => void;
  onShowShortcuts: () => void;
  /** Phones: title, Jump to (icon) and the avatar menu only. */
  isMobile: boolean;
}

/** First chrome row (48 px): page title, count, level-2 tabs, and the three global actions. */
export function TopBar({ onOpenPalette, onShowShortcuts, isMobile }: TopBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const trade = useTradeParam();
  const { count, tabs } = useChromeState();
  const onImport = pathname.startsWith('/app/import');

  const tabsNav =
    tabs && tabs.length > 0 ? (
      <nav aria-label="Views" className={cn('flex items-center gap-1 overflow-x-auto', isMobile ? 'h-11 border-t border-border px-3' : 'min-w-0 self-stretch')}>
        {tabs.map((t) => {
          const cls = cn(
            'relative flex shrink-0 items-center justify-center gap-1 px-2 text-13 font-medium [@media(pointer:coarse)]:min-w-11',
            isMobile ? 'h-11' : 'h-8',
            t.active
              ? cn('text-foreground after:absolute after:inset-x-1 after:h-0.5 after:bg-primary', isMobile ? 'after:bottom-0' : 'after:-bottom-[7px]')
              : 'text-muted-foreground hover:text-foreground',
          );
          return t.to ? (
            <Link key={t.id} to={t.to} aria-current={t.active ? 'page' : undefined} className={cls}>
              {t.label}
              {t.badge !== undefined && <span className="font-mono text-xs text-muted-foreground">{t.badge}</span>}
            </Link>
          ) : (
            <button key={t.id} type="button" onClick={t.onSelect} aria-pressed={t.active} className={cls}>
              {t.label}
              {t.badge !== undefined && <span className="font-mono text-xs text-muted-foreground">{t.badge}</span>}
            </button>
          );
        })}
      </nav>
    ) : null;

  return (
    <header className="sticky top-0 z-bar shrink-0 border-b border-border bg-background">
      <div className="flex h-12 items-center gap-3 px-3 md:px-6">
        <h1 className="shrink-0 text-base font-semibold outline-none" id="page-title" tabIndex={-1}>
          {titleForPath(pathname)}
        </h1>
        {count !== undefined && count !== null && <span className="shrink-0 font-mono text-13 text-muted-foreground">{count}</span>}

        {!isMobile && tabsNav}

        <div className="flex-1" />

        <Button type="button" variant="ghost" size={isMobile ? 'icon' : 'sm'} onClick={onOpenPalette} aria-keyshortcuts="Control+K Meta+K" aria-label={isMobile ? 'Jump to' : 'Jump to… Ctrl K'} className="gap-2 text-muted-foreground">
          <Search className="h-4 w-4" aria-hidden="true" />
          {!isMobile && (
            <>
              <span className="hidden xl:inline">Jump to…</span>
              <Kbd>Ctrl K</Kbd>
            </>
          )}
        </Button>
        {!isMobile && <HelpMenu onShowShortcuts={onShowShortcuts} />}
        {!isMobile && (
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => navigate('/app/import')}
            aria-current={onImport ? 'page' : undefined}
            className={cn('hidden gap-1.5 lg:inline-flex', onImport && 'bg-secondary')}
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import
          </Button>
        )}
        {!isMobile && (
          <Button type="button" onClick={() => trade.openNew()} aria-keyshortcuts="N" className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add trade
          </Button>
        )}
        {isMobile && <UserMenu variant="bar" onShowShortcuts={onShowShortcuts} />}
      </div>
      {isMobile && tabsNav}
    </header>
  );
}
