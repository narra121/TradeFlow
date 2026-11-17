import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BillingView } from '@/components/billing/BillingView';
import { usePageChrome } from '@/components/shell/chrome';
import { DataPrivacySection, ProfileSection, SecuritySection } from '@/components/profile';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { OptionsSection } from '@/components/settings/OptionsSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { useEntitlements } from '@/hooks/useEntitlements';
import { planRowText, toPlanFacts } from '@/components/billing/planState';
import { cn } from '@/lib/utils';

interface SectionDef {
  path: string;
  label: string;
  group: 'Account' | 'Journal' | 'Data' | 'Billing';
  statement: string;
  element: React.ReactNode;
  /** The plans table needs more than the 720 px reading column. */
  wide?: boolean;
}

const SECTIONS: SectionDef[] = [
  { path: 'profile', label: 'Profile', group: 'Account', statement: 'Profile — your name and email', element: <ProfileSection /> },
  { path: 'security', label: 'Sign-in & security', group: 'Account', statement: 'Sign-in & security — password and sessions', element: <SecuritySection /> },
  { path: 'preferences', label: 'Preferences', group: 'Journal', statement: 'Preferences — how TradeQut shows your data', element: <PreferencesSection /> },
  { path: 'options', label: 'Trade options', group: 'Journal', statement: 'Trade options — the lists in your trade form', element: <OptionsSection /> },
  { path: 'notifications', label: 'Notifications', group: 'Journal', statement: 'Notifications — what we email you', element: <NotificationsSection /> },
  { path: 'data', label: 'Data & privacy', group: 'Data', statement: 'Data & privacy — export, AI and deleting your account', element: <DataPrivacySection /> },
  { path: 'billing', label: 'Plan & billing', group: 'Billing', statement: 'Plan & billing — your plan, usage and invoices', element: <><h2 className="sr-only">Plan &amp; billing</h2><BillingView /></>, wide: true },
];

const GROUPS: SectionDef['group'][] = ['Account', 'Journal', 'Data', 'Billing'];

function SectionList({ planHint }: { planHint?: string }) {
  return (
    <nav aria-label="Settings" className="space-y-4">
      {GROUPS.map((g) => (
        <div key={g}>
          <p className="px-2.5 pb-1 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{g}</p>
          <ul>
            {SECTIONS.filter((s) => s.group === g).map((s) => (
              <li key={s.path}>
                <NavLink
                  to={`/app/settings/${s.path}`}
                  className={({ isActive }) => cn('relative flex min-h-8 items-center justify-between rounded-md px-2.5 text-13 hover:bg-muted max-md:min-h-11', isActive && 'bg-muted font-medium before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary')}
                >
                  {s.label}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {s.path === 'billing' && planHint}
                    <ChevronRight className="h-4 w-4 md:hidden" aria-hidden="true" />
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const PHONE_QUERY = '(max-width: 767px)';

/** Read at the first render: the section list must be the index on a phone before any effect runs, or the index would redirect first. */
function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY);
    if (!mq) return;
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

/** One Settings shell: section list + the selected section; `/app/billing` and `/app/profile` land here. */
export function SettingsView() {
  const isMobile = useIsPhone();
  const { pathname } = useLocation();
  const ent = useEntitlements();
  const planHint = planRowText(toPlanFacts(ent))?.text.replace(/ · .*/, '');
  const current = SECTIONS.find((s) => pathname === `/app/settings/${s.path}`);
  usePageChrome({ statement: current?.statement ?? 'Settings — account, journal, data and billing' });

  return (
    <Routes>
      <Route
        index
        element={isMobile ? <SectionList planHint={planHint} /> : <Navigate to="/app/settings/profile" replace />}
      />
      {SECTIONS.map((s) => (
        <Route
          key={s.path}
          path={s.path}
          element={
            <div className="grid gap-8 md:grid-cols-[208px_minmax(0,1fr)]">
              {!isMobile && <SectionList planHint={planHint} />}
              <div className={s.wide ? 'max-w-[880px]' : 'max-w-[720px]'}>
                {isMobile && (
                  <NavLink to="/app/settings" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Settings
                  </NavLink>
                )}
                {s.element}
              </div>
            </div>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/app/settings/profile" replace />} />
    </Routes>
  );
}
