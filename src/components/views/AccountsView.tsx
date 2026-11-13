import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable, type DataColumn, type DataGroup } from '@/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AccountPane } from '@/components/account/AccountPane';
import type { AccountPayload } from '@/components/account/accountForm';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { returnFocusByName } from '@/components/account/returnFocus';
import { SidePaneLayout } from '@/components/calendar/SidePane';
import { WritableAccounts } from '@/components/billing/WritableAccounts';
import { FREE_ACCOUNTS } from '@/components/billing/freeLimits';
import { ScopeBarSlot, usePageChrome } from '@/components/shell/chrome';
import { accountStatusLabels, accountTypeLabels } from '@/hooks/useAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useCreateAccountMutation, useDeleteAccountMutation, useGetAccountsQuery, useUpdateAccountMutation, useUpdateAccountStatusMutation } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedAccount } from '@/store/slices/accountsSlice';
import { lastTradeText, netSinceStart, sortAccounts, statusSummary, totalsByCurrency, type AccountSortId } from '@/components/account/accountStats';
import { readOnlyAccountIds } from '@/lib/accountWritable';
import { emitPlanSignal } from '@/lib/planErrors';
import { readApiError } from '@/lib/apiError';
import { formatCount, formatDateShort, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AccountStatus, AccountType, TradingAccount } from '@/types/trade';

const STATUSES: AccountStatus[] = ['active', 'passed', 'breached', 'withdrawn', 'inactive'];
const CONFIRM_STATUS: AccountStatus[] = ['breached', 'withdrawn'];

export function AccountsView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedAccountId = useAppSelector((s) => s.accounts.selectedAccountId);
  const { data, isLoading, isError, error, refetch } = useGetAccountsQuery();
  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateAccountMutation();
  const [deleteAccount, { isLoading: deletingNow }] = useDeleteAccountMutation();
  const [updateStatus] = useUpdateAccountStatusMutation();
  const ent = useEntitlements();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const accounts = useMemo(() => data?.accounts ?? [], [data]);

  const [sort, setSort] = useState<{ id: AccountSortId; dir: 'asc' | 'desc' }>({ id: 'name', dir: 'asc' });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set(['other']));
  const [find, setFind] = useState('');
  const [deleting, setDeleting] = useState<TradingAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const returnName = useRef<string | null>(null);
  const [statusAsk, setStatusAsk] = useState<{ account: TradingAccount; status: AccountStatus } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);

  const limited = !!ent.plan && !ent.can('unlimited_accounts');
  const atLimit = limited && accounts.length >= FREE_ACCOUNTS;
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const readOnlyIds = useMemo(() => readOnlyAccountIds(accounts, ent.writableAccountIds), [accounts, ent.writableAccountIds]);

  usePageChrome({
    statement: `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'} · ${activeCount} active${limited ? ` · ${Math.min(accounts.length, FREE_ACCOUNTS)} of ${FREE_ACCOUNTS} on Free` : ''}`,
  });

  // `?account=new` or `?account=<id>`; `?new=1` is the link the activation panel uses.
  const paneParam = params.get('account') ?? (params.get('new') === '1' ? 'new' : null);
  const editing = paneParam && paneParam !== 'new' ? accounts.find((a) => a.id === paneParam) ?? null : null;
  const paneOpen = paneParam === 'new' || (!!paneParam && (isLoading || !!editing));

  const setPane = useCallback(
    (value: string | null, replace = false) => {
      const next = new URLSearchParams(params);
      next.delete('new');
      if (value) next.set('account', value);
      else next.delete('account');
      setParams(next, { replace });
    },
    [params, setParams],
  );

  const closePane = useCallback(() => {
    setDirty(false);
    setLeaveAsk(false);
    setSaveError(null);
    setPane(null, true);
  }, [setPane]);
  const requestClose = useCallback(() => (dirty ? setLeaveAsk(true) : closePane()), [dirty, closePane]);

  useEffect(() => {
    if (paneOpen) headingRef.current?.focus({ preventScroll: true });
  }, [paneOpen, paneParam]);

  const addAccount = () => {
    if (atLimit) {
      emitPlanSignal({ kind: 'mutation', code: 'PLAN_REQUIRED', feature: 'unlimited_accounts', message: `You have ${accounts.length} of ${FREE_ACCOUNTS} accounts on Free. Pro has no account limit.` });
      return;
    }
    setPane('new');
  };

  const save = async (payload: AccountPayload) => {
    setSaveError(null);
    try {
      // The server keeps the balance from the trades (and moves it when the starting balance changes), so an edit never sends it.
      if (editing) await updateAccount({ id: editing.id, payload: { ...payload, balance: undefined } }).unwrap();
      else await createAccount(payload).unwrap();
      closePane();
    } catch (e) {
      const err = readApiError(e);
      setSaveError(err.status === 402 ? null : `Couldn’t save the account. ${err.message}`);
    }
  };

  const changeStatus = async (a: TradingAccount, status: AccountStatus) => {
    try {
      await updateStatus({ id: a.id, status }).unwrap();
      toast(`${a.name} marked ${accountStatusLabels[status].toLowerCase()}`);
    } catch {
      // the failure is reported by the toast middleware
    }
  };

  const askStatus = (a: TradingAccount, status: AccountStatus) => {
    returnName.current = `Actions for ${a.name}`;
    setStatusAsk({ account: a, status });
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteAccount(deleting.id).unwrap();
      if (selectedAccountId === deleting.id) dispatch(setSelectedAccount(null));
      setDeleting(null);
    } catch (e) {
      setDeleteError(`Couldn’t delete the account. ${readApiError(e).message}`);
    }
  };

  const viewJournal = (a: TradingAccount) => {
    const previous = selectedAccountId;
    dispatch(setSelectedAccount(a.id));
    navigate('/app/dashboard');
    toast(`Showing ${a.name}`, { action: { label: 'Undo', onClick: () => dispatch(setSelectedAccount(previous)) } });
  };

  const needle = find.trim().toLowerCase();
  const visible = useMemo(() => accounts.filter((a) => !needle || a.name.toLowerCase().includes(needle) || (a.broker ?? '').toLowerCase().includes(needle)), [accounts, needle]);
  const groups: DataGroup<TradingAccount>[] = useMemo(() => {
    const active = sortAccounts(visible.filter((a) => a.status === 'active'), sort.id, sort.dir);
    const other = sortAccounts(visible.filter((a) => a.status !== 'active'), sort.id, sort.dir);
    const out: DataGroup<TradingAccount>[] = [{ key: 'active', label: `Active · ${active.length}`, rows: active }];
    if (other.length) out.push({ key: 'other', label: `Other · ${other.length}`, rows: other, meta: statusSummary(other, accountStatusLabels) });
    return out;
  }, [visible, sort]);
  const totals = useMemo(() => totalsByCurrency(visible.filter((a) => a.status === 'active')), [visible]);
  const rows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  const onSort = (id: string) => setSort((s) => (s.id === id ? { id: s.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id: id as AccountSortId, dir: id === 'name' || id === 'broker' ? 'asc' : 'desc' }));

  const columns: DataColumn<TradingAccount>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{a.name}{a.status !== 'active' && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{accountStatusLabels[a.status]}</span>}</span>
          <span className="flex items-baseline gap-1.5 text-xs text-muted-foreground sm:hidden">
            <Money value={netSinceStart(a).amount} currency={a.currency} className="text-xs" />
            {netSinceStart(a).pct !== null && <span className="font-mono">{formatPercent(netSinceStart(a).pct, 1, { sign: true })}</span>}
          </span>
          {readOnlyIds.has(a.id) && <span className="text-xs text-warning">Read-only on Free</span>}
        </span>
      ),
    },
    { id: 'broker', header: 'Broker', sortable: true, hideBelow: 'md', cell: (a) => <span className="text-foreground-soft">{a.broker}</span> },
    { id: 'type', header: 'Type', hideBelow: 'lg', cell: (a) => <span className="text-foreground-soft">{accountTypeLabels[a.type as AccountType] ?? a.type}</span> },
    { id: 'currency', header: 'Cur', hideBelow: 'sm', cell: (a) => <span className="font-mono text-xs text-foreground-soft">{a.currency}</span> },
    { id: 'balance', header: 'Balance', align: 'right', sortable: true, cell: (a) => <Money value={a.balance} currency={a.currency} sign={false} neutral /> },
    {
      id: 'net',
      header: 'Net since start',
      align: 'right',
      sortable: true,
      hideBelow: 'sm',
      cell: (a) => {
        const n = netSinceStart(a);
        return (
          <span className="inline-flex items-baseline gap-1.5">
            <Money value={n.amount} currency={a.currency} />
            {n.pct !== null && <span className="font-mono text-xs text-muted-foreground">{formatPercent(n.pct, 1, { sign: true })}</span>}
          </span>
        );
      },
    },
    { id: 'trades', header: 'Trades', align: 'right', sortable: true, hideBelow: 'md', cell: (a) => <span className="font-mono tabular-nums">{a.tradeCount === undefined ? '—' : formatCount(a.tradeCount)}</span> },
    {
      id: 'last',
      header: 'Last trade',
      sortable: true,
      hideBelow: 'lg',
      cell: (a) => {
        const day = a.lastTradeDate;
        return <span className="text-foreground-soft" title={day ? formatDateShort(day, true) : undefined}>{lastTradeText(day)}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      srHeader: true,
      align: 'right',
      cell: (a) => (
        <span className="flex items-center justify-end gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => viewJournal(a)} aria-label={`View journal for ${a.name}`} className="max-sm:hidden">View journal</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${a.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => viewJournal(a)} className="sm:hidden">View journal</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPane(a.id)}>Edit</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Set status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {STATUSES.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => (s === a.status ? undefined : CONFIRM_STATUS.includes(s) ? askStatus(a, s) : void changeStatus(a, s))} aria-checked={s === a.status} role="menuitemradio">
                      <span className="mr-2 flex h-4 w-4 items-center justify-center text-primary" aria-hidden="true">{s === a.status && <Check className="h-4 w-4" />}</span>{accountStatusLabels[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { returnName.current = `Actions for ${a.name}`; setDeleteError(null); setDeleting(a); }} variant="destructive">Delete…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const deleteTrades = deleting ? deleting.tradeCount ?? null : 0;

  const body = () => {
    if (isError) return <ErrorState title="Couldn’t load your accounts." description="Try again." error={error} onRetry={() => void refetch()} />;
    if (isLoading) return <div className="space-y-1.5" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>;
    if (accounts.length === 0) {
      return <EmptyState title="Create your first trading account." description="Trades belong to an account, which also sets the currency of your P&L." action={<Button size="sm" onClick={addAccount}>Add account</Button>} />;
    }
    if (visible.length === 0) return <EmptyState title="No account matches that." action={<Button size="sm" variant="outline" onClick={() => setFind('')}>Clear search</Button>} />;
    return (
      <div className="space-y-3">
        {limited && accounts.length > FREE_ACCOUNTS && ent.writableAccountIds && (
          <WritableAccounts accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))} chosen={ent.writableAccountIds} />
        )}
        <div className="overflow-x-auto">
          <DataTable
            caption="Trading accounts"
            rows={rows}
            columns={columns}
            getRowId={(a) => a.id}
            sort={{ id: sort.id, dir: sort.dir }}
            onSort={onSort}
            groups={groups}
            collapsed={collapsed}
            onToggleGroup={(k) => setCollapsed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
            openId={paneParam}
            rowClassName={(a) => cn('h-11', selectedAccountId === a.id && 'bg-[hsl(var(--row-selected))]')}
          />
        </div>
        {totals.length > 0 && (
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border pt-3 text-13" aria-label="Totals of active accounts">
            <dt className="text-muted-foreground">Totals, active accounts</dt>
            {totals.map((t) => (
              <dd key={t.currency} className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs text-muted-foreground">{t.currency}</span>
                <Money value={t.balance} currency={t.currency} sign={false} neutral />
                <span className="text-muted-foreground">(<Money value={t.net} currency={t.currency} />)</span>
              </dd>
            ))}
          </dl>
        )}
      </div>
    );
  };

  return (
    <div>
      {atLimit && (
        <ScopeBarSlot side="left">
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-13" onClick={() => navigate('/app/settings/billing')}>Upgrade for unlimited accounts</Button>
        </ScopeBarSlot>
      )}
      <ScopeBarSlot side="right">
        {accounts.length > 10 && (
          <>
            <label htmlFor="find-account" className="sr-only">Find account</label>
            <Input id="find-account" data-page-find value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find account" className="h-7 w-44 text-xs" />
          </>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addAccount}>
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Add account
        </Button>
      </ScopeBarSlot>

      <SidePaneLayout
        open={paneOpen}
        label={editing ? `Edit ${editing.name}` : 'New account'}
        minMain={760}
        onClose={requestClose}
        pane={
          <AccountPane
            ref={headingRef}
            key={paneParam ?? 'none'}
            account={editing}
            saving={creating || updating}
            saveError={saveError}
            onSubmit={(p) => void save(p)}
            onRequestClose={requestClose}
            onDirtyChange={setDirty}
          />
        }
      >
        {body()}
      </SidePaneLayout>

      <DeleteAccountDialog
        account={deleting}
        tradeCount={deleteTrades}
        busy={deletingNow}
        returnFocusTo={returnName.current ?? undefined}
        error={deleteError}
        onCancel={() => setDeleting(null)}
        onMarkInactive={() => { if (deleting) { void changeStatus(deleting, 'inactive'); setDeleting(null); } }}
        onConfirm={() => void confirmDelete()}
      />

      <AlertDialog open={!!statusAsk} onOpenChange={(o) => !o && setStatusAsk(null)}>
        <AlertDialogContent onCloseAutoFocus={(e) => returnFocusByName(returnName.current, e)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {statusAsk?.account.name} as {statusAsk ? accountStatusLabels[statusAsk.status].toLowerCase() : ''}?</AlertDialogTitle>
            <AlertDialogDescription>The account moves to Other and stays fully visible. You can set it back to Active at any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <Button type="button" onClick={() => { if (statusAsk) void changeStatus(statusAsk.account, statusAsk.status); setStatusAsk(null); }}>Mark {statusAsk ? accountStatusLabels[statusAsk.status].toLowerCase() : ''}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveAsk} onOpenChange={(o) => !o && setLeaveAsk(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes to {editing?.name ?? 'this account'}?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes in the account form.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Keep editing</AlertDialogCancel>
            <Button type="button" variant="outline" onClick={closePane}>Discard</Button>
            <Button type="submit" form="account-pane-form" onClick={() => setLeaveAsk(false)}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
