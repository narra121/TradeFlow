import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Money } from '@/components/ui/money';
import { DirectionChip } from '@/components/ui/chips';
import { formatCount, formatPrice, formatQuantity } from '@/lib/format';
import { PAGE_SIZE, STATUS_LABEL } from '@/lib/import/labels';
import { formatEditDate, missingTimeNote, parseEditDate, parseNumberCell, rowStatus, validateTrade, type EditableField, type ReviewRow, type RowErrors, type RowStatus, rowDateTime, spansYears } from '@/lib/import/rows';
import { cn } from '@/lib/utils';

const FIELD_LABEL: Record<EditableField, string> = {
  symbol: 'Symbol',
  side: 'Side',
  quantity: 'Quantity',
  entryPrice: 'Entry price',
  exitPrice: 'Exit price',
  openDate: 'Opened',
  closeDate: 'Closed',
  fees: 'Fees',
  pnl: 'Net P&L',
};

interface Col {
  id: string;
  header: string;
  field?: EditableField;
  align?: 'right';
  width: string;
}

const COLS: Col[] = [
  { id: 'select', header: 'Include', width: 'w-10' },
  { id: 'n', header: '#', width: 'w-12' },
  { id: 'status', header: 'Status', width: 'w-36' },
  { id: 'open', header: 'Opened', field: 'openDate', width: 'w-36' },
  { id: 'close', header: 'Closed', field: 'closeDate', width: 'w-36' },
  { id: 'symbol', header: 'Symbol', field: 'symbol', width: 'w-36' },
  { id: 'side', header: 'Side', field: 'side', width: 'w-20' },
  { id: 'qty', header: 'Qty', field: 'quantity', align: 'right', width: 'w-24' },
  { id: 'entry', header: 'Entry', field: 'entryPrice', align: 'right', width: 'w-24' },
  { id: 'exit', header: 'Exit', field: 'exitPrice', align: 'right', width: 'w-24' },
  { id: 'fees', header: 'Fees', field: 'fees', align: 'right', width: 'w-20' },
  { id: 'pnl', header: 'Net P&L', field: 'pnl', align: 'right', width: 'w-28' },
];

function rawValue(row: ReviewRow, field: EditableField): string {
  const t = row.trade;
  if (field === 'openDate' || field === 'closeDate') return formatEditDate(t[field]);
  return String(t[field] ?? '');
}

/** Number-like fields accept a comma as the thousands separator. */
function parseInput(row: ReviewRow, field: EditableField, raw: string): string | number {
  if (field === 'symbol') return raw.trim().toUpperCase();
  if (field === 'side') return raw;
  if (field === 'openDate' || field === 'closeDate') return parseEditDate(raw, row.trade[field]);
  return parseNumberCell(raw);
}

interface ReviewGridProps {
  rows: ReviewRow[];
  total: number;
  page: number;
  onPage: (p: number) => void;
  currency?: string;
  selection: ReadonlySet<string>;
  onSelect: (key: string, e: { shiftKey: boolean }) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onInclude: (key: string, included: boolean) => void;
  onEdit: (key: string, field: EditableField, value: string | number) => void;
  onFocusRow?: (row: ReviewRow) => void;
  /** column shown when rows came from screenshots */
  showSource?: boolean;
  readOnly?: boolean;
  focusKey?: string | null;
}

/**
 * Review grid: arrows move, Enter / F2 edits, Esc cancels, Tab commits and moves right, Space toggles the row's
 * Include box. Errors sit under the row and are tied to the cell with aria-describedby.
 */
export function ReviewGrid({
  rows,
  total,
  page,
  onPage,
  currency,
  selection,
  onSelect,
  onToggleSelectAll,
  onInclude,
  onEdit,
  onFocusRow,
  showSource,
  readOnly,
  focusKey,
}: ReviewGridProps) {
  const cols = useMemo(() => (showSource ? [...COLS, { id: 'source', header: 'Source', width: 'w-36' }] : COLS), [showSource]);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  const withYear = useMemo(() => spansYears(rows), [rows]);
  const [active, setActive] = useState({ r: 0, c: 5 });
  const [editing, setEditing] = useState<{ key: string; field: EditableField; draft: string } | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const pendingFocus = useRef(false);

  const errorsByKey = useMemo(() => {
    const m = new Map<string, RowErrors>();
    for (const r of pageRows) m.set(r.key, validateTrade(r.trade));
    return m;
  }, [pageRows]);

  useEffect(() => {
    if (active.r >= pageRows.length) setActive((a) => ({ ...a, r: Math.max(0, pageRows.length - 1) }));
  }, [pageRows.length, active.r]);

  useEffect(() => {
    if (!focusKey) return;
    const i = rows.findIndex((r) => r.key === focusKey);
    if (i < 0) return;
    const p = Math.floor(i / PAGE_SIZE) + 1;
    if (p !== page) onPage(p);
    const errs = validateTrade(rows[i].trade);
    const firstBad = COLS.findIndex((c) => c.field && errs[c.field]);
    setActive({ r: i % PAGE_SIZE, c: firstBad >= 0 ? firstBad : 5 });
    pendingFocus.current = true;
    // only when the caller asks to jump to a row
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  useEffect(() => {
    if (!pendingFocus.current || editing) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-r="${active.r}"][data-c="${active.c}"]`)?.focus();
  });

  const moveTo = useCallback(
    (r: number, c: number) => {
      const nr = Math.min(Math.max(0, r), Math.max(0, pageRows.length - 1));
      const nc = Math.min(Math.max(0, c), cols.length - 1);
      setActive({ r: nr, c: nc });
      pendingFocus.current = true;
      if (pageRows[nr]) onFocusRow?.(pageRows[nr]);
    },
    [cols.length, pageRows, onFocusRow],
  );

  const commit = useCallback(
    (then?: { r: number; c: number }) => {
      if (!editing) return;
      const row = rows.find((x) => x.key === editing.key);
      if (row && !Object.is(parseInput(row, editing.field, editing.draft), parseInput(row, editing.field, rawValue(row, editing.field)))) {
        onEdit(editing.key, editing.field, parseInput(row, editing.field, editing.draft));
      }
      setEditing(null);
      if (then) moveTo(then.r, then.c);
      else pendingFocus.current = true;
    },
    [editing, rows, onEdit, moveTo],
  );

  const beginEdit = (row: ReviewRow, field: EditableField) => {
    if (readOnly || row.saved) return;
    setEditing({ key: row.key, field, draft: rawValue(row, field) });
  };

  const onCellKey = (e: React.KeyboardEvent, ri: number, ci: number) => {
    if (editing) return;
    const row = pageRows[ri];
    const col = cols[ci];
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveTo(ri + 1, ci);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveTo(ri - 1, ci);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveTo(ri, ci + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveTo(ri, ci - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveTo(ri, 0);
        break;
      case 'End':
        e.preventDefault();
        moveTo(ri, cols.length - 1);
        break;
      case ' ':
        e.preventDefault();
        if (e.shiftKey) onSelect(row.key, { shiftKey: false });
        else if (!row.saved && !readOnly) onInclude(row.key, !row.included);
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (col.field) beginEdit(row, col.field);
        else if (col.id === 'select' && !row.saved && !readOnly) onInclude(row.key, !row.included);
        break;
      default:
        break;
    }
  };

  const allIncluded = pageRows.length > 0 && pageRows.every((r) => r.included || r.saved);
  const someIncluded = pageRows.some((r) => r.included);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="overflow-x-auto border-y border-border">
        <table
          ref={gridRef}
          role="grid"
          aria-label="Trades to import"
          aria-rowcount={total + 1}
          aria-colcount={cols.length}
          aria-multiselectable="true"
          className="w-full min-w-[1080px] border-collapse text-13"
        >
          <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
            <tr role="row">
              {cols.map((c, ci) => (
                <th key={c.id} role="columnheader" aria-colindex={ci + 1} scope="col" className={cn('h-8 px-2 font-medium', c.width, c.align === 'right' && 'text-right')}>
                  {c.id === 'select' ? (
                    <Checkbox
                      className="relative after:absolute after:-inset-1.5 after:content-['']"
                      checked={allIncluded ? true : someIncluded ? 'indeterminate' : false}
                      disabled={readOnly}
                      onCheckedChange={(v) => onToggleSelectAll(v === true)}
                      aria-label="Include every row on this page"
                    />
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const errors = errorsByKey.get(row.key) ?? {};
              const status = rowStatus(row, errors);
              const errorFields = (Object.keys(errors) as EditableField[]).filter(() => status === 'fix');
              const errId = `err-${row.key.replace(/[^a-z0-9]/gi, '')}`;
              const n = start + ri + 1;
              const dim = status === 'excluded' || status === 'duplicate';
              return (
                <GridRow
                  key={row.key}
                  row={row}
                  withYear={withYear}
                  ri={ri}
                  n={n}
                  cols={cols}
                  status={status}
                  errors={errors}
                  errorFields={errorFields}
                  errId={errId}
                  dim={dim}
                  active={active}
                  editing={editing}
                  currency={currency}
                  selected={selection.has(row.key)}
                  readOnly={!!readOnly}
                  onKey={onCellKey}
                  onActivate={(ci) => {
                    setActive({ r: ri, c: ci });
                    onFocusRow?.(row);
                  }}
                  onSelect={onSelect}
                  onInclude={onInclude}
                  onBeginEdit={beginEdit}
                  onDraft={(d) => setEditing((e) => (e ? { ...e, draft: d } : e))}
                  onCommit={commit}
                  onCancel={() => {
                    setEditing(null);
                    pendingFocus.current = true;
                  }}
                  colCount={cols.length}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {total === 0 && <p className="px-2 py-6 text-sm text-muted-foreground">No rows match this filter.</p>}
      {pages > 1 && (
        <nav aria-label="Review pages" className="flex items-center justify-between gap-2 py-2 text-sm text-muted-foreground">
          <span className="font-mono text-xs tabular-nums">
            {formatCount(start + 1)}–{formatCount(Math.min(total, start + PAGE_SIZE))} of {formatCount(total)}
          </span>
          <span className="flex items-center gap-1">
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              Previous
            </Button>
            <span className="px-2 font-mono text-xs tabular-nums">
              {page} / {pages}
            </span>
            <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
              Next
            </Button>
          </span>
        </nav>
      )}
    </div>
  );
}

interface GridRowProps {
  row: ReviewRow;
  /** Dates carry the year: the rows span more than one. */
  withYear: boolean;
  ri: number;
  n: number;
  cols: Col[];
  status: RowStatus;
  errors: RowErrors;
  errorFields: EditableField[];
  errId: string;
  dim: boolean;
  active: { r: number; c: number };
  editing: { key: string; field: EditableField; draft: string } | null;
  currency?: string;
  selected: boolean;
  readOnly: boolean;
  colCount: number;
  onKey: (e: React.KeyboardEvent, ri: number, ci: number) => void;
  onActivate: (ci: number) => void;
  onSelect: (key: string, e: { shiftKey: boolean }) => void;
  onInclude: (key: string, included: boolean) => void;
  onBeginEdit: (row: ReviewRow, field: EditableField) => void;
  onDraft: (d: string) => void;
  onCommit: (then?: { r: number; c: number }) => void;
  onCancel: () => void;
}

function GridRow({ row, withYear, ri, n, cols, status, errors, errorFields, errId, dim, active, editing, currency, selected, readOnly, colCount, onKey, onActivate, onSelect, onInclude, onBeginEdit, onDraft, onCommit, onCancel }: GridRowProps) {
  const t = row.trade;
  const timeNote = missingTimeNote(row);
  return (
    <>
      <tr
        role="row"
        aria-rowindex={n + 1}
        aria-selected={selected}
        data-status={status}
        className={cn('h-9 border-t border-border/70', selected && 'bg-muted', dim && 'text-muted-foreground')}
      >
        {cols.map((c, ci) => {
          const isActive = active.r === ri && active.c === ci;
          const isEditing = editing?.key === row.key && editing.field === c.field;
          const err = c.field ? errors[c.field] : undefined;
          const showErr = !!err && status === 'fix';
          const common = {
            role: 'gridcell' as const,
            'aria-colindex': ci + 1,
            tabIndex: isActive ? 0 : -1,
            'data-r': ri,
            'data-c': ci,
            onKeyDown: (e: React.KeyboardEvent) => onKey(e, ri, ci),
            onFocus: () => onActivate(ci),
            onDoubleClick: () => c.field && onBeginEdit(row, c.field),
            'aria-invalid': showErr || undefined,
            'aria-describedby': showErr ? errId : undefined,
            className: cn(
              'h-9 px-2 align-middle outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              c.align === 'right' && 'text-right font-mono tabular-nums',
              showErr && 'shadow-[inset_0_0_0_1px_hsl(var(--loss))]',
            ),
          };
          if (isEditing && c.field) return <td key={c.id} {...common}><CellEditor field={c.field} draft={editing.draft} onDraft={onDraft} onCommit={onCommit} ri={ri} ci={ci} onCancel={onCancel} label={`${FIELD_LABEL[c.field]}, row ${n}`} /></td>;
          switch (c.id) {
            case 'select':
              return (
                <td key={c.id} {...common}>
                  <Checkbox className="relative after:absolute after:-inset-1.5 after:content-['']" checked={row.included || !!row.saved} disabled={readOnly || !!row.saved} onCheckedChange={(v) => onInclude(row.key, v === true)} aria-label={`Include row ${n}, ${t.symbol || 'no symbol'}`} tabIndex={-1} />
                </td>
              );
            case 'n':
              return (
                <td key={c.id} {...common}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => onSelect(row.key, { shiftKey: e.shiftKey })}
                    aria-pressed={selected}
                    aria-label={`Select row ${n} for Exclude, Include or Merge`}
                    className="h-7 min-w-7 rounded-sm px-1 font-mono text-xs tabular-nums text-muted-foreground hover:bg-muted"
                  >
                    {n}
                  </button>
                </td>
              );
            case 'status':
              return (
                <td key={c.id} {...common}>
                  <span className={cn('inline-flex items-center gap-1 text-xs', status === 'fix' ? 'text-loss' : status === 'ready' || status === 'saved' ? 'text-foreground-soft' : 'text-muted-foreground')}>
                    {status === 'fix' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                    {STATUS_LABEL[status]}
                  </span>
                </td>
              );
            case 'open':
            case 'close': {
              const v = c.field === 'openDate' ? t.openDate : t.closeDate;
              const copied = c.field === 'openDate' ? row.dates?.openMissing : row.dates?.closeMissing;
              return (
                <td key={c.id} {...common} data-missing={copied || undefined} className={cn(common.className, 'whitespace-nowrap font-mono tabular-nums', copied && !dim && 'text-warning')}>
                  {v && !Number.isNaN(new Date(v).getTime()) ? rowDateTime(v, withYear) : '—'}
                  {copied && <span className="sr-only"> (not in the screenshot)</span>}
                </td>
              );
            }
            case 'symbol':
              return <td key={c.id} {...common} className={cn(common.className, 'whitespace-nowrap font-medium')}>{t.symbol || '—'}{row.mergedFrom && <span className="ml-1 text-xs font-normal text-muted-foreground">merged {row.mergedFrom.length}</span>}</td>;
            case 'side':
              return <td key={c.id} {...common}><DirectionChip direction={t.side === 'BUY' ? 'LONG' : 'SHORT'} /></td>;
            case 'qty':
              return <td key={c.id} {...common}>{t.quantity > 0 ? formatQuantity(t.quantity) : '—'}</td>;
            case 'entry':
              return <td key={c.id} {...common}>{t.entryPrice > 0 ? formatPrice(t.entryPrice) : '—'}</td>;
            case 'exit':
              return <td key={c.id} {...common}>{t.exitPrice > 0 ? formatPrice(t.exitPrice) : '—'}</td>;
            case 'fees':
              return <td key={c.id} {...common}>{t.fees ? <Money value={-t.fees} currency={currency} neutral /> : '—'}</td>;
            case 'pnl':
              return <td key={c.id} {...common}>{Number.isFinite(t.pnl) ? <Money value={t.pnl} currency={currency} /> : '—'}</td>;
            default:
              return <td key={c.id} {...common} className={cn(common.className, 'truncate text-xs text-muted-foreground')}>{row.source}</td>;
          }
        })}
      </tr>
      {status === 'fix' && (errorFields.length > 0 || !!row.note) && (
        <tr role="row" className="border-0">
          <td role="gridcell" colSpan={colCount} id={errId} className="px-2 pb-1.5 pl-14 text-xs text-loss">
            <Pencil className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {row.note ? `${row.note} ` : ''}
            {errorFields.map((f) => errors[f]).join(' ')}
          </td>
        </tr>
      )}
      {status === 'ready' && timeNote && (
        <tr role="row" className="border-0">
          <td role="gridcell" colSpan={colCount} className="px-2 pb-1.5 pl-14 text-xs text-warning">
            <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {timeNote}
          </td>
        </tr>
      )}
    </>
  );
}

interface CellEditorProps {
  field: EditableField;
  draft: string;
  label: string;
  ri: number;
  ci: number;
  onDraft: (d: string) => void;
  onCommit: (then?: { r: number; c: number }) => void;
  onCancel: () => void;
}

function CellEditor({ field, draft, label, ri, ci, onDraft, onCommit, onCancel }: CellEditorProps) {
  const done = useRef(false);
  const finish = (then?: { r: number; c: number }) => {
    if (done.current) return;
    done.current = true;
    onCommit(then);
  };
  const cls = 'h-7 w-full rounded-sm border border-input bg-background px-1.5 font-mono text-13 outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      done.current = true;
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      finish({ r: ri, c: ci + (e.shiftKey ? -1 : 1) });
    }
  };
  if (field === 'side') {
    return (
      <select aria-label={label} autoFocus className={cls} value={draft} onChange={(e) => onDraft(e.target.value)} onKeyDown={keys} onBlur={() => finish()}>
        <option value="BUY">Long</option>
        <option value="SELL">Short</option>
      </select>
    );
  }
  const isDate = field === 'openDate' || field === 'closeDate';
  return (
    <input
      aria-label={label}
      autoFocus
      type="text"
      placeholder={isDate ? 'e.g. 3 Dec 2025, 08:41' : undefined}
      inputMode={field === 'symbol' || isDate ? undefined : 'decimal'}
      className={cls}
      value={draft}
      onChange={(e) => onDraft(e.target.value)}
      onKeyDown={keys}
      onBlur={() => finish()}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}
