import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Lock, Maximize2, Minimize2, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { DirectionChip, OutcomeChip } from '@/components/ui/chips';
import { Money, RMultiple } from '@/components/ui/money';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { READ_ONLY_REASON } from '@/lib/accountWritable';
import { useReadOnlyAccounts } from '@/hooks/useReadOnlyAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { openTrialExpired } from '@/components/billing/readOnly';
import { copy } from '@/copy';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InlineField } from '@/components/trade/InlineField';
import { TradeForm, type TradeFormHandle } from '@/components/trade/TradeForm';
import { CachedImage } from '@/components/trade/CachedImage';
import { ImageViewerModal } from '@/components/trade/ImageViewerModal';
import { DynamicSelect } from '@/components/trade/DynamicSelect';
import { MistakeTagsInput } from '@/components/trade/MistakeTagsInput';
import { BrokenRulesSelect } from '@/components/trade/BrokenRulesSelect';
import { ReviewedSwitch } from '@/components/trade/ReviewedSwitch';
import { TradeDebrief } from '@/components/trade/TradeDebrief';
import { useAccounts } from '@/hooks/useAccounts';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useUiState } from '@/hooks/useUiState';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useGetTradeQuery, useUpdateTradeMutation } from '@/store/api';
import { formatDateShort, formatDateTime, formatDurationMinutes, formatMoney, formatPrice, formatQuantity } from '@/lib/format';
import { realisedR } from '@/lib/tradeFilters';
import { patchTradePayload } from '@/lib/patchTrade';
import { cn } from '@/lib/utils';
import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';

export type PanePresentation = 'docked' | 'overlay' | 'screen' | 'expanded';

interface TradePaneProps {
  trades: Trade[];
  isLoading: boolean;
  isError: boolean;
  /** The failed load's error: its API message is shown with the retry. */
  error?: unknown;
  onRetry: () => void;
  presentation: PanePresentation;
  /** Called after any close so the host can restore focus. */
  onClosed?: () => void;
  /** The visible order of the list the pane was opened from (when the URL cites no `ids`). */
  walkIds?: string[] | null;
}

export interface TradePaneHandle {
  /** Closes the pane, asking first when the form has unsaved changes. */
  requestClose: () => void;
}

type Guarded = () => void;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-sm tabular-nums">{children}</dd>
    </div>
  );
}

export const TradePane = forwardRef<TradePaneHandle, TradePaneProps>(function TradePane({ trades, isLoading, isError, error, onRetry, presentation, onClosed, walkIds }, ref) {
  const param = useTradeParam();
  const { accounts, selectedAccountId } = useAccounts();
  const { options, addStrategy, addSession, addMarketCondition, addMistake, addTag } = useSavedOptions();
  const { rules, loading: rulesLoading } = useTradingRules();
  const [ui] = useUiState();
  const [updateTrade] = useUpdateTradeMutation();
  const formRef = useRef<TradeFormHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<Guarded | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const readOnlyIds = useReadOnlyAccounts();
  // Trial over or Pro lapsed: every action that writes offers the upgrade instead of being a dead control.
  const planReadOnly = useEntitlements().readOnly;
  const showsTrade = param.mode === 'view' || param.mode === 'edit';
  const listed = showsTrade ? trades.find((t) => t.id === param.trade) ?? null : null;
  // A trade outside the scope list (an older Calendar month, a shared link) is fetched by id.
  const needsFetch = showsTrade && !listed && !isLoading && !isError && !!param.trade;
  const fetched = useGetTradeQuery(param.trade ?? '', { skip: !needsFetch });
  const trade = listed ?? fetched.currentData ?? null;
  // Prev / Next walk the cited list (`&ids=`), then the order the list screen shows, otherwise the scope list.
  const walk = useMemo(() => param.ids ?? walkIds ?? trades.map((t) => t.id), [param.ids, walkIds, trades]);
  const readOnly = planReadOnly || (!!trade?.accountId && readOnlyIds.has(trade.accountId));
  const index = trade ? walk.indexOf(trade.id) : -1;
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const account = trade?.accountId ? accountById.get(trade.accountId) : undefined;
  const currency = account?.currency;

  const sourceTrade = param.from ? trades.find((t) => t.id === param.from) ?? null : null;
  const defaultAccountIds = useMemo(() => {
    if (selectedAccountId) return [selectedAccountId];
    const first = accounts.find((a) => a.status === 'active');
    return first ? [first.id] : [];
  }, [selectedAccountId, accounts]);

  const draftKey = param.mode === 'new' ? 'tq.draft.new' : trade ? `tq.draft.${trade.id}` : null;

  const guard = useCallback(
    (action: Guarded) => {
      if ((param.mode === 'edit' || param.mode === 'new') && formRef.current?.isDirty()) setPending(() => action);
      else action();
    },
    [param.mode],
  );

  const openTradeId = param.trade;
  const close = useCallback(() => {
    param.close();
    onClosed?.();
    // Focus goes back to the row that opened the pane (WCAG 2.4.3), or the page when that row is not mounted.
    window.requestAnimationFrame(() => {
      const row = openTradeId && openTradeId !== 'new' ? document.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(openTradeId)}"]`) : null;
      (row ?? document.getElementById('main'))?.focus();
    });
  }, [param, onClosed, openTradeId]);

  // A read-only plan answers Add trade with the upgrade dialog, like every other blocked write; the pane does not stay open.
  useEffect(() => {
    if (param.mode !== 'new' || !planReadOnly) return;
    openTrialExpired();
    close();
  }, [param.mode, planReadOnly, close]);

  const requestClose = () => guard(close);
  useImperativeHandle(ref, () => ({ requestClose }));

  // The form takes focus itself (symbol); only the view mode moves focus to the heading.
  useEffect(() => {
    if (param.mode === 'view') headingRef.current?.focus();
  }, [param.trade, param.mode]);

  // A deleted trade, or a link to one outside the scope, shows a notice instead of an empty pane.
  const step = (delta: number) => {
    const next = walk[index + delta];
    if (next) guard(() => param.stepTo(next));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // `Esc` closes the top-most layer: a field edit (handled by the field), edit mode, then the pane (D.8). The overlay
      // and phone presentations are dialogs that handle it themselves.
      if (e.key === 'Escape' && !e.defaultPrevented && (presentation === 'docked' || presentation === 'expanded')) {
        if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]')) return;
        e.preventDefault();
        if (param.mode === 'edit') guard(() => param.setEdit(false));
        else requestClose();
        return;
      }
      if (param.mode !== 'view' || !trade) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ui.singleKeyShortcuts && (e.key === 'e' || e.key === 'E') && !readOnly) {
        e.preventDefault();
        param.setEdit(true);
      } else if (e.key === 'ArrowRight' || (ui.singleKeyShortcuts && (e.key === 'j' || e.key === 'J'))) {
        if (document.activeElement?.closest('[data-trade-list]')) return;
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft' || (ui.singleKeyShortcuts && (e.key === 'k' || e.key === 'K'))) {
        if (document.activeElement?.closest('[data-trade-list]')) return;
        e.preventDefault();
        step(-1);
      } else if (ui.singleKeyShortcuts && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        param.setExpanded(!param.expanded);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        void onDelete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const patch = useCallback(
    async (t: Trade, changes: Partial<CreateTradePayload>) => {
      await updateTrade({ id: t.id, payload: patchTradePayload(t, changes) }).unwrap();
    },
    [updateTrade],
  );

  const undoableDelete = useUndoableDelete();
  const onDelete = async () => {
    if (!trade) return;
    if (planReadOnly) return openTrialExpired();
    const next = walk[index + 1] ?? walk[index - 1];
    if (!(await undoableDelete([trade]))) return;
    if (next) param.stepTo(next);
    else close();
  };

  const title = param.mode === 'new' ? 'New trade' : trade ? `${trade.symbol}` : 'Trade';
  const chrome = (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
      {param.mode === 'view' && trade && (
        <>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(-1)} disabled={index <= 0} aria-label="Previous trade">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(1)} disabled={index < 0 || index >= walk.length - 1} aria-label="Next trade">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="hidden px-1 text-xs tabular-nums text-muted-foreground sm:inline">
            {index + 1} of {walk.length}
          </span>
        </>
      )}
      <h2 ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 truncate px-1 text-sm font-semibold outline-none">
        {param.mode === 'edit' && trade ? `Edit ${trade.symbol} · ${formatDateShort(trade.exitDate || trade.entryDate)}` : title}
        {param.mode === 'view' && trade && (
          <span className="ml-2 hidden items-center gap-1.5 align-middle sm:inline-flex">
            <DirectionChip direction={trade.direction} />
            <OutcomeChip outcome={trade.outcome} />
          </span>
        )}
      </h2>
      {param.mode === 'view' && trade && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (planReadOnly ? openTrialExpired() : param.setEdit(true))}
            disabled={readOnly && !planReadOnly}
            title={readOnly ? READ_ONLY_REASON : undefined}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => (planReadOnly ? openTrialExpired() : param.openNew({ from: trade.id }))} className="items-start">
                <Copy className="mr-2 mt-0.5 h-4 w-4" aria-hidden="true" />
                <span>
                  {copy.trades.duplicate.label}
                  <span className="block text-xs text-muted-foreground">{copy.trades.duplicate.hint}</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void onDelete()} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Delete…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      {presentation !== 'screen' && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => param.setExpanded(!param.expanded)} aria-label={param.expanded ? 'Collapse pane' : 'Expand pane'}>
          {param.expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon-sm" onClick={requestClose} aria-label="Close trade" className="focus-visible:ring-inset focus-visible:ring-offset-0">
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );

  let body: React.ReactNode;
  if (param.mode === 'new' && planReadOnly) {
    body = null;
  } else if (param.mode === 'new') {
    body = (
      <TradeForm
        key={`new-${param.date ?? ''}-${param.from ?? ''}`}
        ref={formRef}
        mode="new"
        date={param.date}
        from={sourceTrade}
        defaultAccountIds={defaultAccountIds}
        onDirtyChange={setDirty}
        onCancel={() => guard(close)}
        onSaved={(saved, { addAnother }) => {
          if (addAnother || !saved) return;
          param.stepTo(saved.id);
        }}
      />
    );
  } else if (isLoading || (needsFetch && fetched.isFetching)) {
    body = (
      <div className="space-y-3 p-4" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (isError) {
    body = <div className="p-4"><ErrorState title="Could not load trades" error={error} onRetry={onRetry} /></div>;
  } else if (!trade) {
    body = (
      <div className="space-y-3 p-4">
        <p className="text-sm font-medium">{copy.trades.outsideScope}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => close()}>
          Close
        </Button>
      </div>
    );
  } else if (param.mode === 'edit') {
    body = (
      <TradeForm
        key={`edit-${trade.id}`}
        ref={formRef}
        mode="edit"
        initialTrade={trade}
        defaultAccountIds={defaultAccountIds}
        onDirtyChange={setDirty}
        onCancel={() => guard(() => param.setEdit(false))}
        onSaved={() => param.setEdit(false)}
      />
    );
  } else {
    const resolvedRules = (trade.brokenRuleIds ?? []).map((id) => rules.find((r) => r.ruleId === id)?.rule ?? 'Rule removed');
    const tags = (trade.mistakes ?? []).filter(Boolean);
    body = (
      <div className={cn('min-h-0 flex-1 overflow-y-auto', param.expanded && presentation !== 'screen' && 'grid grid-cols-1 lg:grid-cols-[3fr_2fr]')}>
        <div className={cn('space-y-4 p-4', param.expanded && 'lg:order-2')}>
          {readOnly && (
            <p role="status" className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs text-foreground-soft">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {READ_ONLY_REASON} <Link to="/app/settings/billing" className="text-primary underline underline-offset-2">Upgrade to Pro</Link>
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 self-center sm:hidden">
              <DirectionChip direction={trade.direction} />
              <OutcomeChip outcome={trade.outcome} />
              <span className="text-xs tabular-nums text-muted-foreground">{index + 1} of {walk.length}</span>
            </span>
            <Money value={trade.pnl} currency={currency} className="text-2xl font-medium" />
            <RMultiple value={realisedR(trade)} />
            <span className="text-sm text-muted-foreground">{formatDurationMinutes(trade.exitDate ? (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / 60000 : null)}</span>
            <span className="text-sm text-muted-foreground">{account?.name ?? 'No account'}</span>
            <span className="text-sm text-muted-foreground">{formatDateTime(trade.exitDate || trade.entryDate)}</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Row label="Entry">{formatPrice(trade.entryPrice)}</Row>
            <Row label="Exit">{formatPrice(trade.exitPrice)}</Row>
            <Row label="Stop loss">{trade.stopLoss ? formatPrice(trade.stopLoss) : '—'}</Row>
            <Row label="Take profit">{trade.takeProfit ? formatPrice(trade.takeProfit) : '—'}</Row>
            <Row label="Quantity">{formatQuantity(trade.size)}</Row>
            <Row label="Fees">{trade.fees !== undefined ? formatMoney(trade.fees, currency) : '—'}</Row>
            <Row label="Gross P&L">{trade.grossPnl !== undefined ? formatMoney(trade.grossPnl, currency, { sign: true }) : '—'}</Row>
            <Row label="Planned R:R">{trade.riskRewardRatio ? trade.riskRewardRatio.toFixed(2) : '—'}</Row>
            {trade.optionType && <Row label="Type">{trade.optionType === 'call' ? 'Call' : 'Put'}</Row>}
            {trade.strike !== undefined && <Row label="Strike">{formatPrice(trade.strike)}</Row>}
            {trade.expiry && <Row label="Expiry">{formatDateShort(trade.expiry, true)}</Row>}
          </dl>

          <ReviewedSwitch
            checked={trade.reviewed === true}
            disabled={readOnly}
            onChange={(reviewed) => updateTrade({ id: trade.id, payload: { ...patchTradePayload(trade, {}), reviewed } }).unwrap()}
          />
          <TradeDebrief tradeId={trade.id} />
        </div>

        <div className={cn('space-y-4 p-4 pt-0', param.expanded && 'lg:order-1 lg:pt-4')}>
          <section aria-labelledby="shots-heading">
            <h3 id="shots-heading" className="mb-2 text-xs font-medium text-muted-foreground">
              Screenshots
            </h3>
            {(trade.images?.length ?? 0) > 0 ? (
              <ul className="flex gap-2 overflow-x-auto">
                {trade.images!.map((img, i) => (
                  <li key={img.id} className="w-40 shrink-0">
                    <button type="button" onClick={() => setViewerIndex(i)} className="block w-full overflow-hidden rounded-md border border-border" aria-label={`Open screenshot ${i + 1}${img.timeframe ? `, ${img.timeframe}` : ''}`}>
                      <CachedImage src={img.id} alt={`${trade.symbol} chart${img.timeframe ? ` ${img.timeframe}` : ''}`} className="aspect-video w-full object-cover" />
                    </button>
                    {img.timeframe && <p className="mt-0.5 text-xs text-muted-foreground">{img.timeframe}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => param.setEdit(true)}>
                Add a screenshot
              </Button>
            )}
          </section>

          <section aria-labelledby="journal-h" className="space-y-1">
            <h3 id="journal-h" className="mb-1 text-xs font-medium text-muted-foreground">
              Journal
            </h3>
            <InlineField disabled={readOnly} label="Strategy" value={trade.strategy ?? ''} display={trade.strategy || <span className="text-muted-foreground">Not set</span>} onCommit={(v) => patch(trade, { strategy: v })}>
              {({ draft, commit }) => <DynamicSelect value={draft} onChange={(v) => commit(v)} options={options.strategies ?? []} onAddNew={addStrategy} placeholder="Strategy" />}
            </InlineField>
            <InlineField disabled={readOnly} label="Session" value={trade.session ?? ''} display={trade.session || <span className="text-muted-foreground">Not set</span>} onCommit={(v) => patch(trade, { session: v })}>
              {({ draft, commit }) => <DynamicSelect value={draft} onChange={(v) => commit(v)} options={options.sessions ?? []} onAddNew={addSession} placeholder="Session" />}
            </InlineField>
            <InlineField disabled={readOnly} label="Market" value={trade.marketCondition ?? ''} display={trade.marketCondition || <span className="text-muted-foreground">Not set</span>} onCommit={(v) => patch(trade, { marketCondition: v })}>
              {({ draft, commit }) => <DynamicSelect value={draft} onChange={(v) => commit(v)} options={options.marketConditions ?? []} onAddNew={addMarketCondition} placeholder="Market condition" />}
            </InlineField>
            <InlineField
              disabled={readOnly}
              label="Mistakes"
              value={tags}
              display={tags.length ? <span className="flex flex-wrap gap-1">{tags.map((m) => <span key={m} className="rounded bg-loss/10 px-1.5 text-xs text-loss">{m}</span>)}</span> : <span className="text-muted-foreground">No mistakes tagged</span>}
              onCommit={(v) => patch(trade, { mistakes: v })}
            >
              {({ draft, setDraft }) => (
                <MistakeTagsInput selectedTags={draft} onChange={setDraft} availableTags={[...new Set([...(options.mistakes ?? []), ...draft])]} onAddNew={addMistake} />
              )}
            </InlineField>
            <InlineField
              disabled={readOnly}
              label="Tags"
              value={trade.tags ?? []}
              display={(trade.tags ?? []).length ? <span className="flex flex-wrap gap-1">{(trade.tags ?? []).map((m) => <span key={m} className="rounded bg-muted px-1.5 text-xs">{m}</span>)}</span> : <span className="text-muted-foreground">No tags</span>}
              onCommit={(v) => patch(trade, { tags: v })}
            >
              {({ draft, setDraft }) => <MistakeTagsInput selectedTags={draft} onChange={setDraft} availableTags={[...new Set([...(options.tags ?? []), ...draft])]} onAddNew={addTag} />}
            </InlineField>
            <InlineField
              disabled={readOnly}
              label="Broken rules"
              value={trade.brokenRuleIds ?? []}
              display={rulesLoading ? <Skeleton className="h-4 w-32" /> : resolvedRules.length ? resolvedRules.join(', ') : 'All rules followed'}
              onCommit={(v) => patch(trade, { brokenRuleIds: v })}
            >
              {({ draft, setDraft }) => <BrokenRulesSelect rules={rules} selectedRuleIds={draft} onChange={setDraft} />}
            </InlineField>
            <InlineField disabled={readOnly} label="Key lesson" value={trade.keyLesson ?? ''} display={trade.keyLesson || <span className="text-muted-foreground">Not set</span>} onCommit={(v) => patch(trade, { keyLesson: v })}>
              {({ draft, setDraft, commit }) => (
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit()} aria-label="Key lesson" />
              )}
            </InlineField>
            <InlineField disabled={readOnly} stacked label="Notes" value={trade.notes ?? ''} display={trade.notes || <span className="text-muted-foreground">Not set</span>} onCommit={(v) => patch(trade, { notes: v })}>
              {({ draft, setDraft, commit }) => (
                <Textarea
                  rows={5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && commit()}
                  aria-label="Notes"
                />
              )}
            </InlineField>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="trade-pane">
      {chrome}
      {body}

      {viewerIndex !== null && trade?.images?.[viewerIndex] && (
        <ImageViewerModal isOpen onClose={() => setViewerIndex(null)} imageId={trade.images[viewerIndex].id} timeframe={trade.images[viewerIndex].timeframe} description={trade.images[viewerIndex].description} />
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{param.mode === 'new' ? 'Save this trade as a draft?' : `Save changes to ${trade?.symbol ?? 'this trade'}?`}</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Keep editing</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (draftKey) sessionStorage.removeItem(draftKey);
                const action = pending;
                setPending(null);
                action?.();
              }}
            >
              Discard
            </Button>
            {param.mode === 'new' ? (
              <Button
                type="button"
                onClick={() => {
                  const action = pending;
                  setPending(null);
                  toast.message('Draft kept', { description: 'Open Add trade to resume it.' });
                  action?.();
                }}
              >
                Save as draft
              </Button>
            ) : (
              <AlertDialogAction
                onClick={async () => {
                  const action = pending;
                  setPending(null);
                  if (await formRef.current?.submit()) action?.();
                }}
              >
                Save
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className="sr-only" aria-live="polite">
        {dirty ? 'Unsaved changes' : ''}
      </span>
    </div>
  );
});
