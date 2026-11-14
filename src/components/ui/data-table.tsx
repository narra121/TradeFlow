import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { scrollParentOf } from '@/lib/scrollParent';
import { cn } from '@/lib/utils';

export interface DataColumn<T> {
  id: string;
  header: string;
  cell: (row: T, index: number) => React.ReactNode;
  align?: 'right';
  /** Sortable columns render a header button with `aria-sort`. */
  sortable?: boolean;
  /** Tailwind width class, e.g. `w-24`. */
  width?: string;
  /** Hidden below this breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Pinned columns stay in view while the table scrolls sideways. */
  pinned?: 'left' | 'right';
  /** Fixed px width of a pinned column; the offsets of several pinned columns on one edge are summed from it. */
  pinWidth?: number;
  /** Accessible name for icon-only headers. */
  srHeader?: boolean;
  /** The header gets a drag handle (and arrow keys) to change its width (E-035). */
  resizable?: boolean;
}

export interface DataGroup<T> {
  key: string;
  label: string;
  rows: T[];
  /** Counts shown after the label, e.g. `5 · 3W 2L`. */
  meta?: React.ReactNode;
  /** Right-aligned summary of the group (net, R). */
  summary?: React.ReactNode;
}

export interface DataSort {
  id: string;
  dir: 'asc' | 'desc';
}

export interface DataSelection {
  selected: ReadonlySet<string>;
  onToggle: (id: string, e: { shiftKey: boolean }) => void;
  /** Checks / unchecks every row currently shown. */
  onTogglePage: (checked: boolean) => void;
  label: (id: string) => string;
}

export interface DataTableProps<T> {
  caption: string;
  rows: T[];
  columns: DataColumn<T>[];
  getRowId: (row: T) => string;
  sort?: DataSort;
  onSort?: (id: string) => void;
  selection?: DataSelection;
  /** Enter / click on a row. */
  onRowOpen?: (row: T) => void;
  openId?: string | null;
  /** Row heights: comfortable 36 px, compact 28 px. */
  density?: 'comfortable' | 'compact';
  groups?: DataGroup<T>[];
  collapsed?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  highlightId?: string | null;
  /** Extra keys handled on a focused row (`S`, `T`, …); return true when handled. */
  onRowKey?: (e: React.KeyboardEvent, row: T) => boolean | void;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
  /** Mounts only the rows near the viewport (E-041); the nearest scrolling ancestor is the scroller. */
  virtualize?: boolean;
  /** Items of the header caret menu of a column (E-034); `null` = no menu for it. `Alt+↓` on the header opens it. */
  renderHeaderMenu?: (column: DataColumn<T>) => React.ReactNode | null;
  /** Widths in px set by the user, by column id; a missing id keeps the natural width. */
  columnWidths?: Record<string, number>;
  /** New width in px, or `null` for "fit" (double-click, the menu's reset). */
  onResizeColumn?: (id: string, width: number | null) => void;
}

const HIDE: Record<NonNullable<DataColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/** Width of the selection column (`w-10`); pinned-left offsets start after it. */
const SELECT_COL_PX = 40;
const HEADER_PX = 32;
const GROUP_PX = 28;
const OVERSCAN = 8;
const MIN_COL_PX = 56;
/** Header, group and row height on touch screens (DESIGN-SHARED S10: 44 px targets); the classes below use `h-11` to match. */
const TOUCH_PX = 44;
const COARSE = '(pointer: coarse)';

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(COARSE).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(COARSE);
    if (!mq) return;
    const onChange = () => setCoarse(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return coarse;
}

type Item<T> = { kind: 'group'; group: DataGroup<T>; top: number } | { kind: 'row'; row: T; index: number; top: number };

/** First index whose item ends below `y`. */
function firstAtOrAfter<T>(items: Item<T>[], heights: (it: Item<T>) => number, y: number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].top + heights(items[mid]) <= y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The one table of the app (E-027): sticky 32 px header, 36 / 28 px rows, one tab stop with a roving row cursor,
 * `aria-sort`, optional selection column, grouping with sticky group headers, pinned columns, header menus, column
 * resize and, for long lists, windowing. It renders markup only; sorting, filtering and selection belong to the screen.
 */
export function DataTable<T>({
  caption, rows, columns, getRowId, sort, onSort, selection, onRowOpen, openId, density = 'comfortable', groups, collapsed, onToggleGroup,
  highlightId, onRowKey, rowClassName, className, virtualize = false, renderHeaderMenu, columnWidths, onResizeColumn,
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const rowEls = useRef(new Map<number, HTMLTableRowElement>());
  const pendingFocus = useRef<number | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const [headerMenu, setHeaderMenu] = useState<string | null>(null);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [scroll, setScroll] = useState({ top: 0, height: 900, offset: 0 });
  const coarse = useCoarsePointer();
  const rowPx = coarse ? TOUCH_PX : density === 'compact' ? 28 : 36;
  const groupPx = coarse ? TOUCH_PX : GROUP_PX;
  const headerPx = coarse ? TOUCH_PX : HEADER_PX;

  const colSpan = columns.length + (selection ? 1 : 0);
  const pageIds = useMemo(() => rows.map(getRowId), [rows, getRowId]);
  const allSelected = !!selection && pageIds.length > 0 && pageIds.every((id) => selection.selected.has(id));
  const someSelected = !!selection && pageIds.some((id) => selection.selected.has(id));

  const { items, total } = useMemo(() => {
    const sections = groups && groups.length > 0 ? groups.map((g) => ({ group: g as DataGroup<T> | null, rows: g.rows })) : [{ group: null as DataGroup<T> | null, rows }];
    const list: Item<T>[] = [];
    let top = 0;
    let index = 0;
    for (const sec of sections) {
      if (sec.group) {
        list.push({ kind: 'group', group: sec.group, top });
        top += groupPx;
      }
      if (sec.group && collapsed?.has(sec.group.key)) continue;
      for (const row of sec.rows) {
        list.push({ kind: 'row', row, index: index++, top });
        top += rowPx;
      }
    }
    return { items: list, total: top };
  }, [groups, rows, collapsed, rowPx, groupPx]);
  const heightOf = useCallback((it: Item<T>) => (it.kind === 'group' ? groupPx : rowPx), [rowPx, groupPx]);
  const rowItems = useMemo(() => items.filter((i): i is Extract<Item<T>, { kind: 'row' }> => i.kind === 'row'), [items]);

  // Where the scroller is, so only the rows near the viewport are mounted.
  useLayoutEffect(() => {
    if (!virtualize) return;
    const table = tableRef.current;
    const parent = scrollParentOf(table);
    const measure = () => {
      if (!table) return;
      const top = parent ? parent.scrollTop : window.scrollY;
      const height = parent ? parent.clientHeight : window.innerHeight;
      const tableTop = table.getBoundingClientRect().top - (parent ? parent.getBoundingClientRect().top : 0) + (parent ? parent.scrollTop : window.scrollY);
      setScroll((s) => (s.top === top && s.height === height && s.offset === tableTop ? s : { top, height, offset: tableTop }));
    };
    measure();
    const target: HTMLElement | Window = parent ?? window;
    target.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const ro = parent && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (parent && ro) ro.observe(parent);
    return () => {
      target.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [virtualize, items.length]);

  const viewTop = scroll.top - scroll.offset - headerPx;
  let start = 0;
  let end = items.length;
  if (virtualize && items.length > 0) {
    start = Math.max(0, firstAtOrAfter(items, heightOf, viewTop) - OVERSCAN);
    end = Math.min(items.length, firstAtOrAfter(items, heightOf, viewTop + scroll.height) + 1 + OVERSCAN);
  }
  // The group header above the window stays mounted so it can stick at the top.
  let stuckGroup: Extract<Item<T>, { kind: 'group' }> | null = null;
  if (virtualize && start > 0 && items[start].kind === 'row') {
    for (let i = start - 1; i >= 0; i--) {
      const it = items[i];
      if (it.kind === 'group') {
        stuckGroup = it;
        break;
      }
    }
  }
  const windowItems = items.slice(start, end);
  const topSpacer = virtualize && start > 0 ? items[start].top - (stuckGroup ? groupPx : 0) : 0;
  const lastItem = items[end - 1];
  const bottomSpacer = virtualize && lastItem ? Math.max(0, total - (lastItem.top + heightOf(lastItem))) : 0;

  const mountedRows = windowItems.filter((i): i is Extract<Item<T>, { kind: 'row' }> => i.kind === 'row');
  const mountedIds = new Set(mountedRows.map((r) => getRowId(r.row)));
  const cursor = cursorId && mountedIds.has(cursorId) ? cursorId : mountedRows[0] ? getRowId(mountedRows[0].row) : null;

  // Focus a row that had to be scrolled into the window first.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const el = rowEls.current.get(pendingFocus.current);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  const focusRow = (i: number) => {
    if (i < 0 || i >= rowItems.length) return;
    const el = rowEls.current.get(i);
    if (el) {
      el.focus();
      return;
    }
    if (!virtualize) return;
    pendingFocus.current = i;
    const parent = scrollParentOf(tableRef.current);
    const y = scroll.offset + headerPx + rowItems[i].top - scroll.height / 2;
    if (parent) parent.scrollTop = Math.max(0, y);
    else window.scrollTo({ top: Math.max(0, y) });
  };

  // The open trade follows prev / next: bring its row into view when it is outside the window.
  useEffect(() => {
    if (!virtualize || !openId) return;
    const hit = rowItems.find((r) => getRowId(r.row) === openId);
    if (!hit) return;
    const y = scroll.offset + headerPx + hit.top;
    if (y < scroll.top + headerPx + groupPx || y + rowPx > scroll.top + scroll.height) {
      const parent = scrollParentOf(tableRef.current);
      const target = Math.max(0, y - scroll.height / 2);
      if (parent) parent.scrollTop = target;
      else window.scrollTo({ top: target });
    }
    // Only when the open trade changes, not on every scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, virtualize]);

  const pinStyle = new Map<string, React.CSSProperties>();
  let leftEdge = selection ? SELECT_COL_PX : 0;
  for (const c of columns) {
    if (c.pinned !== 'left') continue;
    pinStyle.set(c.id, { left: leftEdge, ...(c.pinWidth ? { width: c.pinWidth, minWidth: c.pinWidth, maxWidth: c.pinWidth } : {}) });
    leftEdge += c.pinWidth ?? 0;
  }
  let rightEdge = 0;
  for (const c of [...columns].reverse()) {
    if (c.pinned !== 'right') continue;
    pinStyle.set(c.id, { right: rightEdge, ...(c.pinWidth ? { width: c.pinWidth, minWidth: c.pinWidth, maxWidth: c.pinWidth } : {}) });
    rightEdge += c.pinWidth ?? 0;
  }
  const widthStyle = (c: DataColumn<T>): React.CSSProperties => {
    const w = columnWidths?.[c.id];
    const pin = pinStyle.get(c.id) ?? {};
    return w && !c.pinned ? { ...pin, width: w, minWidth: w, maxWidth: w } : pin;
  };

  const handleKey = (e: React.KeyboardEvent, i: number, row: T) => {
    // Events from portals (a row's menu, a dialog) bubble here through React even though their DOM is outside the row.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return;
    if (onRowKey?.(e, row)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onRowOpen?.(row);
    } else if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      focusRow(i + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      focusRow(i - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusRow(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusRow(rowItems.length - 1);
    } else if ((e.key === ' ' || e.key === 'x' || e.key === 'X') && selection) {
      e.preventDefault();
      selection.onToggle(getRowId(row), { shiftKey: e.shiftKey });
    } else if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') {
      e.preventDefault();
      // Radix menus open on pointer-down or Enter, not on click.
      const trigger = e.currentTarget.querySelector<HTMLElement>('[data-row-menu]');
      trigger?.focus();
      trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  };

  const startResize = (e: React.PointerEvent, c: DataColumn<T>) => {
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const th = handle.closest('th');
    const startX = e.clientX;
    const startW = th?.getBoundingClientRect().width ?? MIN_COL_PX;
    // The handle captures the pointer, so the drag ends on it however it ends (release, cancel, capture lost) and it dies with the handle.
    handle.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => onResizeColumn?.(c.id, Math.max(MIN_COL_PX, Math.round(startW + ev.clientX - startX)));
    const end = () => {
      for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'] as const) handle.removeEventListener(type, type === 'pointermove' ? move : end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  };

  const renderRow = (it: Extract<Item<T>, { kind: 'row' }>, abs: number) => {
    const { row, index: i } = it;
    const id = getRowId(row);
    const isOpen = openId === id;
    const isSelected = !!selection?.selected.has(id);
    return (
      <tr
        key={id}
        ref={(el) => {
          if (el) rowEls.current.set(i, el);
          else rowEls.current.delete(i);
        }}
        tabIndex={id === cursor ? 0 : -1}
        onFocus={(e) => {
          if (e.target === e.currentTarget) setCursorId(id);
        }}
        aria-selected={isSelected || undefined}
        aria-rowindex={virtualize ? abs + 2 : undefined}
        data-state={isOpen ? 'open' : undefined}
        data-row-id={id}
        onClick={(e) => {
          if (!e.currentTarget.contains(e.target as Node)) return;
          if ((e.target as HTMLElement).closest('[role="checkbox"], button, a, input, select')) return;
          onRowOpen?.(row);
        }}
        onKeyDown={(e) => handleKey(e, i, row)}
        className={cn(
          density === 'compact' ? 'h-7' : 'h-9',
          '[@media(pointer:coarse)]:h-11',
          'dt-row group border-b border-border/60 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
          onRowOpen && 'cursor-pointer',
          highlightId === id && 'animate-fade-in',
          rowClassName?.(row),
        )}
      >
        {selection && (
          <td className="sticky left-0 z-sticky px-3">
            <Checkbox checked={isSelected} tabIndex={-1} onClick={(e) => selection.onToggle(id, { shiftKey: (e as unknown as MouseEvent).shiftKey })} aria-label={selection.label(id)} />
          </td>
        )}
        {columns.map((c) => (
          <td key={c.id} className={cn('px-3', c.align === 'right' && 'text-right', c.hideBelow && HIDE[c.hideBelow], c.pinned && 'sticky z-sticky')} style={widthStyle(c)}>
            {c.cell(row, i)}
          </td>
        ))}
      </tr>
    );
  };

  const renderGroup = (it: Extract<Item<T>, { kind: 'group' }>, abs: number, key?: string) => {
    const g = it.group;
    const open = !collapsed?.has(g.key);
    return (
      <tr key={key ?? `g-${g.key}`} aria-rowindex={virtualize ? abs + 2 : undefined} className="sticky top-8 z-sticky h-7 border-b border-border bg-background text-xs [@media(pointer:coarse)]:top-11 [@media(pointer:coarse)]:h-11">
        <th scope="rowgroup" colSpan={colSpan} className="px-3 text-left font-normal">
          <button
            type="button"
            onClick={() => onToggleGroup?.(g.key)}
            onKeyDown={(e) => {
              if ((e.key === 'ArrowLeft' && open) || (e.key === 'ArrowRight' && !open)) {
                e.preventDefault();
                onToggleGroup?.(g.key);
              }
            }}
            aria-expanded={open}
            className="flex w-full items-center gap-2 py-1 text-left [@media(pointer:coarse)]:min-h-11"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="font-medium text-foreground">{g.label}</span>
            {g.meta && <span className="text-muted-foreground">{g.meta}</span>}
            {g.summary && <span className="sticky right-0 ml-auto flex items-center gap-3 -mr-3 bg-background pl-3 pr-3 font-mono tabular-nums">{g.summary}</span>}
          </button>
        </th>
      </tr>
    );
  };

  return (
    <table ref={tableRef} className={cn('w-full text-13', className)} aria-rowcount={virtualize ? items.length + 1 : undefined}>
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 z-sticky bg-background">
        <tr className="h-8 border-b border-border [@media(pointer:coarse)]:h-11" aria-rowindex={virtualize ? 1 : undefined}>
          {selection && (
            <th scope="col" className="sticky left-0 z-sticky w-10 bg-background px-3 text-left">
              <Checkbox checked={allSelected ? true : someSelected ? 'indeterminate' : false} onCheckedChange={(c) => selection.onTogglePage(c === true)} aria-label="Select all rows shown" />
            </th>
          )}
          {columns.map((c) => {
            const active = sort?.id === c.id;
            const Icon = !active ? ArrowUpDown : sort?.dir === 'asc' ? ArrowUp : ArrowDown;
            const menu = renderHeaderMenu?.(c) ?? null;
            return (
              <th
                key={c.id}
                scope="col"
                aria-sort={c.sortable ? (active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                className={cn('group/th relative px-3 text-xs font-medium text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left', c.width, c.hideBelow && HIDE[c.hideBelow], c.pinned && 'sticky z-sticky bg-background')}
                style={widthStyle(c)}
              >
                <DropdownMenu open={headerMenu === c.id} onOpenChange={(o) => setHeaderMenu(o ? c.id : null)}>
                  <span className={cn('inline-flex max-w-full items-center gap-0.5', c.align === 'right' && 'flex-row-reverse')}>
                    {c.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.id)}
                        onKeyDown={(e) => {
                          if (menu && e.altKey && e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHeaderMenu(c.id);
                          }
                        }}
                        className={cn('inline-flex min-h-6 items-center gap-1 truncate hover:text-foreground [@media(pointer:coarse)]:min-h-11', c.align === 'right' && 'flex-row-reverse', active && 'text-foreground')}
                      >
                        {c.header}
                        <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    ) : c.srHeader ? (
                      <span className="sr-only">{c.header}</span>
                    ) : (
                      c.header
                    )}
                    {menu && (
                      <DropdownMenuTrigger asChild>
                        <button type="button" data-header-menu aria-label={`${c.header} column menu`} className="flex h-6 w-6 items-center justify-center rounded opacity-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/th:opacity-100 data-[state=open]:opacity-100">
                          <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                    )}
                  </span>
                  {menu && <DropdownMenuContent align={c.align === 'right' ? 'end' : 'start'}>{menu}</DropdownMenuContent>}
                </DropdownMenu>
                {c.resizable && onResizeColumn && (
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${c.header} column`}
                    aria-valuenow={columnWidths?.[c.id] ?? measured[c.id] ?? 120}
                    aria-valuemin={MIN_COL_PX}
                    onFocus={(e) => {
                      const w = Math.round((e.currentTarget.closest('th') as HTMLElement | null)?.getBoundingClientRect().width ?? 0);
                      if (w) setMeasured((m) => (m[c.id] === w ? m : { ...m, [c.id]: w }));
                    }}
                    tabIndex={0}
                    onPointerDown={(e) => startResize(e, c)}
                    onDoubleClick={() => onResizeColumn(c.id, null)}
                    onKeyDown={(e) => {
                      const th = (e.currentTarget as HTMLElement).closest('th');
                      const w = columnWidths?.[c.id] ?? th?.getBoundingClientRect().width ?? MIN_COL_PX;
                      if (e.key === 'ArrowRight') onResizeColumn(c.id, Math.round(w + 8));
                      else if (e.key === 'ArrowLeft') onResizeColumn(c.id, Math.max(MIN_COL_PX, Math.round(w - 8)));
                      else if (e.key === 'Enter') onResizeColumn(c.id, null);
                      else return;
                      e.preventDefault();
                    }}
                    className="absolute inset-y-1 right-0 w-1.5 cursor-col-resize touch-none rounded hover:bg-primary/40 focus-visible:bg-primary/50"
                  />
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {topSpacer > 0 && (
          <tr aria-hidden="true" style={{ height: topSpacer }}>
            <td colSpan={colSpan} className="p-0" />
          </tr>
        )}
        {stuckGroup && renderGroup(stuckGroup, items.indexOf(stuckGroup), 'stuck')}
        {windowItems.map((it, k) => (
          <Fragment key={it.kind === 'group' ? `g-${it.group.key}` : getRowId(it.row)}>{it.kind === 'group' ? renderGroup(it, start + k) : renderRow(it, start + k)}</Fragment>
        ))}
        {bottomSpacer > 0 && (
          <tr aria-hidden="true" style={{ height: bottomSpacer }}>
            <td colSpan={colSpan} className="p-0" />
          </tr>
        )}
      </tbody>
    </table>
  );
}
