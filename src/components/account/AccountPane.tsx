import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PaneFrame } from '@/components/calendar/SidePane';
import { currencyOptions } from '@/components/account/currencies';
import { accountStatusLabels, accountTypeLabels } from '@/hooks/useAccounts';
import { useOnline } from '@/hooks/useOnline';
import { fromAccount, validateAccount, type AccountPayload, type Errors, type FormState } from '@/components/account/accountForm';
import type { AccountStatus, AccountType, TradingAccount } from '@/types/trade';

const formId = 'account-pane-form';

interface AccountPaneProps {
  account?: TradingAccount | null;
  saving: boolean;
  /** Server-side failure of the last save, shown under the footer. */
  saveError?: string | null;
  onSubmit: (payload: AccountPayload) => void;
  onRequestClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** The account pane: add (`?account=new`) or edit (`?account=<id>`) in the same pane anatomy as the trade pane. */
export const AccountPane = forwardRef<HTMLHeadingElement, AccountPaneProps>(function AccountPane({ account, saving, saveError, onSubmit, onRequestClose, onDirtyChange }, headingRef) {
  const initial = useMemo(() => fromAccount(account), [account]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const isEdit = !!account;
  const online = useOnline();

  useEffect(() => {
    setForm(initial);
    setErrors({});
    setTouched(new Set());
  }, [initial]);

  const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const blur = (k: keyof Errors) => {
    setTouched((t) => new Set(t).add(k));
    const next = validateAccount(form);
    setErrors((e) => ({ ...e, [k]: next[k] }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateAccount(form);
    setErrors(next);
    setTouched(new Set(['name', 'broker', 'initialBalance']));
    if (Object.values(next).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${formId} [aria-invalid="true"]`)?.focus());
      return;
    }
    const start = Number(form.initialBalance.trim().replace(/,/g, ''));
    onSubmit({
      name: form.name.trim(),
      // The backend needs a broker; the first-run form uses the same default.
      broker: form.broker.trim() || 'Other',
      type: form.type,
      status: form.status,
      initialBalance: start,
      // The server recomputes the current balance from trades; a new account starts at its starting balance.
      balance: account ? account.balance : start,
      currency: form.currency,
      notes: form.notes.trim() || undefined,
    });
  };

  const err = (k: keyof Errors) => (touched.has(k) ? errors[k] : undefined);

  return (
    <PaneFrame
      ref={headingRef}
      title={isEdit ? `Edit ${account!.name}` : 'New account'}
      closeLabel="Close account"
      onClose={onRequestClose}
      footer={
        <div className="space-y-2">
          {!online && <p className="text-xs text-muted-foreground">You’re offline. Changes can’t be saved until you reconnect.</p>}
          {saveError && <p role="alert" className="text-xs text-destructive">{saveError}</p>}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={onRequestClose} disabled={saving} className="[@media(pointer:coarse)]:h-11">Cancel</Button>
            <Button type="submit" form={formId} disabled={saving || !online} className="[@media(pointer:coarse)]:h-11">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save changes' : 'Add account'}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4 p-4">
        <Field label="Name" required error={err('name')}>
          {(a) => <Input {...a} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')} placeholder="FTMO 100K" maxLength={100} />}
        </Field>
        <Field label="Broker" error={err('broker')}>
          {(a) => <Input {...a} value={form.broker} onChange={(e) => set('broker', e.target.value)} onBlur={() => blur('broker')} placeholder="FTMO" maxLength={100} />}
        </Field>
        <Field label="Type">
          {(a) => (
            <Select value={form.type} onValueChange={(v) => set('type', v as AccountType)}>
              <SelectTrigger id={a.id}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(accountTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" required hint={isEdit ? undefined : 'Sets how this account’s P&L is shown.'}>
            {(a) => (
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger id={a.id}><SelectValue /></SelectTrigger>
                <SelectContent>{currencyOptions(form.currency).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Starting balance" required error={err('initialBalance')}>
            {(a) => <Input {...a} inputMode="decimal" value={form.initialBalance} onChange={(e) => set('initialBalance', e.target.value)} onBlur={() => blur('initialBalance')} placeholder="100000.00" className="font-mono" />}
          </Field>
        </div>
        <Field label="Status">
          {(a) => (
            <Select value={form.status} onValueChange={(v) => set('status', v as AccountStatus)}>
              <SelectTrigger id={a.id}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(accountStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </Field>
        <Field label="Notes">
          {(a) => <Textarea {...a} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />}
        </Field>
      </form>
    </PaneFrame>
  );
});
