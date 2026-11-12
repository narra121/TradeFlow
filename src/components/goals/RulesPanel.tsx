import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { returnFocusByName } from '@/components/account/returnFocus';
import { periodNoun, type GoalPeriod } from '@/components/goals/goalMath';
import { ruleStreak, type RuleCell, type RuleStat } from '@/components/goals/ruleMath';
import { cn } from '@/lib/utils';

export const RULE_MAX = 200;

export interface RuleRow {
  id: string;
  text: string;
  key: string;
  stat?: RuleStat;
  /** No trades in the period, so there is nothing to have followed. */
  idle?: boolean;
  history: { label: string; cell: RuleCell }[];
}

interface RulesPanelProps {
  rows: RuleRow[];
  period: GoalPeriod;
  readOnly: boolean;
  /** `Followed on 10 of 12 trades this week (83%)`, own rules only. */
  complianceText?: string;
  /** Starter rules shown while the user has none of their own. */
  starters: string[];
  pullable: { text: string }[];
  siblingLabel: string;
  adding: boolean;
  /** Text the add row opens with, e.g. from `Make this a rule` in an AI report; it arrives selected. */
  addInitial?: string;
  onCloseAdd: () => void;
  onAdd: (text: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<{ inUse?: boolean }>;
  onCopy: (text: string) => Promise<void>;
  onOpenTrades: (row: RuleRow) => void;
}

const cellWord = (c: RuleCell): string => (c.kind === 'broken' ? `broken ${c.count} ${c.count === 1 ? 'time' : 'times'}` : c.kind === 'clean' ? 'followed' : 'no data');

function Cells({ row }: { row: RuleRow }) {
  return (
    <ul className="flex items-center gap-1 font-mono text-xs" aria-label={`${row.text}, last 8 periods`}>
      {row.history.map((h, i) => (
        <li key={i} className="flex h-4 min-w-4 items-center justify-center" title={`${h.label}: ${cellWord(h.cell)}`}>
          <span className="sr-only">{`${h.label}: ${cellWord(h.cell)}`}</span>
          <span aria-hidden="true" className={cn(h.cell.kind === 'clean' && 'text-profit', h.cell.kind === 'broken' && 'font-semibold text-loss', h.cell.kind === 'none' && 'text-muted-foreground')}>
            {h.cell.kind === 'clean' ? '✓' : h.cell.kind === 'broken' ? h.cell.count : '·'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RuleInput({ initial, onSave, onCancel, label }: { initial: string; onSave: (text: string) => Promise<void>; onCancel: () => void; label: string }) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    if (initial) ref.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = async () => {
    const t = text.trim();
    if (!t) return setError('Enter the rule in a sentence.');
    if (t.length > RULE_MAX) return setError(`Keep the rule under ${RULE_MAX} characters.`);
    setSaving(true);
    try {
      await onSave(t);
    } catch {
      setError('Couldn’t save the rule. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onCancel())} className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor="rule-input" className="sr-only">{label}</label>
        <Input id="rule-input" ref={ref} value={text} maxLength={RULE_MAX} onChange={(e) => { setText(e.target.value); setError(undefined); }} aria-invalid={!!error} aria-describedby={error ? 'rule-input-error' : undefined} className="h-8 text-13" />
        {error && <p id="rule-input-error" role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
    </form>
  );
}

/** Rules table: this period, cost of the breaks, eight-period history and streak. Rows edit in place. */
export function RulesPanel({ rows, period, readOnly, complianceText, starters, pullable, siblingLabel, adding, addInitial, onCloseAdd, onAdd, onEdit, onDelete, onCopy, onOpenTrades }: RulesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RuleRow | null>(null);
  const [blocked, setBlocked] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const noun = periodNoun(period);
  const returnTo = useRef<string | null>(null);

  const columns: DataColumn<RuleRow>[] = [
    {
      id: 'rule',
      header: 'Rule',
      cell: (r) =>
        editingId === r.id ? (
          <RuleInput initial={r.text} label={`Edit rule: ${r.text}`} onCancel={() => setEditingId(null)} onSave={async (t) => { await onEdit(r.id, t); setEditingId(null); }} />
        ) : (
          <div className="min-w-0 whitespace-normal py-1">
            <span>{r.text}</span>
            {blocked[r.id] !== undefined && <p role="status" className="text-xs text-warning">Used by {blocked[r.id]} {blocked[r.id] === 1 ? 'trade' : 'trades'} this {noun} — cannot be deleted</p>}
          </div>
        ),
    },
    {
      id: 'week',
      header: `This ${noun}`,
      width: 'w-32',
      cell: (r) =>
        r.stat?.breaks ? (
          <button type="button" onClick={() => onOpenTrades(r)} className="text-loss underline-offset-2 hover:underline focus-visible:underline" aria-label={`Broken ${r.stat.breaks} times this ${noun}. Show those trades`}>
            Broken {r.stat.breaks}× →
          </button>
        ) : r.idle ? (
          <span className="text-muted-foreground">No trades yet</span>
        ) : (
          <span className="text-foreground-soft">Followed</span>
        ),
    },
    {
      id: 'cost',
      header: 'Cost',
      width: 'w-28',
      hideBelow: 'md',
      cell: (r) => (r.stat?.cost.length ? <span className="flex flex-col">{r.stat.cost.map((c) => <Money key={c.currency} value={c.net} currency={c.currency} />)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { id: 'history', header: `Last 8 ${noun}s`, width: 'w-44', hideBelow: 'lg', cell: (r) => <Cells row={r} /> },
    {
      id: 'streak',
      header: 'Streak',
      width: 'w-32',
      hideBelow: 'lg',
      cell: (r) => {
        const n = ruleStreak(r.history.map((h) => h.cell));
        return n >= 2 ? <span className="text-foreground-soft">{n} {noun}s clean</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      srHeader: true,
      width: 'w-12',
      align: 'right',
      cell: (r) =>
        readOnly || editingId === r.id ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for rule: ${r.text}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditingId(r.id)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { returnTo.current = `Actions for rule: ${r.text}`; setDeleting(r); }} className="text-loss focus:text-loss">Delete…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await onDelete(deleting.id);
      if (res.inUse) setBlocked((b) => ({ ...b, [deleting.id]: deleting.stat?.breaks ?? 1 }));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const used = deleting?.stat?.breaks ?? 0;

  return (
    <section aria-labelledby="rules-heading">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="rules-heading" className="text-sm font-semibold">Rules</h2>
        {complianceText && <span className="text-13 text-foreground-soft">{complianceText}</span>}
      </div>
      {adding && !readOnly && (
        <div className="border-b border-border py-3">
          <RuleInput key={addInitial ?? ''} initial={addInitial ?? ''} label="New rule" onCancel={onCloseAdd} onSave={async (t) => { await onAdd(t); onCloseAdd(); }} />
        </div>
      )}

      {rows.length > 0 && <DataTable caption="Trading rules" rows={rows} columns={columns} getRowId={(r) => r.id} />}

      {rows.length === 0 && (
        <div className="space-y-3 py-3">
          <p className="text-13 text-muted-foreground">{readOnly ? 'No rules were set for this period.' : 'These are starter rules. Add the ones you follow to start tracking, or write your own.'}</p>
          {!readOnly && (
            <ul className="space-y-1">
              {starters.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3 text-13">
                  <span>{s}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => void onCopy(s)} aria-label={`Add rule: ${s}`}>Add rule</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!readOnly && pullable.length > 0 && (
        <ul className="border-t border-border">
          {pullable.map((p) => (
            <li key={p.text} className="flex flex-wrap items-center justify-between gap-2 py-2 text-13">
              <span>From your {siblingLabel} rules: <span className="text-foreground">“{p.text}”</span></span>
              <Button type="button" size="sm" variant="outline" onClick={() => void onCopy(p.text)}>Copy to this {noun}</Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => returnFocusByName(returnTo.current, e)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {used > 0 ? `It stays on the ${used} ${used === 1 ? 'trade' : 'trades'} that recorded it. ` : ''}“{deleting?.text}” is removed from this {noun}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} autoFocus>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>{busy ? 'Deleting…' : 'Delete rule'}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
