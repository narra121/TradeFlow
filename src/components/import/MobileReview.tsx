import { useEffect, useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { DirectionChip } from '@/components/ui/chips';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatQuantity } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/import/labels';
import { formatEditDate, missingTimeNote, parseEditDate, parseNumberCell, rowStatus, validateTrade, type EditableField, type ReviewRow, rowDateTime, spansYears } from '@/lib/import/rows';
import { cn } from '@/lib/utils';

interface MobileReviewProps {
  rows: ReviewRow[];
  currency?: string;
  readOnly?: boolean;
  onInclude: (key: string, included: boolean) => void;
  onEdit: (key: string, field: EditableField, value: string | number) => void;
}

/** Phone layout of the review: one card per row; the pencil opens the row in a sheet with labelled inputs. */
export function MobileReview({ rows, currency, readOnly, onInclude, onEdit }: MobileReviewProps) {
  const withYear = spansYears(rows);
  const [editKey, setEditKey] = useState<string | null>(null);
  const editing = rows.find((r) => r.key === editKey) ?? null;
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((row) => {
          const errors = validateTrade(row.trade);
          const status = rowStatus(row, errors);
          const t = row.trade;
          return (
            <li key={row.key} className={cn('flex items-start gap-3 py-3', (status === 'excluded' || status === 'duplicate') && 'text-muted-foreground')}>
              <Checkbox
                className="mt-1"
                checked={row.included || !!row.saved}
                disabled={readOnly || !!row.saved}
                onCheckedChange={(v) => onInclude(row.key, v === true)}
                aria-label={`Include ${t.symbol || 'row'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {t.symbol || '—'} <DirectionChip direction={t.side === 'BUY' ? 'LONG' : 'SHORT'} />
                  </span>
                  {Number.isFinite(t.pnl) && <Money value={t.pnl} currency={currency} />}
                </div>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {t.closeDate && !Number.isNaN(new Date(t.closeDate).getTime()) ? rowDateTime(t.closeDate, withYear) : 'No close date'} · {t.quantity > 0 ? formatQuantity(t.quantity) : '—'} qty
                </p>
                <p className={cn('mt-0.5 flex items-center gap-1 text-xs', status === 'fix' ? 'text-loss' : 'text-muted-foreground')}>
                  {status === 'fix' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                  {status === 'fix' ? `${row.note ? `${row.note} ` : ''}${Object.values(errors).join(' ')}` : STATUS_LABEL[status]}
                </p>
                {status === 'ready' && missingTimeNote(row) && <p className="mt-0.5 text-xs text-warning">{missingTimeNote(row)}</p>}
              </div>
              {!readOnly && !row.saved && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${t.symbol || 'row'}`} onClick={() => setEditKey(row.key)} className="h-11 w-11">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <RowSheet row={editing} onClose={() => setEditKey(null)} onEdit={onEdit} />
    </>
  );
}

const FIELDS: { field: EditableField; label: string; type: 'text' | 'number' | 'date' }[] = [
  { field: 'symbol', label: 'Symbol', type: 'text' },
  { field: 'quantity', label: 'Quantity', type: 'number' },
  { field: 'entryPrice', label: 'Entry price', type: 'number' },
  { field: 'exitPrice', label: 'Exit price', type: 'number' },
  { field: 'openDate', label: 'Opened', type: 'date' },
  { field: 'closeDate', label: 'Closed', type: 'date' },
  { field: 'fees', label: 'Fees', type: 'number' },
  { field: 'pnl', label: 'Net P&L', type: 'number' },
];

const draftOf = (t: ReviewRow['trade']): Record<string, string> => ({
  symbol: t.symbol,
  quantity: String(t.quantity || ''),
  entryPrice: String(t.entryPrice || ''),
  exitPrice: String(t.exitPrice || ''),
  openDate: formatEditDate(t.openDate),
  closeDate: formatEditDate(t.closeDate),
  fees: String(t.fees ?? 0),
  pnl: String(t.pnl ?? 0),
  side: t.side,
});

function RowSheet({ row, onClose, onEdit }: { row: ReviewRow | null; onClose: () => void; onEdit: MobileReviewProps['onEdit'] }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (row) setDraft(draftOf(row.trade));
  }, [row]);
  if (!row) return <Sheet open={false} />;
  const preview = { ...row.trade, symbol: draft.symbol ?? '', quantity: parseNumberCell(draft.quantity ?? ''), entryPrice: parseNumberCell(draft.entryPrice ?? ''), exitPrice: parseNumberCell(draft.exitPrice ?? ''), openDate: parseEditDate(draft.openDate ?? '', row.trade.openDate), closeDate: parseEditDate(draft.closeDate ?? '', row.trade.closeDate), fees: parseNumberCell(draft.fees ?? ''), pnl: parseNumberCell(draft.pnl ?? '') };
  const errors = validateTrade(preview);
  const apply = () => {
    for (const f of FIELDS) {
      const v = draft[f.field] ?? '';
      if (f.type === 'number' && v === draftOf(row.trade)[f.field]) continue;
      const next = f.type === 'number' ? parseNumberCell(v) : f.type === 'date' ? parseEditDate(v, row.trade[f.field as 'openDate' | 'closeDate']) : v.trim().toUpperCase();
      const was = row.trade[f.field as keyof typeof row.trade];
      if (!Object.is(next, was)) onEdit(row.key, f.field, next);
    }
    if (draft.side && draft.side !== row.trade.side) onEdit(row.key, 'side', draft.side);
    onClose();
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit trade</SheetTitle>
          <SheetDescription>{row.trade.symbol || 'Row'} · {row.source}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Side" className="col-span-2">
            {(a) => (
              <select {...a} value={draft.side ?? 'BUY'} onChange={(e) => setDraft((d) => ({ ...d, side: e.target.value }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                <option value="BUY">Long</option>
                <option value="SELL">Short</option>
              </select>
            )}
          </Field>
          {FIELDS.map((f) => (
            <Field key={f.field} label={f.label} error={errors[f.field]} className={f.type === 'date' || f.field === 'symbol' ? 'col-span-2' : undefined}>
              {(a) => (
                <Input
                  {...a}
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  placeholder={f.type === 'date' ? 'e.g. 3 Dec 2025, 08:41' : undefined}
                  inputMode={f.type === 'number' ? 'decimal' : undefined}
                  className="h-11"
                  value={draft[f.field] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.field]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>
        <SheetFooter className="mt-4 gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="h-11">Cancel</Button>
          <Button type="button" onClick={apply} className="h-11">Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
