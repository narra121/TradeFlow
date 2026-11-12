import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FREE_ACCOUNTS } from '@/components/billing/freeLimits';
import { readApiError } from '@/lib/apiError';
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

/** Free users above the account limit choose which accounts stay writable; the rest stay fully visible (B-111). */
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
      <ul className="space-y-1">
        {accounts.map((a) => {
          const on = selected.includes(a.id);
          const disabled = !on && selected.length >= FREE_ACCOUNTS;
          return (
            <li key={a.id}>
              <label className="flex min-h-8 cursor-pointer items-center gap-2 text-13 max-md:min-h-11">
                <Checkbox checked={on} disabled={disabled} onCheckedChange={(v) => toggle(a.id, v === true)} aria-label={`Keep ${a.name} writable`} />
                <span>{a.name}</span>
                {a.currency && <span className="font-mono text-xs text-muted-foreground">{a.currency}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="outline" disabled={!dirty || isLoading || selected.length === 0} onClick={submit}>
          {isLoading ? 'Saving…' : 'Save choice'}
        </Button>
        {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'text-13 text-error' : 'text-13 text-muted-foreground'}>{message.text}</p>}
      </div>
    </fieldset>
  );
}
