import { useEffect, useState } from 'react';
import { ACCOUNT_SEARCH_FROM, AccountListbox } from '@/components/account/AccountListbox';
import { Button } from '@/components/ui/button';
import { FREE_ACCOUNTS } from '@/components/billing/freeLimits';
import { readApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useSaveWritableAccountsMutation } from '@/store/api/billingApi';

interface AccountLite {
  id: string;
  name: string;
  currency?: string;
}

interface WritableAccountsProps {
  accounts: AccountLite[];
  /** Server's current choice; null/empty until the user chooses. */
  chosen: string[] | null;
}

/**
 * Free users above the account limit choose which accounts stay writable; the rest stay fully visible (B-111).
 * The list scrolls inside the panel and the chosen accounts stay on top, so Save is reachable with any number of accounts.
 */
export function WritableAccounts({ accounts, chosen }: WritableAccountsProps) {
  const [selected, setSelected] = useState<string[]>(chosen ?? []);
  const [save, { isLoading }] = useSaveWritableAccountsMutation();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const chosenKey = (chosen ?? []).join(',');
  useEffect(() => setSelected(chosen ?? []), [chosenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string, on: boolean) => {
    setMessage(null);
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  };
  const full = selected.length >= FREE_ACCOUNTS;
  // Shorter on short screens, so the panel and Save fit under the page chrome without scrolling the page.
  // A list long enough to search keeps one height, so Save does not move while the search narrows it.
  const listHeight = accounts.length >= ACCOUNT_SEARCH_FROM ? 'h-[clamp(15rem,calc(100dvh-37rem),21rem)] max-h-none' : 'max-h-[clamp(15rem,calc(100dvh-37rem),21rem)]';
  const dirty = selected.slice().sort().join(',') !== (chosen ?? []).slice().sort().join(',');

  const submit = async () => {
    try {
      await save(selected).unwrap();
      setMessage({ kind: 'ok', text: 'Saved. The other accounts are read-only on Free.' });
    } catch (e) {
      setMessage({ kind: 'error', text: readApiError(e, "Couldn't save your choice. Try again.").message });
    }
  };

  return (
    <fieldset className="rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{`Choose the ${FREE_ACCOUNTS} accounts you keep adding trades to`}</legend>
      <p className="mb-3 text-13 text-muted-foreground">The other accounts read “Read-only on Free” and stay fully visible. Pro makes them all writable again.</p>
      <AccountListbox
        label="Accounts that stay writable"
        selectedLabel="Stay writable"
        accounts={accounts}
        selected={selected}
        multiple
        max={FREE_ACCOUNTS}
        onToggle={toggle}
        className="max-w-xl"
        listClassName={cn('rounded-md border border-border bg-card', listHeight)}
      />
      {message?.kind === 'error' ? (
        <p role="alert" className="mt-1.5 min-h-4 text-xs text-error">{message.text}</p>
      ) : (
        <p role="status" className="mt-1.5 min-h-4 text-xs text-muted-foreground">{message?.text ?? (full ? 'Untick one to choose a different account.' : '')}</p>
      )}
      <Button type="button" variant="outline" className="mt-2" disabled={!dirty || isLoading || selected.length === 0} onClick={submit}>
        {isLoading ? 'Saving…' : 'Save choice'}
      </Button>
    </fieldset>
  );
}
