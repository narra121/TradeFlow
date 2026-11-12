import {
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  FileUp,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  ai?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Journal',
    items: [
      { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/app/tradelog', label: 'Trades', icon: ListOrdered },
      { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/app/goals', label: 'Goals & rules', icon: Target },
      { to: '/app/insights', label: 'Insights', icon: Sparkles, ai: true },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/app/accounts', label: 'Accounts', icon: Wallet },
      { to: '/app/import', label: 'Import', icon: FileUp },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { to: '/app/settings', label: 'Settings', icon: Settings };
export const BILLING_ITEM: NavItem = { to: '/app/settings/billing', label: 'Plan & billing', icon: CreditCard };
/** Chat is a tab of Insights, not a sidebar destination. */
export const CHAT_ITEM: NavItem = { to: '/app/chat', label: 'Chat', icon: Bot, ai: true };

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), CHAT_ITEM, SETTINGS_ITEM, BILLING_ITEM];

/** Titles for routes that are not sidebar items. */
const EXTRA_TITLES: Record<string, string> = { '/app/profile': 'Settings', '/app/billing': 'Settings' };

export function titleForPath(pathname: string): string {
  if (pathname.startsWith('/app/chat')) return 'Insights';
  if (pathname.startsWith('/app/settings')) return 'Settings';
  const hit = ALL_NAV_ITEMS.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
  return hit?.label ?? EXTRA_TITLES[pathname] ?? 'TradeQut';
}

/** Routes whose scope bar shows account + period; the others show a one-line statement. */
export function isScopedPath(pathname: string): boolean {
  return ['/app/dashboard', '/app/tradelog', '/app/calendar', '/app/analytics', '/app/goals', '/app/insights'].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Primary tabs on phones; everything else lives in the "More" sheet. */
export const TAB_ITEMS = ['/app/dashboard', '/app/tradelog', '/app/calendar'] as const;
