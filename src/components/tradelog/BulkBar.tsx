import { useMemo, useState } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Picker, type PickState } from '@/components/ui/picker';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BULK_EDIT_CAP, triState, type BulkOp } from '@/lib/bulkPatch';
import { copy } from '@/copy';
import { useOnline } from '@/hooks/useOnline';
import { formatMoney } from '@/lib/format';
import type { ListSummary } from '@/lib/tradeFilters';
import type { Trade, TradingAccount } from '@/types/trade';

export interface BulkProgress {
  done: number;
  total: number;
}

export interface BulkOptions {
  strategies: string[];
  sessions: string[];
  markets: string[];
  mistakes: string[];
  tags: string[];
  rules: { id: string; label: string }[];
  accounts: TradingAccount[];
}

interface BulkBarProps {
  /** One 44 px row that takes the scope bar's place (≥ 768 px); otherwise a floating bar above the tab bar. */
  inline?: boolean;
  selectedTrades: Trade[];
  /** Totals of the selected trades, per currency. */
  summary: ListSummary;
  /** Every trade matching the filters (not just this page) can be selected with one click. */
  matchingCount: number;
  options: BulkOptions;
  progress: BulkProgress | null;
  /** Set after an edit so the bar offers Undo for it. */
  canUndo: boolean;
  failedCount: number;
  onSelectAllMatching: () => void;
  onClear: () => void;
  onApply: (op: BulkOp) => void;
  onUndo: () => void;
  onRetryFailed: () => void;
  onExport: () => void;
  onDelete: () => Promise<void>;
}

type ListKind = 'mistakes' | 'tags' | 'brokenRules';
type SingleKind = 'strategy' | 'session' | 'market' | 'account';

/** Selection bar (E-044 / F-123): counts and totals, tri-state pickers for tags, single pickers for fields, Export, Delete. */
export function BulkBar({ inline = false, selectedTrades, summary, matchingCount, options, progress, canUndo, failedCount, onSelectAllMatching, onClear, onApply, onUndo, onRetryFailed, onExport, onDelete }: BulkBarProps) {
  const online = useOnline();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = selectedTrades.length;
  const tooMany = count > BULK_EDIT_CAP || !online;

  const listStates = useMemo(() => {
    const field = (kind: ListKind): (string[] | undefined)[] => selectedTrades.map((t) => (kind === 'mistakes' ? t.mistakes : kind === 'tags' ? t.tags : t.brokenRuleIds));
    const build = (kind: ListKind, values: string[]): Record<string, PickState> => {
      const out: Record<string, PickState> = {};
      for (const v of values) {
        const s = triState(field(kind), v);
        out[v] = s === 'all' ? 'on' : s === 'some' ? 'mixed' : 'off';
      }
      return out;
    };
    return {
      mistakes: build('mistakes', options.mistakes),
      tags: build('tags', options.tags),
      brokenRules: build('brokenRules', options.rules.map((r) => r.id)),
    };
  }, [selectedTrades, options]);

  if (count === 0) return null;

  const totals = summary.byCurrency.map((c) => formatMoney(c.net, c.currency, { sign: true })).join(' · ');

  const listPicker = (kind: ListKind, label: string, opts: { value: string; label?: string }[], canCreate: boolean) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={tooMany || !!progress}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-2">
        <Picker
          mode="multi"
          label={label}
          options={opts}
          state={listStates[kind]}
          onCreate={canCreate ? () => undefined : undefined}
          onToggle={(value, next) => onApply({ kind, add: next === 'on' ? [value] : [], remove: next === 'off' ? [value] : [] })}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );

  const singlePicker = (kind: SingleKind, label: string, opts: { value: string; label?: string }[]) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={tooMany || !!progress}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-64 p-2">
        <Picker
          mode="single"
          label={label}
          options={opts}
          value=""
          onChange={(v) => onApply(kind === 'account' ? { kind: 'account', accountId: v } : { kind, value: v })}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <div
        role={inline ? 'toolbar' : 'region'}
        aria-label="Selected trades"
        className={inline ? 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden' : 'sticky bottom-3 z-bar mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-popover px-3 py-2 shadow-overlay'}
      >
        <span className="shrink-0 text-13 font-medium">{count} selected</span>
        {totals && !inline && <span className="font-mono text-xs tabular-nums text-muted-foreground">{totals}</span>}
        {count < matchingCount && (
          <Button type="button" variant="link" size="sm" className="shrink-0" onClick={onSelectAllMatching}>Select all {matchingCount}</Button>
        )}
        {count > BULK_EDIT_CAP && <span role="status" className="text-xs text-warning">Editing is limited to {BULK_EDIT_CAP} trades at a time.</span>}
        {!online && <span role="status" className="shrink-0 text-xs text-warning">{copy.offline.bulkHint}</span>}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        {listPicker('mistakes', 'Mistakes', options.mistakes.map((v) => ({ value: v })), true)}
        {listPicker('tags', 'Tags', options.tags.map((v) => ({ value: v })), true)}
        {listPicker('brokenRules', 'Broken rules', options.rules.map((r) => ({ value: r.id, label: r.label })), false)}
        {singlePicker('strategy', 'Strategy', options.strategies.map((v) => ({ value: v })))}
        {singlePicker('session', 'Session', options.sessions.map((v) => ({ value: v })))}
        {singlePicker('market', 'Market', options.markets.map((v) => ({ value: v })))}
        {singlePicker('account', 'Account', options.accounts.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}` })))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <Button type="button" variant="ghost" size="sm" onClick={onExport}><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Export</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-error"><Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Delete</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}><X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Clear</Button>
        <div aria-live="polite" className={inline ? 'shrink-0 text-xs text-muted-foreground empty:hidden' : 'w-full text-xs text-muted-foreground empty:hidden'}>
          {progress && `Updating ${progress.done} of ${progress.total}…`}
          {!progress && canUndo && (
            <>
              Updated. <button type="button" className="underline" onClick={onUndo}>Undo</button>
            </>
          )}
          {!progress && failedCount > 0 && (
            <span role="alert" className="ml-2 text-error">
              {failedCount} could not be updated. <button type="button" className="underline" onClick={onRetryFailed}>Retry failed</button>
            </span>
          )}
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} {count === 1 ? 'trade' : 'trades'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {totals ? `Their net P&L (${totals}) leaves your statistics. ` : ''}Screenshots are removed too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete();
                } finally {
                  setBusy(false);
                  setConfirm(false);
                }
              }}
            >
              {busy ? 'Deleting…' : `Delete ${count}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
