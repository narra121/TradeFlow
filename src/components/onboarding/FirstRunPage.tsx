import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencyOptions } from '@/components/account/currencies';
import { usePageChrome } from '@/components/shell/chrome';
import { fallbackName } from '@/components/auth/passwordRules';
import { setPendingImportFile } from '@/components/onboarding/pendingImport';
import { useGettingStarted } from '@/components/onboarding/useGettingStarted';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useTradeParam } from '@/hooks/useTradeParam';
import { IMPORT_SOURCES } from '@/content/product-facts';
import { importFlow } from '@/lib/importFlowStore';
import { readApiError } from '@/lib/apiError';
import { useCreateAccountMutation, useGetAccountsQuery } from '@/store/api/accountsApi';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface FirstRunPageProps {
  /** Trades in the whole journal; the page is for 0. */
  tradeCount?: number;
}

const ACCEPT = '.csv,.xlsx,.xls,.html,.htm,.png,.jpg,.jpeg,.webp';

const sourceNames = IMPORT_SOURCES.filter((s) => s.id !== 'generic_csv').map((s) => s.name);

function StepHeading({ n, title, done, hint }: { n: number; title: string; done: boolean; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium', done ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong text-muted-foreground')}
        aria-hidden="true"
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">
          {title}
          <span className="sr-only">{`. Step ${n} of 3, ${done ? 'done' : 'not done'}`}</span>
        </h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** The first-run page that replaces the dashboard until an account and a trade exist: three optional steps, progress derived from data (E-073). */
export function FirstRunPage({ tradeCount = 0 }: FirstRunPageProps) {
  const navigate = useNavigate();
  const trade = useTradeParam();
  const ent = useEntitlements();
  const gs = useGettingStarted(tradeCount);
  const accounts = useGetAccountsQuery();
  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const profile = useProfile();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<string>(ent.currency);
  const currencyChosen = useRef(false);
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState<{ name?: string; balance?: string; form?: string }>({});
  const [announce, setAnnounce] = useState('');
  const [heldFile, setHeldFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [callName, setCallName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dropZone = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const step = Math.min(3, gs.done + 1);
  usePageChrome({ statement: `Set up your journal · step ${step} of 3` });
  // The billing currency is only a default: it must not replace what the user picked once entitlements resolve.
  useEffect(() => {
    if (!currencyChosen.current) setCurrency(ent.currency);
  }, [ent.currency]);

  // Signup stores the email's local part as the name until the user says otherwise.
  const needsName = !nameSaved && !profile.isLoading && !!profile.email && (!profile.hasName || profile.name === fallbackName(profile.email));
  const firstAccount = accounts.data?.accounts[0];

  const handOff = (file: File | null, accountId?: string) => {
    if (accountId) importFlow.set({ accountId });
    setPendingImportFile(file);
    navigate('/app/import');
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(balance.replace(/[,\s]/g, ''));
    const next = {
      name: name.trim() ? undefined : 'Enter an account name.',
      balance: balance.trim() === '' || !Number.isFinite(amount) || amount < 0 ? 'Enter the starting balance, 0 or more.' : undefined,
    };
    setErrors(next);
    if (next.name || next.balance) return;
    try {
      const account = await createAccount({ name: name.trim(), broker: 'Other', type: 'personal', status: 'active', balance: amount, initialBalance: amount, currency }).unwrap();
      setAnnounce('Account created');
      if (heldFile) return handOff(heldFile, account.id);
      window.setTimeout(() => dropZone.current?.focus(), 0);
    } catch (err) {
      setErrors({ form: readApiError(err, "Couldn't create the account.").message });
    }
  };

  const takeFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!gs.hasAccount) {
      setHeldFile(file);
      formRef.current?.querySelector('input')?.focus();
      return;
    }
    handOff(file, firstAccount?.id);
  };

  const saveName = async () => {
    if (!callName.trim()) return;
    try {
      await profile.saveName(callName);
      setNameSaved(true);
    } catch {
      // the field stays so the user can retry
    }
  };

  const trial = ent.plan === 'trial' ? `Free trial: ${ent.trialDaysLeft ?? 0} ${ent.trialDaysLeft === 1 ? 'day' : 'days'} left. No card on file.` : '';

  return (
    <div className="max-w-[880px] space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Set up your journal</h2>
        {trial && <p className="text-13 text-muted-foreground">{trial}</p>}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {needsName && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="What should we call you?" className="w-64">
            {(a) => <Input {...a} value={callName} onChange={(e) => setCallName(e.target.value)} autoComplete="name" />}
          </Field>
          <Button type="button" variant="outline" disabled={!callName.trim() || profile.isSaving} onClick={saveName}>
            Save
          </Button>
        </div>
      )}

      <ol className="divide-y divide-border rounded-lg border border-border bg-card">
        <li className="space-y-3 p-4">
          <StepHeading n={1} title="Create your trading account" done={gs.hasAccount} hint={gs.hasAccount ? undefined : 'Broker and type can be added later in Accounts.'} />
          {!gs.hasAccount && (
            <form ref={formRef} onSubmit={submitAccount} noValidate className={cn('space-y-3 pl-8', heldFile && 'rounded-md ring-1 ring-primary')}>
              {heldFile && <p role="status" className="text-13">Create an account first — your file is kept.</p>}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_minmax(0,160px)_auto] sm:items-start">
                <Field label="Name" error={errors.name} required>
                  {(a) => <Input {...a} value={name} onChange={(e) => setName(e.target.value)} placeholder="FTMO 100K" autoComplete="off" className="[@media(pointer:coarse)]:h-11" />}
                </Field>
                <Field label="Currency">
                  {(a) => (
                    <Select value={currency} onValueChange={(c) => { currencyChosen.current = true; setCurrency(c); }}>
                      <SelectTrigger id={a.id} className="[@media(pointer:coarse)]:h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>{currencyOptions(currency).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </Field>
                <Field label="Starting balance" error={errors.balance} required>
                  {(a) => <Input {...a} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="100000.00" className="text-right font-mono [@media(pointer:coarse)]:h-11" />}
                </Field>
                <Button type="submit" disabled={creating} className="sm:mt-[22px] [@media(pointer:coarse)]:h-11">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Create account
                </Button>
              </div>
              {errors.form && <p role="alert" className="text-13 text-error">{errors.form}</p>}
            </form>
          )}
        </li>

        <li className="space-y-3 p-4">
          <StepHeading n={2} title="Get your trades in" done={gs.hasTrade} hint={gs.hasAccount ? undefined : 'Available after step 1'} />
          <div className="grid gap-3 pl-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); takeFile(e.dataTransfer.files?.[0]); }}
              className={cn('rounded-md border border-dashed p-4 text-13', dragging ? 'border-primary bg-primary/5' : 'border-border-strong')}
            >
              <button ref={dropZone} type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-8 items-center gap-2 rounded-sm font-medium text-primary hover:underline max-md:min-h-11">
                <Upload className="h-4 w-4" aria-hidden="true" /> Choose files
              </button>
              <span className="text-muted-foreground"> or drop a broker export or screenshots here</span>
              <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-label="Choose a broker file or screenshots" onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }} />
              <p className="mt-1 text-xs text-muted-foreground">{`${sourceNames.join(' · ')} · any CSV`}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">or</span>
              <Button type="button" variant="outline" disabled={!gs.hasAccount} onClick={() => trade.openNew()}>
                Add a trade manually
              </Button>
            </div>
          </div>
        </li>

        <li className="space-y-3 p-4">
          <StepHeading n={3} title="Set a weekly goal and your rules" done={gs.hasGoalOrRule} hint="Optional" />
          <div className="pl-8">
            <Button asChild variant="outline">
              <Link to="/app/goals">Open goals</Link>
            </Button>
          </div>
        </li>
      </ol>
    </div>
  );
}
