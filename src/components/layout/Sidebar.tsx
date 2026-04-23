import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings,
  ChevronLeft,
  Zap,
  Target,
  User,
  Building2,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

const navItems: (NavItem & { shortcut?: string })[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', shortcut: '1' },
  { icon: Building2, label: 'Accounts', id: 'accounts', shortcut: '2' },
  { icon: BookOpen, label: 'Trade Log', id: 'tradelog', shortcut: '3' },
  { icon: TrendingUp, label: 'Analytics', id: 'analytics', shortcut: '4' },
  { icon: Target, label: 'Goals', id: 'goals', shortcut: '5' },
  { icon: Settings, label: 'Settings', id: 'settings', shortcut: '6' },
];

/** Conditionally wraps children in a tooltip (only when sidebar is collapsed on desktop). */
function NavTooltipWrapper({ label, shortcut, showTooltip, children }: { label: string; shortcut?: string; showTooltip: boolean; children: React.ReactElement }) {
  if (!showTooltip) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="inline-flex items-center rounded border border-border/50 bg-muted/50 px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({ activeView, onViewChange, collapsed, onCollapsedChange, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const isMobile = useIsMobile();

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileOpenChange?.(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, mobileOpen, onMobileOpenChange]);

  // Keyboard shortcuts: number keys (1-6) navigate to views when no input is focused
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= navItems.length) {
        e.preventDefault();
        onViewChange(navItems[idx - 1].id);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [onViewChange]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, mobileOpen]);

  const handleNavClick = useCallback((id: string) => {
    onViewChange(id);
    // Auto-close sidebar on mobile when a nav item is clicked
    if (isMobile) {
      onMobileOpenChange?.(false);
    }
  }, [onViewChange, isMobile, onMobileOpenChange]);

  // Determine if sidebar content should show expanded (not icon-only)
  const showExpanded = isMobile ? true : !collapsed;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => onMobileOpenChange?.(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50 overflow-hidden",
          // Mobile: full-width drawer, translated off-screen by default
          isMobile
            ? cn("w-[280px] transition-transform duration-300 ease-in-out", mobileOpen ? "translate-x-0" : "-translate-x-full")
            // Desktop/tablet: normal collapsed/expanded behavior
            : collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
       <TooltipProvider delayDuration={0}>
        {/* Logo */}
        <div className={cn(
          "h-16 flex items-center border-b border-sidebar-border",
          !showExpanded && !isMobile ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!showExpanded && !isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onCollapsedChange(false)}
                  className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow cursor-pointer"
                  aria-label="Expand sidebar"
                >
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Expand sidebar</span>
                <kbd className="ml-2 inline-flex items-center rounded border border-border/50 bg-muted/50 px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                  ⌘ [
                </kbd>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground tracking-tight">
                  TradeQut
                </span>
              </div>
              {isMobile ? (
                <button
                  onClick={() => onMobileOpenChange?.(false)}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onCollapsedChange(true)}
                      className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                      aria-label="Collapse sidebar"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <span>Collapse sidebar</span>
                    <kbd className="ml-2 inline-flex items-center rounded border border-border/50 bg-muted/50 px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                      ⌘ [
                    </kbd>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <li key={item.id}>
                  <NavTooltipWrapper label={item.label} shortcut={item.shortcut} showTooltip={!showExpanded}>
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "hover:bg-sidebar-accent",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 shrink-0",
                        isActive && "text-sidebar-primary"
                      )} />
                      {showExpanded && (
                        <span className="font-medium whitespace-nowrap">{item.label}</span>
                      )}
                      {isActive && showExpanded && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </button>
                  </NavTooltipWrapper>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section - Profile & Expand */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {/* Guide Link */}
          <NavTooltipWrapper label="User Guide" showTooltip={!showExpanded}>
            <a
              href="/guide"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                !showExpanded && "justify-center",
              )}
            >
              <HelpCircle className="w-5 h-5 shrink-0" />
              {showExpanded && (
                <span className="font-medium whitespace-nowrap">Guide</span>
              )}
            </a>
          </NavTooltipWrapper>

          {/* Profile Button */}
          <NavTooltipWrapper label="Profile" showTooltip={!showExpanded}>
            <button
              onClick={() => handleNavClick('profile')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent",
                !showExpanded && "justify-center",
                activeView === 'profile'
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              <User className={cn(
                "w-5 h-5 shrink-0",
                activeView === 'profile' && "text-sidebar-primary"
              )} />
              {showExpanded && (
                <span className="font-medium whitespace-nowrap">Profile</span>
              )}
              {activeView === 'profile' && showExpanded && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </button>
          </NavTooltipWrapper>

        </div>
       </TooltipProvider>
      </aside>
    </>
  );
}
