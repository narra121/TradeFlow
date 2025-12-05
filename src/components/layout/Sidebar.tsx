import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: BookOpen, label: 'Trade Log', id: 'trades' },
  { icon: TrendingUp, label: 'Analytics', id: 'analytics' },
  { icon: Calendar, label: 'Calendar', id: 'calendar' },
  { icon: Target, label: 'Goals', id: 'goals' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground tracking-tight">
              TradeFlow
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
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
                  {!collapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - Profile & Collapse */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Profile Button */}
        <button
          onClick={() => onViewChange('profile')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent",
            activeView === 'profile'
              ? "bg-sidebar-accent text-sidebar-primary" 
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
          )}
        >
          <User className={cn(
            "w-5 h-5 shrink-0",
            activeView === 'profile' && "text-sidebar-primary"
          )} />
          {!collapsed && (
            <span className="font-medium">Profile</span>
          )}
          {activeView === 'profile' && !collapsed && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
          )}
        </button>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
