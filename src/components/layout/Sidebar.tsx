import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from '@/components/shell/navItems';
import { UserMenu } from '@/components/shell/UserMenu';

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onShowShortcuts?: () => void;
  /** Routes with an import in review show a dot. */
  importInReview?: boolean;
  /** Plan / usage card shown above the guide link when the sidebar is expanded. */
  planCard?: React.ReactNode;
}

function Item({ item, collapsed, dot }: { item: NavItem; collapsed: boolean; dot?: boolean }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-13 transition-colors',
          isActive ? 'bg-sidebar-accent font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <span className="relative">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        {dot && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.ai && <span className="ml-auto rounded-sm bg-accent/15 px-1 text-2xs font-medium text-accent-text">AI</span>}
      {!collapsed && dot && <span className="sr-only">Import in review</span>}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ collapsed, onCollapsedChange, onShowShortcuts, importInReview, planCard }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-bar hidden flex-col border-r border-sidebar-border bg-sidebar-background md:flex',
        collapsed ? 'w-14' : 'w-[232px]',
      )}
    >
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
        <div className={cn('flex h-12 shrink-0 items-center', collapsed ? 'justify-center' : 'px-4')}>
          <NavLink to="/app/dashboard" className="flex items-center gap-2 font-semibold" aria-label="TradeQut dashboard">
            <LineChart className="h-5 w-5 text-primary" aria-hidden="true" />
            {!collapsed && <span>TradeQut</span>}
          </NavLink>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {collapsed ? <div className="mx-2 mb-1 border-t border-sidebar-border" aria-hidden="true" /> : <p className="px-2.5 pb-1 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Item key={item.to} item={item} collapsed={collapsed} dot={item.to === '/app/import' && importInReview} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-sidebar-border p-2">
          {planCard}
          <Item item={SETTINGS_ITEM} collapsed={collapsed} />
          <UserMenu variant={collapsed ? 'rail' : 'full'} onShowShortcuts={onShowShortcuts} className={collapsed ? 'mx-auto' : undefined} />
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground', collapsed && 'justify-center px-0')}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden="true" /> : <ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
