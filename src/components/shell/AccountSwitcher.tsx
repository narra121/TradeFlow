import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAccounts } from '@/hooks/useAccounts';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TradingAccount } from '@/types/trade';

export function currenciesOf(accounts: TradingAccount[]): string[] {
  return [...new Set(accounts.filter((a) => a.status === 'active').map((a) => a.currency || 'USD'))];
}

/** The single global account scope: persisted (tq.scope) and applied on every screen. */
export function AccountSwitcher({ className }: { className?: string }) {
  const { accounts, selectedAccountId, selectedAccount, setSelectedAccountId } = useAccounts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showOther, setShowOther] = useState(false);

  const active = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts]);
  const other = useMemo(() => accounts.filter((a) => a.status !== 'active'), [accounts]);
  const q = query.trim().toLowerCase();
  const match = (a: TradingAccount) => !q || a.name.toLowerCase().includes(q) || a.broker?.toLowerCase().includes(q);
  const currencies = currenciesOf(accounts);

  const label = selectedAccount ? `${selectedAccount.name} · ${selectedAccount.currency || 'USD'}` : 'All accounts';

  const choose = (id: string | null) => {
    setSelectedAccountId(id);
    setOpen(false);
    setQuery('');
  };

  const row = (id: string | null, name: string, meta: string, trailing?: string) => (
    <li key={id ?? 'all'}>
      <button
        type="button"
        onClick={() => choose(id)}
        aria-current={selectedAccountId === id || (id === null && !selectedAccountId) ? 'true' : undefined}
        className="flex min-h-9 w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted [@media(pointer:coarse)]:min-h-11"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate">{name}</span>
          {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
        </span>
        {trailing && <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{trailing}</span>}
        {(selectedAccountId === id || (id === null && !selectedAccountId)) && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
      </button>
    </li>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('max-w-[220px] justify-between gap-2 font-normal', className)} aria-label={`Account: ${label}`}>
          <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        {accounts.length > 7 && (
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts…" aria-label="Search accounts" className="mb-2" />
        )}
        <ul aria-label="Accounts">
          {!q && row(null, 'All accounts', currencies.length > 1 ? `${currencies.join(' + ')} — money is shown per currency` : currencies[0] ?? '')}
          {active.filter(match).map((a) => row(a.id, a.name, `${a.broker || 'No broker'} · ${a.currency || 'USD'}`, formatMoney(a.balance, a.currency)))}
        </ul>
        {other.length > 0 && (
          <div className="mt-1 border-t border-border pt-1">
            <button type="button" className="flex h-8 w-full items-center justify-between px-2 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowOther((v) => !v)} aria-expanded={showOther}>
              Other ({other.length})
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showOther && 'rotate-180')} aria-hidden="true" />
            </button>
            {showOther && <ul aria-label="Other accounts">{other.filter(match).map((a) => row(a.id, a.name, `${a.status} · ${a.currency || 'USD'}`))}</ul>}
          </div>
        )}
        <div className="mt-1 border-t border-border pt-1">
          <Link to="/app/accounts" onClick={() => setOpen(false)} className="flex h-9 items-center rounded px-2 text-sm text-primary hover:bg-muted">
            Manage accounts →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
