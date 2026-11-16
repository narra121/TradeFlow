import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextEnhancerButton } from '@/components/ui/text-enhancer-button';
import { AccountSelect } from '@/components/account/AccountSelect';
import { DynamicSelect } from '@/components/trade/DynamicSelect';
import { SmartInput } from '@/components/trade/SmartInput';
import { copy } from '@/copy';
import { DateTimeField } from '@/components/ui/datetime-field';
import { useOnline } from '@/hooks/useOnline';
import { MistakeTagsInput } from '@/components/trade/MistakeTagsInput';
import { BrokenRulesSelect } from '@/components/trade/BrokenRulesSelect';
import { ImageUploader } from '@/components/trade/ImageUploader';
import {
  emptyForm,
  formFromTrade,
  fromLocalInput,
  imagesKey,
  LIMITS,
  parseNum,
  serverFieldErrors,
  validateForm,
  type FormErrors,
  type TradeFormState,
} from '@/components/trade/tradeFormState';
import { useAccounts } from '@/hooks/useAccounts';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useUiState } from '@/hooks/useUiState';
import { useCreateTradeMutation, useUpdateTradeMutation } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { trackFirstTrade } from '@/lib/analytics';
import { readApiError } from '@/lib/apiError';
import { formatDurationMinutes, formatMoney, formatR, signOf } from '@/lib/format';
import { patchTradePayload } from '@/lib/patchTrade';
import { ASSET_CLASSES, computePreview, defaultLotSize, needsLotSize, outcomeForPnl, pnlConflictsWithOutcome, quantityLabel } from '@/lib/tradePreview';
import { cn } from '@/lib/utils';
import type { CreateTradePayload } from '@/lib/api';
import type { AssetClass, Trade, TradeImage, TradeOutcome } from '@/types/trade';

export interface TradeFormHandle {
  /** Resolves to true only when the trade was saved; false for a validation error, a failed save or a screenshot still uploading. */
  submit: (opts?: { addAnother?: boolean }) => Promise<boolean>;
  isDirty: () => boolean;
}

interface TradeFormProps {
  mode: 'new' | 'edit';
  initialTrade?: Trade | null;
  /** New mode only: prefilled day and duplicate source. */
  date?: string | null;
  from?: Trade | null;
  /** Account ids used when the form opens (scope account, last used, first active). */
  defaultAccountIds: string[];
  onSaved: (saved: Trade | null, opts: { addAnother: boolean }) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const OUTCOMES: { value: TradeOutcome; label: string }[] = [
  { value: 'TP', label: 'TP hit' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'SL', label: 'SL hit' },
  { value: 'BREAKEVEN', label: 'Breakeven' },
];

const LAST_ASSET_KEY = 'tq.lastAssetClass';
const draftKeyFor = (mode: 'new' | 'edit', id?: string) => (mode === 'new' ? 'tq.draft.new' : `tq.draft.${id}`);

function stripImages(f: TradeFormState): Omit<TradeFormState, 'images'> {
  const { images: _images, ...rest } = f;
  return rest;
}

const formKey = (f: TradeFormState) => JSON.stringify(stripImages(f)) + imagesKey(f.images);

/** An image id that is an S3 key (every uploaded screenshot) is also sent as `key`, which the API needs to attach a new upload. */
const imagePayload = ({ id, url, timeframe, description }: TradeImage): TradeImage & { key?: string } => ({
  id,
  ...(id.startsWith('images/') ? { key: id } : {}),
  ...(url?.startsWith('data:') ? { url } : {}),
  timeframe,
  description,
});

export const TradeForm = forwardRef<TradeFormHandle, TradeFormProps>(function TradeForm(
  { mode, initialTrade, date, from, defaultAccountIds, onSaved, onCancel, onDirtyChange },
  ref,
) {
  const { accounts } = useAccounts();
  const online = useOnline();
  const { options, addSymbol, addStrategy, addSession, addMarketCondition, addMistake, addTag, addTimeframe, removeTimeframe } = useSavedOptions();
  const { rules } = useTradingRules();
  const [ui, setUi] = useUiState();
  const [createTrade] = useCreateTradeMutation();
  const [updateTrade] = useUpdateTradeMutation();
  const userId = useAppSelector((s) => s.auth.user?.id);

  const initial = useMemo<TradeFormState>(() => {
    if (mode === 'edit' && initialTrade) return formFromTrade(initialTrade);
    const last = (() => {
      try {
        return localStorage.getItem(LAST_ASSET_KEY) as AssetClass | null;
      } catch {
        return null;
      }
    })();
    return emptyForm({ accountIds: defaultAccountIds, date, from, assetClass: last ?? undefined });
  }, [mode, initialTrade, defaultAccountIds, date, from]);

  const draftKey = draftKeyFor(mode, initialTrade?.id);
  const { draft, save: saveDraft, clear: clearDraft } = useFormDraft(draftKey);
  const [form, setForm] = useState<TradeFormState>(() => (draft ? { ...initial, ...(draft as Partial<TradeFormState>), images: initial.images } : initial));
  const [restoredAt, setRestoredAt] = useState<string | null>(() => (draft ? 'earlier' : null));
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TradeFormState, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const symbolRef = useRef<HTMLInputElement>(null);
  const baseline = useRef(formKey(initial));
  const inFlight = useRef<Promise<boolean> | null>(null);
  // One key per create request body: a repeat of the same body returns the trade already created instead of a second one.
  const attempt = useRef<{ key: string; body: string } | null>(null);

  const set = useCallback(<K extends keyof TradeFormState>(key: K, value: TradeFormState[K]) => setForm((f) => ({ ...f, [key]: value })), []);

  const dirty = formKey(form) !== baseline.current;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // Closing or reloading the tab with unsaved edits asks first (F-029).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (dirty) saveDraft(stripImages(form));
  }, [form, dirty, saveDraft]);

  useEffect(() => {
    if (mode === 'new') symbolRef.current?.focus();
  }, [mode]);

  // Accounts load after the form mounts: preselect the scope account once they are known.
  useEffect(() => {
    if (mode === 'new' && defaultAccountIds.length > 0) {
      setForm((f) => (f.accountIds.length === 0 && !draft ? { ...f, accountIds: defaultAccountIds } : f));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, defaultAccountIds]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const primaryAccount = accountsById.get(form.accountIds[0] ?? '') ?? null;
  const accountCurrency = primaryAccount?.currency ?? null;

  const preview = useMemo(
    () =>
      computePreview({
        direction: form.direction,
        entryPrice: parseNum(form.entryPrice),
        exitPrice: parseNum(form.exitPrice),
        stopLoss: parseNum(form.stopLoss),
        takeProfit: parseNum(form.takeProfit),
        quantity: parseNum(form.quantity),
        lotSize: parseNum(form.lotSize),
        fees: parseNum(form.fees),
        assetClass: form.assetClass,
        symbol: form.symbol,
        accountCurrency,
        entryTime: fromLocalInput(form.entryTime),
        exitTime: fromLocalInput(form.exitTime),
      }),
    [form, accountCurrency],
  );

  const manual = form.manualPnl.trim() !== '';
  const netPnl: number | null = manual ? parseNum(form.manualPnl) : preview.net;
  const displayPnl = manual ? form.manualPnl : preview.net !== null ? preview.net.toFixed(2) : '';
  const [editingPnl, setEditingPnl] = useState(false);

  // The outcome follows the P&L sign until the user picks one; a win that closed short of its target is Partial, so the
  // chip agrees with the debrief's "closed before the target".
  const exitNum = parseNum(form.exitPrice);
  const targetNum = parseNum(form.takeProfit);
  const shortOfTarget = exitNum !== null && targetNum !== null && targetNum > 0 && (form.direction === 'LONG' ? exitNum < targetNum : exitNum > targetNum);
  useEffect(() => {
    if (form.outcomeTouched) return;
    const byPnl = outcomeForPnl(netPnl);
    const next = byPnl === 'TP' && shortOfTarget ? 'PARTIAL' : byPnl;
    if (next && next !== form.outcome) setForm((f) => ({ ...f, outcome: next }));
  }, [netPnl, shortOfTarget, form.outcomeTouched, form.outcome]);

  const conflict = pnlConflictsWithOutcome(netPnl, form.outcome);
  const warnings = [...preview.warnings, ...(conflict ? ['P&L sign conflicts with the outcome.'] : [])];

  const setAssetClass = (value: AssetClass) => {
    setForm((f) => ({ ...f, assetClass: value, lotSize: String(defaultLotSize(value) ?? '') }));
    try {
      localStorage.setItem(LAST_ASSET_KEY, value);
    } catch {
      // not persisted
    }
  };

  const validate = useCallback(
    (f: TradeFormState) =>
      validateForm(f, {
        hasAccounts: accounts.length > 0,
        pnlAvailable: f.manualPnl.trim() !== '' || preview.net !== null,
      }),
    [accounts.length, preview.net],
  );

  const blur = (key: keyof TradeFormState) => {
    setTouched((t) => ({ ...t, [key]: true }));
    // Validate the latest form: a date field commits its text in the same blur, after this render's `form` was read.
    setForm((f) => {
      setErrors(validate(f));
      return f;
    });
  };
  // A field shows its error once the user has left it or tried to save; one blur does not flag the untouched fields.
  const err = (key: keyof TradeFormState) => (touched[key] ? errors[key] : undefined);

  const buildPayload = (): CreateTradePayload => {
    const entry = parseNum(form.entryPrice) ?? 0;
    const sl = parseNum(form.stopLoss) ?? 0;
    const tp = parseNum(form.takeProfit) ?? 0;
    const risk = Math.abs(entry - sl);
    const entryDate = (fromLocalInput(form.entryTime) ?? new Date()).toISOString();
    const exitDate = (fromLocalInput(form.exitTime) ?? new Date()).toISOString();
    const gross = preview.gross ?? undefined;
    const existingNews = mode === 'edit' ? initialTrade?.newsEvents ?? [] : [];
    const news = form.newsEvent.trim();
    // PUT removes a stored optional field only on an explicit null; a new trade has nothing to remove.
    const cleared = mode === 'edit' ? null : undefined;
    return {
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction,
      size: parseNum(form.quantity) ?? 0,
      entryPrice: entry,
      exitPrice: parseNum(form.exitPrice) ?? 0,
      stopLoss: sl,
      takeProfit: tp,
      entryDate,
      exitDate,
      outcome: form.outcome,
      pnl: netPnl ?? 0,
      riskRewardRatio: sl > 0 && risk > 0 && tp > 0 ? Math.abs(tp - entry) / risk : 0,
      strategy: form.strategy,
      session: form.session,
      marketCondition: form.marketCondition,
      newsEvents: news ? Array.from(new Set([news, ...existingNews])) : existingNews,
      mistakes: form.mistakes,
      keyLesson: form.keyLesson,
      notes: form.notes,
      images: form.images.map(imagePayload),
      tags: form.tags,
      accountIds: form.accountIds.length > 0 ? form.accountIds : undefined,
      brokenRuleIds: form.brokenRuleIds,
      assetClass: form.assetClass,
      contractMultiplier: needsLotSize(form.assetClass) && parseNum(form.lotSize) ? (parseNum(form.lotSize) as number) : cleared,
      fees: parseNum(form.fees) ?? cleared,
      ...(gross !== undefined ? { grossPnl: gross } : {}),
      ...(form.assetClass === 'options'
        ? { optionType: form.optionType === '' ? undefined : form.optionType, strike: parseNum(form.strike) ?? undefined, expiry: form.expiry || undefined, underlying: form.symbol.trim().toUpperCase() }
        : { optionType: cleared, strike: cleared, expiry: form.assetClass === 'futures' && form.expiry ? form.expiry : cleared, underlying: cleared }),
    };
  };

  const save = async (opts: { addAnother?: boolean }): Promise<boolean> => {
    if (uploading) {
      setSaveError('Wait for the screenshots to finish uploading.');
      return false;
    }
    const next = validate(form);
    setErrors(next);
    setTouched(Object.fromEntries(Object.keys(next).map((k) => [k, true])));
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => (formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildPayload();
      let saved: Trade | null = null;
      if (mode === 'new') {
        const body = JSON.stringify(payload);
        if (attempt.current?.body !== body) attempt.current = { key: crypto.randomUUID(), body };
        const created = await createTrade({ ...payload, idempotencyKey: attempt.current.key }).unwrap();
        saved = created[0] ?? null; // one trade per selected account; the pane opens the first
        attempt.current = null;
        if (userId) trackFirstTrade(userId);
      } else if (initialTrade) {
        const res = await updateTrade({ id: initialTrade.id, payload: patchTradePayload(initialTrade, payload) }).unwrap();
        saved = res.updatedTrade;
      }
      clearDraft();
      baseline.current = formKey(form);
      onDirtyChange?.(false);
      // The saved trade is on screen afterwards, except when the form stays open for the next one (D.6).
      if (opts.addAnother) toast.success('Trade saved');
      if (opts.addAnother) {
        const keep = { accountIds: form.accountIds, assetClass: form.assetClass, strategy: form.strategy, session: form.session, entryTime: form.entryTime };
        const fresh = emptyForm({ accountIds: keep.accountIds, assetClass: keep.assetClass });
        setForm({ ...fresh, strategy: keep.strategy, session: keep.session, entryTime: keep.entryTime });
        baseline.current = formKey({ ...fresh, strategy: keep.strategy, session: keep.session, entryTime: keep.entryTime });
        setTouched({});
        setErrors({});
        symbolRef.current?.focus();
      }
      onSaved(saved, { addAnother: !!opts.addAnother });
      return true;
    } catch (e) {
      // 402 is handled by the shared upgrade dialog.
      const failure = readApiError(e, 'Could not save the trade.');
      if (failure.status !== 402) {
        setSaveError(failure.message);
        const fields = serverFieldErrors(e);
        setErrors(fields);
        setTouched(Object.fromEntries(Object.keys(fields).map((k) => [k, true])));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+Enter, the buttons and the unsaved-changes dialog all land here: a second call while a save runs shares its result.
  const submit = (opts: { addAnother?: boolean } = {}): Promise<boolean> => {
    inFlight.current ??= save(opts).finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  };

  useImperativeHandle(ref, () => ({ submit, isDirty: () => dirty }));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit({ addAnother: mode === 'new' && e.shiftKey });
    }
  };

  if (accounts.length === 0 && mode === 'new') {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm font-medium">Create an account first</p>
        <p className="text-sm text-muted-foreground">Trades belong to a trading account, which also sets the currency of the P&L.</p>
        <Button asChild>
          <Link to="/app/accounts">Create account</Link>
        </Button>
      </div>
    );
  }

  const qtyLabel = quantityLabel(form.assetClass);
  const errorCount = (Object.keys(errors) as (keyof TradeFormState)[]).filter((k) => touched[k]).length;
  const inputMode = { inputMode: 'decimal' as const, autoComplete: 'off' };
  const symbolOptions = options.symbols ?? [];
  const unknownTags = form.tags.filter((m) => !(options.tags ?? []).includes(m));
  const unknownMistakes = form.mistakes.filter((m) => !(options.mistakes ?? []).includes(m));

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); void submit(); }} onKeyDown={onKeyDown} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {restoredAt && (
          <div role="status" className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm">
            Restored your unsaved changes.
            <Button type="button" variant="ghost" size="sm" onClick={() => { clearDraft(); setForm(initial); setRestoredAt(null); }}>
              Discard
            </Button>
          </div>
        )}
        {mode === 'new' && (
          <p className="text-xs text-muted-foreground">
            Many trades? <Link to="/app/import" className="text-primary underline underline-offset-2">Import a broker file or a screenshot</Link>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account" required error={err('accountIds')} className="sm:col-span-2">
            {(a) =>
              mode === 'edit' && initialTrade?.accountId ? (
                <p id={a.id} className="text-sm">
                  {accountsById.get(initialTrade.accountId)?.name ?? 'Account'} · {accountCurrency}
                </p>
              ) : (
                <div id={a.id} aria-invalid={a['aria-invalid']} tabIndex={-1}>
                  <AccountSelect accounts={accounts.filter((x) => x.status === 'active' || form.accountIds.includes(x.id))} selectedAccountIds={form.accountIds} onChange={(ids) => set('accountIds', ids)} />
                  {form.accountIds.length > 1 && <p className="mt-1 text-xs text-muted-foreground">One copy is saved per account ({form.accountIds.length}).</p>}
                </div>
              )
            }
          </Field>

          <Field label="Asset class" hint={form.assetClassInferred ? 'Not recorded on this trade; chosen from the symbol. Check it before saving.' : undefined}>
            {(a) => (
              <Select value={form.assetClass} onValueChange={(v) => setAssetClass(v as AssetClass)}>
                <SelectTrigger id={a.id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Direction" required>
            {() => (
              <SegmentedControl
                label="Direction"
                value={form.direction}
                onChange={(v) => set('direction', v)}
                options={[
                  { value: 'LONG', label: <><ArrowUpRight className="h-4 w-4" aria-hidden="true" /> Long</> },
                  { value: 'SHORT', label: <><ArrowDownRight className="h-4 w-4" aria-hidden="true" /> Short</> },
                ]}
              />
            )}
          </Field>

          <Field label="Symbol" required error={err('symbol')} className="sm:col-span-2">
            {(a) => (
              <SmartInput
                id={a.id}
                aria-invalid={a['aria-invalid']}
                aria-describedby={a['aria-describedby']}
                aria-required={a['aria-required']}
                inputRef={symbolRef}
                onBlur={() => blur('symbol')}
                value={form.symbol}
                onChange={(v) => set('symbol', v.toUpperCase())}
                suggestions={symbolOptions}
                onAddNew={(v) => addSymbol(v.toUpperCase())}
                placeholder="e.g. EURUSD"
              />
            )}
          </Field>
        </div>

        {form.assetClass === 'options' && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Option type" required error={err('optionType')}>
              {() => (
                <SegmentedControl label="Option type" value={form.optionType || null} onChange={(v) => set('optionType', v as 'call' | 'put')} options={[{ value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }]} />
              )}
            </Field>
            <Field label="Strike" required error={err('strike')}>
              {(a) => <Input {...a} {...inputMode} value={form.strike} onChange={(e) => set('strike', e.target.value)} onBlur={() => blur('strike')} />}
            </Field>
            <Field label="Expiry" required error={err('expiry')}>
              {(a) => <Input {...a} type="date" value={form.expiry} onChange={(e) => set('expiry', e.target.value)} onBlur={() => blur('expiry')} />}
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Entry price" required error={err('entryPrice')}>
            {(a) => <Input {...a} {...inputMode} value={form.entryPrice} onChange={(e) => set('entryPrice', e.target.value)} onBlur={() => blur('entryPrice')} />}
          </Field>
          <Field label="Stop loss" error={err('stopLoss')}>
            {(a) => <Input {...a} {...inputMode} value={form.stopLoss} onChange={(e) => set('stopLoss', e.target.value)} onBlur={() => blur('stopLoss')} />}
          </Field>
          <Field label="Take profit" error={err('takeProfit')}>
            {(a) => <Input {...a} {...inputMode} value={form.takeProfit} onChange={(e) => set('takeProfit', e.target.value)} onBlur={() => blur('takeProfit')} />}
          </Field>
          <Field label="Exit price" required error={err('exitPrice')}>
            {(a) => <Input {...a} {...inputMode} value={form.exitPrice} onChange={(e) => set('exitPrice', e.target.value)} onBlur={() => blur('exitPrice')} />}
          </Field>
          <Field label={qtyLabel} required error={err('quantity')}>
            {(a) => <Input {...a} {...inputMode} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} onBlur={() => blur('quantity')} />}
          </Field>
          {needsLotSize(form.assetClass) && (
            <Field label={form.assetClass === 'forex' ? 'Lot size (units)' : 'Lot size / multiplier'} hint={form.assetClass === 'forex' ? undefined : 'Needed for automatic P&L'}>
              {(a) => <Input {...a} {...inputMode} value={form.lotSize} onChange={(e) => set('lotSize', e.target.value)} />}
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full rows: "16 Nov 2026, 11:30" plus the calendar and Now buttons do not fit half the pane. */}
          <Field label="Opened" required error={err('entryTime')} className="sm:col-span-2">
            {(a) => <DateTimeField {...a} value={form.entryTime} onChange={(v) => set('entryTime', v)} onBlur={() => blur('entryTime')} />}
          </Field>
          <Field label="Closed" required error={err('exitTime')} className="sm:col-span-2">
            {(a) => <DateTimeField {...a} value={form.exitTime} onChange={(v) => set('exitTime', v)} onBlur={() => blur('exitTime')} showNow />}
          </Field>
          <Field label={`Fees${accountCurrency ? ` (${accountCurrency})` : ''}`} error={err('fees')}>
            {(a) => <Input {...a} {...inputMode} value={form.fees} onChange={(e) => set('fees', e.target.value)} onBlur={() => blur('fees')} />}
          </Field>
          <Field
            label={`Net P&L${accountCurrency ? ` (${accountCurrency})` : ''}`}
            required
            error={err('manualPnl')}
            hint={manual ? 'Manual value' : preview.canAuto ? 'Calculated from the prices' : preview.reason ?? undefined}
          >
            {(a) => (
              <div className="flex gap-2">
                <Input
                  {...a}
                  {...inputMode}
                  value={editingPnl || manual ? form.manualPnl : displayPnl}
                  readOnly={!editingPnl && !manual && preview.canAuto}
                  onFocus={() => !preview.canAuto && setEditingPnl(true)}
                  onChange={(e) => set('manualPnl', e.target.value)}
                  onBlur={() => blur('manualPnl')}
                  className={cn('font-mono tabular-nums', signOf(netPnl) === 'positive' && 'text-profit', signOf(netPnl) === 'negative' && 'text-loss')}
                />
                {preview.canAuto && !manual && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => { set('manualPnl', displayPnl); setEditingPnl(true); }}>
                    Edit
                  </Button>
                )}
                {manual && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => { set('manualPnl', ''); setEditingPnl(false); }}>
                    Reset
                  </Button>
                )}
              </div>
            )}
          </Field>
        </div>

        <Field label="Outcome" required>
          {() => (
            <SegmentedControl
              label="Outcome"
              value={form.outcome}
              onChange={(v) => setForm((f) => ({ ...f, outcome: v, outcomeTouched: true }))}
              options={OUTCOMES}
            />
          )}
        </Field>

        <section aria-labelledby="journal-heading" className="rounded-lg border border-border">
          <button
            type="button"
            id="journal-heading"
            onClick={() => setUi({ reviewOpen: !ui.reviewOpen })}
            aria-expanded={ui.reviewOpen}
            className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-medium"
          >
            <span>
              Journal <span className="font-normal text-muted-foreground">— optional, add it later from the trade</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', ui.reviewOpen && 'rotate-180')} aria-hidden="true" />
          </button>
          {ui.reviewOpen && (
            <div className="space-y-4 border-t border-border p-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Strategy" error={err('strategy')}>
                  {() => <DynamicSelect value={form.strategy} onChange={(v) => set('strategy', v)} options={options.strategies ?? []} onAddNew={addStrategy} maxLength={LIMITS.strategy} placeholder="Strategy" />}
                </Field>
                <Field label="Session" error={err('session')}>
                  {() => <DynamicSelect value={form.session} onChange={(v) => set('session', v)} options={options.sessions ?? []} onAddNew={addSession} maxLength={LIMITS.session} placeholder="Session" />}
                </Field>
                <Field label="Market condition" error={err('marketCondition')}>
                  {() => <DynamicSelect value={form.marketCondition} onChange={(v) => set('marketCondition', v)} options={options.marketConditions ?? []} onAddNew={addMarketCondition} maxLength={LIMITS.marketCondition} placeholder="Condition" />}
                </Field>
              </div>
              <Field label="Mistakes" error={err('mistakes')}>
                {() => (
                  <MistakeTagsInput selectedTags={form.mistakes} onChange={(t) => set('mistakes', t)} availableTags={[...(options.mistakes ?? []), ...unknownMistakes]} onAddNew={addMistake} maxLength={LIMITS.mistake} />
                )}
              </Field>
              <Field label="Tags" error={err('tags')}>
                {() => (
                  <MistakeTagsInput
                    noun="tag"
                    selectedTags={form.tags}
                    onChange={(t) => set('tags', t)}
                    availableTags={[...(options.tags ?? []), ...unknownTags]}
                    onAddNew={addTag}
                    maxLength={LIMITS.tag}
                  />
                )}
              </Field>
              {rules.length > 0 && (
                <Field label="Broken rules">{() => <BrokenRulesSelect rules={rules} selectedRuleIds={form.brokenRuleIds} onChange={(ids) => set('brokenRuleIds', ids)} />}</Field>
              )}
              <Field label="Key lesson" error={err('keyLesson')}>
                {(a) => (
                  <div className="flex gap-2">
                    <Input {...a} maxLength={LIMITS.keyLesson} value={form.keyLesson} onChange={(e) => set('keyLesson', e.target.value)} />
                    <TextEnhancerButton text={form.keyLesson} onEnhanced={(t: string) => set('keyLesson', t.slice(0, LIMITS.keyLesson))} />
                  </div>
                )}
              </Field>
              <Field label="Notes" error={err('notes')}>
                {(a) => <Textarea {...a} rows={4} maxLength={LIMITS.notes} value={form.notes} onChange={(e) => set('notes', e.target.value)} />}
              </Field>
              <Field label="Screenshots" error={err('images')}>
                {() => (
                  <ImageUploader images={form.images} onChange={(imgs) => set('images', imgs)} onBusyChange={setUploading} timeframeOptions={options.timeframes ?? []} onAddTimeframe={addTimeframe} onRemoveTimeframe={removeTimeframe} />
                )}
              </Field>
            </div>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-border bg-card">
        <div aria-live="polite" className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
          <span className={cn('font-mono tabular-nums font-medium', signOf(netPnl) === 'positive' && 'text-profit', signOf(netPnl) === 'negative' && 'text-loss')}>
            Net {netPnl === null ? '—' : formatMoney(netPnl, accountCurrency ?? undefined, { sign: true })}
          </span>
          {preview.realisedR !== null && <span className="font-mono tabular-nums text-muted-foreground">{formatR(preview.realisedR)}</span>}
          {preview.riskAmount !== null && <span className="text-muted-foreground">Risk {formatMoney(preview.riskAmount, accountCurrency ?? undefined)}</span>}
          {preview.plannedRR !== null && <span className="text-muted-foreground">Planned {preview.plannedRR.toFixed(2)}R</span>}
          {preview.holdingMinutes !== null && <span className="text-muted-foreground">{formatDurationMinutes(preview.holdingMinutes)}</span>}
        </div>
        {warnings.length > 0 && (
          <ul className="space-y-0.5 px-4 pb-2 text-xs text-warning">
            {warnings.map((w) => (
              <li key={w} className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {w}
              </li>
            ))}
          </ul>
        )}
        {(errorCount > 0 || saveError) && (
          <p role="alert" className="px-4 pb-2 text-sm text-loss">
            {saveError ?? `${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention`}
            {saveError && (
              <Button type="button" variant="link" size="sm" onClick={() => void submit()}>
                Retry
              </Button>
            )}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="mr-auto">
            Cancel
          </Button>
          {!online && <span className="text-xs text-warning">{copy.offline.saveHint}</span>}
          {mode === 'new' && (
            <Button type="button" variant="outline" disabled={saving || uploading || !online} onClick={() => void submit({ addAnother: true })}>
              Save &amp; add another
            </Button>
          )}
          <Button type="submit" disabled={saving || uploading || !online}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? 'Saving…' : mode === 'new' ? 'Save trade' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  );
});
