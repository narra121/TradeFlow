import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, CalendarRange, CircleHelp, Copy, FileUp, Keyboard, LogOut, Palette, Plus, Rows3, Search, Settings, Table2, UserPlus, type LucideIcon } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command';
import { ALL_NAV_ITEMS } from '@/components/shell/navItems';
import { patchUiState } from '@/hooks/useUiState';
import { BUILT_IN_VIEWS, loadCustomViews } from '@/lib/savedViews';
import { useLogout } from '@/components/auth/useLogout';
import { useAccounts } from '@/hooks/useAccounts';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useAppDispatch } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { accountCurrency, formatDateShort, formatMoney } from '@/lib/format';
import { keyEntry } from '@/lib/keymap';
import { pushRecent, readRecent, saveRecent } from '@/lib/paletteRecent';
import { getDateRangeFromPreset, PRESET_OPTIONS } from '@/lib/scope';
import type { Trade } from '@/types/trade';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Loaded trades (newest first); the palette searches them by symbol or date. */
  trades?: Trade[];
  onShowShortcuts?: () => void;
}

interface Command {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Words people type for this command besides its label. */
  keywords?: string[];
  /** Id in `lib/keymap.ts`: its keys are shown as a hint. */
  keymapId?: string;
  run: () => void;
}

const NAV_KEYWORDS: Record<string, string[]> = {
  '/app/dashboard': ['home', 'overview', 'today'],
  '/app/tradelog': ['journal', 'log', 'list', 'table'],
  '/app/calendar': ['month', 'days', 'heatmap'],
  '/app/analytics': ['stats', 'performance', 'edge', 'report'],
  '/app/goals': ['rules', 'limits', 'targets'],
  '/app/insights': ['ai', 'review', 'chat', 'report'],
  '/app/accounts': ['broker', 'balance', 'prop'],
  '/app/import': ['upload', 'csv', 'broker file', 'screenshot'],
  '/app/settings': ['preferences', 'profile', 'billing', 'plan', 'security'],
};

export function CommandPalette({ open, onOpenChange, trades = [], onShowShortcuts }: CommandPaletteProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const trade = useTradeParam();
  const { accounts, setSelectedAccountId } = useAccounts();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecent);
  const { requestLogout, dialog: logoutDialog } = useLogout();
  const last = trades[0];
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const groups = useMemo(() => {
    const actions: Command[] = [
      { id: 'add-trade', label: 'Add trade', keymapId: 'new-trade', icon: Plus, keywords: ['new', 'log', 'create', 'record'], run: () => trade.openNew() },
      ...(last ? [{ id: 'trade-from-last', label: `New trade from last (${last.symbol})`, icon: Copy, keywords: ['duplicate', 'copy', 'repeat'], run: () => trade.openNew({ from: last.id }) }] : []),
      { id: 'import', label: 'Import trades', icon: FileUp, keywords: NAV_KEYWORDS['/app/import'], run: () => navigate('/app/import') },
    ];
    const goTo: Command[] = ALL_NAV_ITEMS.filter((i) => i.to !== '/app/chat').map(({ to, label, icon }) => ({ id: `go-${to}`, label: `Go to ${label}`, icon, keywords: NAV_KEYWORDS[to], run: () => navigate(to) }));
    const period: Command[] = PRESET_OPTIONS.map((p) => ({
      id: `period-${p.value}`,
      label: `Period: ${p.label}`,
      icon: CalendarRange,
      keywords: ['change period', 'date range', 'time'],
      run: () => {
        const r = getDateRangeFromPreset(p.value);
        dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(r.from), endDate: formatLocalDateOnly(r.to), datePreset: p.value }));
      },
    }));
    const account: Command[] =
      accounts.length > 0
        ? [
            { id: 'account-all', label: 'Switch account: All accounts', keywords: ['change account', 'scope'], run: () => setSelectedAccountId(null) },
            ...accounts.map((a) => ({ id: `account-${a.id}`, label: `Switch account: ${a.name} · ${a.currency || 'USD'}`, keywords: ['change account', 'scope'], run: () => setSelectedAccountId(a.id) })),
          ]
        : [];
    const settings: Command[] = [
      ['profile', 'Profile'],
      ['security', 'Sign-in & security'],
      ['preferences', 'Preferences'],
      ['options', 'Trade options'],
      ['notifications', 'Notifications'],
      ['data', 'Data & privacy'],
      ['billing', 'Plan & billing'],
    ].map(([path, label]) => ({ id: `settings-${path}`, label: `Settings: ${label}`, icon: Settings, keywords: ['preferences', 'account', path], run: () => navigate(`/app/settings/${path}`) }));
    const analytics: Command[] = [
      ['overview', 'Overview'],
      ['edge', 'Edge'],
      ['timing', 'Timing'],
      ['risk', 'Risk'],
      ['behaviour', 'Behaviour'],
      ['tax', 'Tax'],
    ].map(([tab, label]) => ({ id: `analytics-${tab}`, label: `Analytics: ${label}`, icon: Table2, keywords: ['stats', 'report'], run: () => navigate(tab === 'overview' ? '/app/analytics' : `/app/analytics?tab=${tab}`) }));
    const views: Command[] = [...BUILT_IN_VIEWS, ...loadCustomViews()].map((v) => ({ id: `view-${v.id}`, label: `Trades view: ${v.name}`, icon: Rows3, keywords: ['saved view', 'filter'], run: () => navigate(`/app/tradelog?view=${encodeURIComponent(v.id)}`) }));
    const more: Command[] = [
      { id: 'add-account', label: 'Add account', icon: UserPlus, keywords: ['new account', 'broker', 'prop'], run: () => navigate('/app/accounts?new=1') },
      { id: 'generate-report', label: 'Generate report', icon: Palette, keywords: ['insights', 'ai', 'review'], run: () => navigate('/app/insights') },
      { id: 'density-compact', label: 'Density: compact rows', icon: Rows3, keywords: ['table', 'rows', 'tight'], run: () => patchUiState({ density: 'compact' }) },
      { id: 'density-comfortable', label: 'Density: comfortable rows', icon: Rows3, keywords: ['table', 'rows', 'spacious'], run: () => patchUiState({ density: 'comfortable' }) },
      { id: 'pnl-cb', label: 'P&L colours: colour-blind safe', icon: Palette, keywords: ['colour blind', 'color blind', 'blue', 'orange', 'profit', 'loss'], run: () => patchUiState({ pnlPalette: 'cb' }) },
      { id: 'pnl-default', label: 'P&L colours: green and red', icon: Palette, keywords: ['profit', 'loss', 'default'], run: () => patchUiState({ pnlPalette: 'default' }) },
      {
        id: 'log-out',
        label: 'Log out',
        icon: LogOut,
        keywords: ['sign out', 'logout', 'exit'],
        run: () => {
          requestLogout();
        },
      },
    ];
    const help: Command[] = [
      ...(onShowShortcuts ? [{ id: 'help-shortcuts', label: 'Keyboard shortcuts', keymapId: 'shortcuts', icon: Keyboard, keywords: ['help', 'keys', 'hotkeys'], run: onShowShortcuts }] : []),
      { id: 'help-guide', label: 'Open the guide', icon: CircleHelp, keywords: ['help', 'docs', 'how to'], run: () => navigate('/guide') },
      { id: 'help-status', label: 'System status', icon: Activity, keywords: ['help', 'outage', 'incident'], run: () => navigate('/status') },
    ];
    return [
      { heading: 'Actions', items: actions },
      { heading: 'Go to', items: goTo },
      { heading: 'Scope', items: [...period, ...account] },
      { heading: 'Views', items: views },
      { heading: 'Settings', items: settings },
      { heading: 'Analytics', items: analytics },
      { heading: 'More', items: more },
      { heading: 'Help', items: help },
    ];
  }, [trade, last, navigate, dispatch, accounts, setSelectedAccountId, onShowShortcuts, requestLogout]);

  // Trades are searched only once two characters are typed: at most 8, then a way to see them all in Trades.
  const q = query.trim().toLowerCase();
  const tradeMatches = useMemo(
    () => (q.length < 2 ? [] : trades.filter((t) => `${t.symbol} ${formatDateShort(t.exitDate || t.entryDate)} ${t.id}`.toLowerCase().includes(q))),
    [q, trades],
  );
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const recentCommands = recent.map((id) => all.find((c) => c.id === id)).filter((c): c is Command => !!c);

  const run = (c: Command) => () => {
    const next = pushRecent(recent, c.id);
    setRecent(next);
    saveRecent(next);
    onOpenChange(false);
    c.run();
  };
  const item = (c: Command, key = c.id) => (
    <CommandItem key={key} value={key === c.id ? c.label : `recent ${c.label}`} keywords={c.keywords} onSelect={run(c)}>
      {c.icon && <c.icon className="mr-2 h-4 w-4" aria-hidden="true" />} {c.label}
      {c.keymapId && keyEntry(c.keymapId) && <CommandShortcut>{keyEntry(c.keymapId)?.keys.join(' ')}</CommandShortcut>}
    </CommandItem>
  );

  return (
    <>
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setQuery('');
        onOpenChange(o);
      }}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Go to a screen, add a trade, open a trade…" aria-label="Search commands" />
      <CommandList>
        <CommandEmpty>
          <span>No results for “{query.trim()}”.</span>
          {q.length >= 1 && (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 text-sm text-primary hover:underline"
              onClick={() => {
                onOpenChange(false);
                navigate(`/app/tradelog?find=${encodeURIComponent(query.trim())}`);
              }}
            >
              <Search className="h-4 w-4" aria-hidden="true" /> Search trades for “{query.trim()}”
            </button>
          )}
        </CommandEmpty>
        {!query && recentCommands.length > 0 && <CommandGroup heading="Recent">{recentCommands.map((c) => item(c, `recent-${c.id}`))}</CommandGroup>}
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <CommandGroup key={g.heading} heading={g.heading}>
                {g.items.map((c) => item(c))}
              </CommandGroup>
            ),
        )}
        {tradeMatches.length > 0 && (
          <CommandGroup heading="Open trade">
            {tradeMatches.slice(0, 8).map((t) => {
              const account = t.accountId ? accountById.get(t.accountId) : undefined;
              const currency = account ? accountCurrency(account) : undefined;
              return (
                <CommandItem
                  key={t.id}
                  value={`open trade ${t.symbol} ${formatDateShort(t.exitDate || t.entryDate)} ${t.id}`}
                  onSelect={() => {
                    onOpenChange(false);
                    trade.openTrade(t.id);
                  }}
                >
                  <span className="font-medium">{t.symbol}</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatDateShort(t.exitDate || t.entryDate)} · {formatMoney(t.pnl, currency, { sign: true })}
                  </span>
                </CommandItem>
              );
            })}
            {tradeMatches.length > 8 && (
              <CommandItem
                value={`show all in trades ${q}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(`/app/tradelog?find=${encodeURIComponent(query.trim())}`);
                }}
              >
                <Search className="mr-2 h-4 w-4" aria-hidden="true" /> Show all {tradeMatches.length} in Trades
              </CommandItem>
            )}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
    {logoutDialog}
    </>
  );
}
