import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown, Download, Image as ImageIcon, NotebookPen, Tag as TagIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DirectionChip, OUTCOME_LABEL } from '@/components/ui/chips';
import { Money, RMultiple } from '@/components/ui/money';
import { ActivationPanel } from '@/components/onboarding/ActivationPanel';
import { ColumnsMenu } from '@/components/tradelog/ColumnsMenu';
import { TradeTable } from '@/components/tradelog/TradeTable';
import { BulkBar, type BulkProgress } from '@/components/tradelog/BulkBar';
import { ScopeBarSlot, usePageChrome, type ChromeTab } from '@/components/shell/chrome';
import { usePaneLayout } from '@/components/trade/paneLayout';
import { useAccounts } from '@/hooks/useAccounts';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReadOnlyAccounts } from '@/hooks/useReadOnlyAccounts';
import { FilterBar, type FilterFieldKey, type FilterOptions } from '@/components/tradelog/FilterBar';
import { copy } from '@/copy';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import { useWindowedList } from '@/hooks/useWindowedList';
import { CellPicker, type CellKind } from '@/components/tradelog/CellPicker';
import { clearSticky, newStickyState, withStickyRows } from '@/lib/stickyRows';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { DRILL_KEYS, DRILL_ORIGIN_PATH, drillLabel, drillMatch, parseDrillDown } from '@/lib/drillDown';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useUiState, patchUiState } from '@/hooks/useUiState';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { setSelectedAccount } from '@/store/slices/accountsSlice';
import { useBulkUpdateTradesMutation, useUpdateTradeMutation } from '@/store/api';
import { BULK_EDIT_CAP, fanOut, inverseOf, patchFor, type BulkOp, type FanOutResult } from '@/lib/bulkPatch';
import { bulkUpdateBody, cachePatch } from '@/components/tradelog/bulkUpdate';
import { readApiError } from '@/lib/apiError';
import { downloadCsv, exportFileName, tradesToCsv } from '@/lib/exportCsv';
import { formatDateShort, formatDateTime, formatMoney, formatPercent } from '@/lib/format';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { appTimeZone } from '@/lib/appTimeZone';
import { patchTradePayload } from '@/lib/patchTrade';
import { BUILT_IN_VIEWS, isModified, loadCustomViews, matchesSpecial, needsJournal, newViewId, saveCustomViews, type TradeView } from '@/lib/savedViews';
import { loadColumnConfig, presetColumns, saveColumnConfig, type ColumnConfig } from '@/lib/tradeColumns';
import {
  DEFAULT_SORT, EMPTY_FILTERS, applyFilters, distinctValues, hasActiveFilters, loadListState, realisedR, saveListState, sortTrades, summarise,
  type SortKey, type SortState, type TradeFilters,
} from '@/lib/tradeFilters';
import { GROUP_OPTIONS, groupTrades, type GroupBy } from '@/lib/tradeGroups';
import { cn } from '@/lib/utils';
import type { CreateTradePayload } from '@/lib/api';
import type { Trade } from '@/types/trade';

const SORT_KEY = 'tradequt-table-sort';
const ACTIVE_VIEW_KEY = 'tq.tradelog.activeView';

function readSort(): SortState {
  try {
    const raw = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null') as Partial<SortState> | null;
    if (raw?.key && raw.dir) return raw as SortState;
  } catch {
    // ignore, default below
  }
  return DEFAULT_SORT;
}

export function TradeLogView() {
  const dispatch = useAppDispatch();
  const filtersState = useAppSelector((s) => s.trades.filters);
  const { accounts, selectedAccountId } = useAccounts();
  const param = useTradeParam();
  const readOnlyIds = useReadOnlyAccounts();
  const { presentation, setWalkOrder } = usePaneLayout();
  const isMobile = useIsMobile();
  const [ui] = useUiState();
  const { options: saved, addStrategy, addSession, addMarketCondition, addMistake, addTag } = useSavedOptions();
  const { rules } = useTradingRules();
  const [bulkUpdate] = useBulkUpdateTradesMutation();
  const [updateTrade] = useUpdateTradeMutation();

  const savedList = useRef(loadListState());
  const [filters, setFilters] = useState<TradeFilters>(() => (savedList.current ? { ...EMPTY_FILTERS, ...savedList.current } : EMPTY_FILTERS));
  const [sort, setSort] = useState<SortState>(readSort);
  const [columns, setColumns] = useState<ColumnConfig>(loadColumnConfig);
  const [groupBy, setGroupBy] = useState<GroupBy>(() => (sessionStorage.getItem('tq.tradelog.group') as GroupBy) || 'day');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customViews, setCustomViews] = useState<TradeView[]>(loadCustomViews);
  const [activeViewId, setActiveViewId] = useState<string>(() => localStorage.getItem(ACTIVE_VIEW_KEY) ?? 'all');
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [undoStack, setUndoStack] = useState<{ id: string; patch: Partial<CreateTradePayload> }[] | null>(null);
  const [failed, setFailed] = useState<{ trade: Trade; patch: Partial<CreateTradePayload> }[]>([]);
  const [failedReason, setFailedReason] = useState<string | undefined>();
  // Drill-downs arrive as URL parameters from the Dashboard, Analytics, Goals and the import result (lib/drillDown.ts).
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const drill = useMemo(() => parseDrillDown(search), [search]);
  // Weekday and hour links carry the zone /stats used; a link without one reads in the app's time zone (the preference).
  const drillZone = drill?.zone ?? appTimeZone();
  const importBatch = useMemo(() => new URLSearchParams(search).get('importBatch') || undefined, [search]);
  const { trades, isLoading, isFetching, isError, error: scopeError, refetch, truncated } = useScopeTrades(
    importBatch ? { accountId: filtersState.accountId, startDate: filtersState.startDate, endDate: filtersState.endDate, importBatchId: importBatch } : undefined,
  );
  const lastClicked = useRef<string | null>(null);
  const bulkRunning = useRef(false);
  const failedOp = useRef<BulkOp | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const showAccount = !selectedAccountId;
  const allViews = useMemo(() => [...BUILT_IN_VIEWS, ...customViews], [customViews]);
  const activeView = allViews.find((v) => v.id === activeViewId) ?? BUILT_IN_VIEWS[0];

  // An edited row that no longer matches stays until the next filter / sort / scope change or Shift+R (E-051).
  const sticky = useRef(newStickyState());
  const [stickyTick, setStickyTick] = useState(0);
  const listSig = JSON.stringify([filters, activeViewId, sort, search, filtersState.accountId, filtersState.startDate, filtersState.endDate]);
  const filtered = useMemo(() => {
    let base = activeView.special ? trades.filter((t) => matchesSpecial(activeView.special, t)) : trades;
    if (drill) base = base.filter((t) => drillMatch(t, drill, drillZone));
    const fresh = sortTrades(applyFilters(base, filters), sort, accountMap);
    return withStickyRows(fresh, trades, sticky.current, listSig, (rows) => sortTrades(rows, sort, accountMap));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stickyTick re-runs the memo after Shift+R
  }, [trades, filters, sort, accountMap, activeView.special, drill, drillZone, listSig, stickyTick]);
  // Every filtered trade (≤ 5,000) is in the list: the table mounts only the rows near the viewport (E-041).
  const pageTrades = filtered;
  const summary = useMemo(() => summarise(filtered, accountMap), [filtered, accountMap]);
  const needsJournalCount = useMemo(() => trades.filter(needsJournal).length, [trades]);
  const spansYears = useMemo(() => new Set(trades.map((t) => (t.exitDate || t.entryDate).slice(0, 4))).size > 1, [trades]);

  useEffect(() => saveListState({ ...filters, page: 1 }), [filters]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === 'search') searchRef.current?.focus();
  }, []);

  // A selection never outlives the list it was made in.
  const filterSignature = JSON.stringify(filters) + search + activeViewId + filtersState.accountId + filtersState.startDate + filtersState.endDate;
  useEffect(() => {
    setSelected(new Set());
    lastClicked.current = null;
    setUndoStack(null);
    setFailed([]);
  }, [filterSignature]);

  // Links into Trades: `?find=<text>` fills Find, `?view=<id>` opens a saved view (the palette uses both).
  useEffect(() => {
    const q = new URLSearchParams(search);
    const find = q.get('find');
    const viewId = q.get('view');
    if (find === null && viewId === null) return;
    const v = viewId ? allViews.find((x) => x.id === viewId) : null;
    if (v) applyView(v);
    if (find !== null) update({ q: find });
    q.delete('find');
    q.delete('view');
    navigate({ pathname, search: q.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the URL only
  }, [search]);

  // A rule copied into a goals period has the id <period>#<date>#<ruleId>; it is the same rule.
  const ruleName = (id: string) => (rules.find((r) => r.ruleId === id) ?? rules.find((r) => r.ruleId === id.split('#').pop()))?.rule ?? 'Rule removed';
  const drillText = drill ? drillLabel(drill, ruleName, drillZone) : `This import (${trades.length})`;
  const clearDrill = () => {
    const q = new URLSearchParams(search);
    [...DRILL_KEYS, 'importBatch'].forEach((k) => q.delete(k));
    navigate({ pathname, search: q.toString() }, { replace: true });
  };
  const backToOrigin = () => {
    if (!drill?.src) return;
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1);
    else navigate(DRILL_ORIGIN_PATH[drill.src]);
  };

  const update = (patch: Partial<TradeFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const options = useMemo(
    () => ({
      symbols: distinctValues(trades, (t) => t.symbol),
      outcomes: distinctValues(trades, (t) => t.outcome).map((o) => ({ ...o, label: OUTCOME_LABEL[o.value as keyof typeof OUTCOME_LABEL] ?? o.value })),
      strategies: distinctValues(trades, (t) => t.strategy ?? t.setup),
      sessions: distinctValues(trades, (t) => t.session),
      mistakes: distinctValues(trades, (t) => t.mistakes),
      tags: distinctValues(trades, (t) => t.tags),
      assets: distinctValues(trades, (t) => t.assetClass),
      broken: distinctValues(trades, (t) => t.brokenRuleIds).map((o) => ({ ...o, label: ruleName(o.value) })),
    }),
    [trades, rules],
  );
  const filterOptions: FilterOptions = useMemo(() => ({ ...options, accounts: accounts.map((a) => ({ value: a.id, label: a.name })) }), [options, accounts]);

  // ── views ──────────────────────────────────────────────────────────────────
  const live = { filters, sort, group: groupBy, columns };
  const modified = isModified(activeView, live);
  const applyView = (v: TradeView) => {
    setActiveViewId(v.id);
    localStorage.setItem(ACTIVE_VIEW_KEY, v.id);
    setFilters(v.filters);
    setSort(v.sort);
    setGroupBy(v.group);
    setColumns(v.columns);
    saveColumnConfig(v.columns);
    setCollapsedGroups(new Set());
  };
  const saveCurrent = () => {
    if (activeView.builtIn) return setSaveOpen(true);
    const next = customViews.map((v) => (v.id === activeView.id ? { ...v, ...live } : v));
    setCustomViews(next);
    saveCustomViews(next);
  };
  const saveAs = () => {
    const name = viewName.trim();
    if (!name) return;
    const v: TradeView = { id: newViewId(), name, ...live };
    const next = [...customViews, v];
    setCustomViews(next);
    saveCustomViews(next);
    setActiveViewId(v.id);
    localStorage.setItem(ACTIVE_VIEW_KEY, v.id);
    setSaveOpen(false);
    setViewName('');
  };
  const removeView = (id: string) => {
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    saveCustomViews(next);
    if (activeViewId === id) applyView(BUILT_IN_VIEWS[0]);
  };

  const tabs: ChromeTab[] = allViews.map((v) => ({
    id: v.id,
    label: v.name,
    active: v.id === activeViewId,
    badge: v.id === 'needs-journal' && !isError && !isLoading ? needsJournalCount : undefined,
    onSelect: () => applyView(v),
  }));
  // No count while the list is loading or failed: 0 would say the journal is empty.
  usePageChrome({ count: isError || isLoading ? undefined : filtered.length !== trades.length ? `${filtered.length} of ${trades.length}` : trades.length, tabs, selecting: selected.size > 0 });

  const onSort = (key: SortKey) => {
    const text = key === 'symbol' || key === 'account' || key === 'strategy' || key === 'outcome' || key === 'session' || key === 'market' || key === 'side' || key === 'asset';
    const next: SortState = sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: text ? 'asc' : 'desc' };
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(next));
    } catch {
      // not persisted
    }
  };

  const changeGroup = (g: GroupBy) => {
    setGroupBy(g);
    setCollapsedGroups(new Set());
    sessionStorage.setItem('tq.tradelog.group', g);
  };
  // Grouping by a date unit only makes sense in date order; any other sort turns it off.
  const effectiveGroup: GroupBy = groupBy === 'day' || groupBy === 'week' || groupBy === 'month' ? (sort.key === 'date' ? groupBy : 'none') : groupBy;
  const groups = useMemo(() => groupTrades(pageTrades, effectiveGroup, accountMap), [pageTrades, effectiveGroup, accountMap]);
  // The rows in the order the table shows them (group order when grouped): the pane's Prev / Next and Shift-click ranges follow it.
  const visibleOrder = useMemo(() => (effectiveGroup === 'none' ? pageTrades : groups.flatMap((g) => g.trades)), [pageTrades, groups, effectiveGroup]);
  const rangeOrder = useMemo(
    () => (effectiveGroup === 'none' ? pageTrades : groups.filter((g) => !collapsedGroups.has(g.key)).flatMap((g) => g.trades)),
    [pageTrades, groups, effectiveGroup, collapsedGroups],
  );
  useEffect(() => {
    setWalkOrder(visibleOrder.map((t) => t.id));
    return () => setWalkOrder(null);
  }, [visibleOrder, setWalkOrder]);
  const tradeById = useMemo(() => new Map(trades.map((t) => [t.id, t])), [trades]);
  const toggleGroup = (k: string) =>
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // ── selection ──────────────────────────────────────────────────────────────
  const toggle = useCallback(
    (id: string, e: { shiftKey: boolean }) => {
      // The range runs over the rows on screen, from the last row clicked, and skips the rows of collapsed groups.
      const idx = rangeOrder.findIndex((t) => t.id === id);
      const from = lastClicked.current === null ? -1 : rangeOrder.findIndex((t) => t.id === lastClicked.current);
      setSelected((prev) => {
        const next = new Set(prev);
        if (e.shiftKey && from !== -1 && idx !== -1) {
          const [a, b] = [Math.min(from, idx), Math.max(from, idx)];
          const add = !prev.has(id);
          for (let i = a; i <= b; i++) {
            if (add) next.add(rangeOrder[i].id);
            else next.delete(rangeOrder[i].id);
          }
        } else if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastClicked.current = id;
    },
    [rangeOrder],
  );
  const togglePage = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageTrades.forEach((t) => (checked ? next.add(t.id) : next.delete(t.id)));
      return next;
    });
  const selectedTrades = useMemo(() => filtered.filter((t) => selected.has(t.id)), [filtered, selected]);

  // ── bulk edit: one bulk-update call (the server merges lists); moving trades to an account and Undo stay one update per trade ──
  type BulkItem = { trade: Trade; patch: Partial<CreateTradePayload> };
  const runPatches = async (items: BulkItem[]) => {
    setProgress({ done: 0, total: items.length });
    const res = await fanOut(
      items,
      async ({ trade, patch }) => {
        await updateTrade({ id: trade.id, payload: patchTradePayload(trade, patch) }).unwrap();
      },
      { onProgress: (done, total) => setProgress({ done, total }) },
    );
    setProgress(null);
    return res;
  };

  const runBulk = async (op: BulkOp, items: BulkItem[]): Promise<FanOutResult<BulkItem>> => {
    const body = bulkUpdateBody(op);
    if (!body) return runPatches(items);
    setProgress({ done: 0, total: items.length });
    try {
      const patches = Object.fromEntries(items.map((i) => [i.trade.id, cachePatch(i.patch)]));
      const res = await bulkUpdate({ tradeIds: items.map((i) => i.trade.id), ...body, patches }).unwrap();
      const updated = new Set(res.updatedIds);
      return {
        done: items.filter((i) => updated.has(i.trade.id)),
        failed: items.filter((i) => !updated.has(i.trade.id)),
        reason: res.failed[0]?.message ?? (res.notFound.length > 0 ? 'Some of the trades no longer exist.' : undefined),
      };
    } catch (err) {
      return { done: [], failed: items, reason: readApiError(err, '').message || undefined };
    } finally {
      setProgress(null);
    }
  };

  const applyBulk = async (op: BulkOp, targets: Trade[] = selectedTrades) => {
    // A second pick while one is running would start from the trades as they were before the first.
    if (bulkRunning.current) return;
    const items = targets
      .slice(0, BULK_EDIT_CAP)
      .map((trade) => ({ trade, patch: patchFor(trade, op) }))
      .filter((i): i is BulkItem => !!i.patch);
    if (items.length === 0) return void toast.message('Nothing to change', { description: 'Every trade already has this value.' });
    bulkRunning.current = true;
    try {
      const res = await runBulk(op, items);
      failedOp.current = op;
      setFailed(res.failed);
      setFailedReason(res.reason);
      setUndoStack(res.done.map((i) => ({ id: i.trade.id, patch: inverseOf(i.trade, i.patch) })));
    } finally {
      bulkRunning.current = false;
    }
  };
  const undoBulk = async () => {
    if (!undoStack) return;
    const byId = new Map(trades.map((t) => [t.id, t]));
    const items = undoStack.map((u) => ({ trade: byId.get(u.id), patch: u.patch })).filter((i): i is { trade: Trade; patch: Partial<CreateTradePayload> } => !!i.trade);
    setUndoStack(null);
    await runPatches(items);
  };
  const retryFailed = async () => {
    const op = failedOp.current;
    if (!op || bulkRunning.current) return;
    const items = failed;
    setFailed([]);
    bulkRunning.current = true;
    try {
      const res = await runBulk(op, items);
      setFailed(res.failed);
      setFailedReason(res.reason);
    } finally {
      bulkRunning.current = false;
    }
  };

  const undoableDelete = useUndoableDelete();
  const deleteSelected = async () => {
    // The pane would go on asking for a trade that no longer exists.
    if (param.trade && selected.has(param.trade)) param.close();
    if (await undoableDelete(selectedTrades)) setSelected(new Set());
    else void refetch();
  };

  // ── export ─────────────────────────────────────────────────────────────────
  const exportRows = (scope: 'view' | 'selection' | 'scope') => {
    const rows = scope === 'selection' ? selectedTrades : scope === 'view' ? filtered : trades;
    if (rows.length === 0) return;
    downloadCsv(tradesToCsv(rows, accountMap), exportFileName(scope));
  };

  // ── cell pickers (E-043) and keys (E-052) ─────────────────────────────────
  const [cellPicker, setCellPicker] = useState<{ kind: CellKind; ids: string[]; anchor: HTMLElement } | null>(null);
  const openCellPicker = useCallback(
    (kind: CellKind, trade: Trade, anchor: HTMLElement) => {
      if (trade.accountId && readOnlyIds.has(trade.accountId)) return;
      if (!navigator.onLine) return void toast.message(copy.offline.pickerTitle, { description: copy.offline.pickerBody });
      setCellPicker({ kind, ids: selected.has(trade.id) && selected.size > 1 ? [...selected] : [trade.id], anchor });
    },
    [readOnlyIds, selected],
  );
  const onRowKey = (e: React.KeyboardEvent, t: Trade): boolean => {
    if (!ui.singleKeyShortcuts || e.ctrlKey || e.metaKey || e.altKey) return false;
    const kind: CellKind | null = e.key === 's' ? 'strategy' : e.key === 't' ? 'mistakes' : e.key === 'T' ? 'tags' : null;
    if (!kind) return false;
    e.preventDefault();
    openCellPicker(kind, t, e.currentTarget as HTMLElement);
    return true;
  };
  const pickerTargets = cellPicker ? trades.filter((t) => cellPicker.ids.includes(t.id)) : [];
  const pickerOptions = (kind: CellKind): string[] => {
    const list = { strategy: saved.strategies, session: saved.sessions, market: saved.marketConditions, mistakes: saved.mistakes, tags: saved.tags }[kind];
    return list ?? [];
  };
  const pickerCreate = (kind: CellKind) => ({ strategy: addStrategy, session: addSession, market: addMarketCondition, mistakes: addMistake, tags: addTag })[kind];

  // `Shift+R` (the app shell refetches) lets rows that no longer match leave (E-016, E-051).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== 'R' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      clearSticky(sticky.current);
      setStickyTick((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── row actions ────────────────────────────────────────────────────────────
  const actions = useMemo(
    () => ({
      onEdit: (id: string) => param.openEdit(id),
      onDuplicate: (id: string) => param.openNew({ from: id }),
      onDelete: (id: string) => {
        const t = tradeById.get(id);
        if (!t) return;
        if (param.trade === id) param.close();
        void undoableDelete([t]);
      },
    }),
    [param, tradeById, undoableDelete],
  );


  const compact = presentation === 'docked';
  const activeFilters = hasActiveFilters(filters);
  const noTradesAtAll = !isLoading && !isError && trades.length === 0;
  const selectedSummary = useMemo(() => summarise(selectedTrades, accountMap), [selectedTrades, accountMap]);

  // Column widths and hiding through the header menu (E-034 / E-035).
  const resizeColumn = (id: string, width: number | null) => {
    const widths = { ...(columns.widths ?? {}) };
    if (width === null) delete widths[id];
    else widths[id] = width;
    const next: ColumnConfig = { ...columns, widths: Object.keys(widths).length ? widths : undefined };
    setColumns(next);
    saveColumnConfig(next);
  };
  const hideColumn = (id: string) => {
    const active = columns.preset === 'custom' ? columns.custom : presetColumns(columns.preset);
    const next: ColumnConfig = { ...columns, preset: 'custom', custom: active.filter((c) => c !== id) };
    setColumns(next);
    saveColumnConfig(next);
  };
  const [openField, setOpenField] = useState<{ key: FilterFieldKey; nonce: number } | null>(null);

  // `Esc` clears the selection when nothing else is open (D.8).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || selected.size === 0 || e.defaultPrevented || param.trade) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"], [data-radix-popper-content-wrapper]')) return;
      setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size, param.trade]);

  // Phone list: sticky day headers, 60 px cards, windowed (E-050 / R-fe-app-014); selection is a mode, not resting checkboxes.
  const phoneRef = useRef<HTMLUListElement>(null);
  const pressTimer = useRef<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const phoneItems = useMemo(() => {
    const list: ({ kind: 'head'; g: (typeof groups)[number]; top: number; height: number } | { kind: 'card'; t: Trade; top: number; height: number })[] = [];
    let top = 0;
    const sections = effectiveGroup === 'none' ? [{ key: 'all', label: '', trades: pageTrades } as (typeof groups)[number]] : groups;
    for (const g of sections) {
      if (g.label) {
        list.push({ kind: 'head', g, top, height: 32 });
        top += 32;
      }
      for (const t of g.trades) {
        list.push({ kind: 'card', t, top, height: 60 });
        top += 60;
      }
    }
    return list;
  }, [groups, effectiveGroup, pageTrades]);
  const phoneWin = useWindowedList(phoneRef, phoneItems, isMobile && phoneItems.length > 60);
  useEffect(() => {
    if (selected.size === 0 && !isMobile) setSelectMode(false);
  }, [selected.size, isMobile]);

  const statusLine = (sum: ReturnType<typeof summarise>, list: Trade[], withFees: boolean) => {
    const rs = list.map(realisedR).filter((r): r is number => r !== null);
    const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;
    // Fees are per currency: a USD and an INR fee never add up to one figure.
    const fees = new Map<string, number>();
    for (const t of list) {
      const currency = t.accountId ? accountMap.get(t.accountId)?.currency : undefined;
      if (currency && t.fees) fees.set(currency, (fees.get(currency) ?? 0) + t.fees);
    }
    return (
      <>
        {sum.byCurrency.map((c) => (
          <span key={c.currency} className="text-muted-foreground">
            {c.currency} <Money value={c.net} currency={c.currency} />
          </span>
        ))}
        {sum.winRate !== null && <span className="text-muted-foreground">Win {formatPercent(sum.winRate)}</span>}
        {avgR !== null && <span className="text-muted-foreground">Avg <RMultiple value={avgR} /></span>}
        {withFees && fees.size > 0 && <span className="hidden text-muted-foreground lg:inline">Fees {[...fees].map(([currency, amount]) => formatMoney(amount, currency)).join(' · ')}</span>}
        {withFees && sum.noAccount > 0 && <span className="hidden text-muted-foreground xl:inline">{sum.noAccount} with no account not in totals</span>}
      </>
    );
  };

  const renderBulkBar = (inline: boolean) => (
        <BulkBar
          inline={inline}
          selectedTrades={selectedTrades}
          summary={selectedSummary}
          matchingCount={filtered.length}
          options={{
            strategies: saved.strategies ?? [],
            sessions: saved.sessions ?? [],
            markets: saved.marketConditions ?? [],
            mistakes: saved.mistakes ?? [],
            tags: options.tags.map((t) => t.value),
            rules: rules.map((r) => ({ id: r.ruleId, label: r.rule })),
            accounts: accounts.filter((a) => a.status === 'active'),
          }}
          progress={progress}
          onCreateOption={(kind, value) => (kind === 'mistakes' ? addMistake(value) : addTag(value))}
          canUndo={!!undoStack && undoStack.length > 0}
          failedCount={failed.length}
          failedReason={failedReason}
          onSelectAllMatching={() => setSelected(new Set(filtered.map((t) => t.id)))}
          onClear={() => setSelected(new Set())}
          onApply={(op) => void applyBulk(op)}
          onUndo={() => void undoBulk()}
          onRetryFailed={() => void retryFailed()}
          onExport={() => exportRows('selection')}
          onDelete={deleteSelected}
        />
  );

  // Phones show these in the Filters sheet: in the scope bar they would squeeze the period control.
  const viewControls = modified ? (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={saveCurrent}>Save</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => applyView(activeView)}>Reset</Button>
    </>
  ) : !activeView.builtIn ? (
    <Button type="button" variant="ghost" size="sm" onClick={() => removeView(activeView.id)}>Delete view</Button>
  ) : null;

  const drillControls = (
    <>
      {(drill || importBatch) && (
        <Button type="button" variant="outline" size="sm" className="h-7 min-w-0 max-w-[260px] shrink justify-start truncate" onClick={clearDrill} aria-label={`Remove filter: ${drillText}`}>
          <span className="truncate">{drillText}</span> <X className="ml-1 h-3 w-3 shrink-0" aria-hidden="true" />
        </Button>
      )}
      {drill?.src && (
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0" onClick={backToOrigin}>
          Back to {drill.src === 'analytics' ? 'Analytics' : 'Dashboard'}
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <ScopeBarSlot side="left">
        <FilterBar
          filters={filters}
          options={filterOptions}
          onChange={update}
          onFind={(q) => update({ q })}
          findRef={searchRef}
          openField={openField}
          isMobile={isMobile}
          sheetExtra={(closeSheet) => (
            <div className="space-y-2 border-t border-border pt-3">
              {viewControls && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">View: {activeView.name}</span>
                  {viewControls}
                </div>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={() => { setSelectMode(true); closeSheet(); }}>
                Select trades
              </Button>
              <label className="flex items-center justify-between gap-3 text-sm">
                Group by
                <select value={groupBy} onChange={(e) => changeGroup(e.target.value as GroupBy)} className="h-11 rounded-md border border-input bg-background px-2 text-sm">
                  {GROUP_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </label>
              <Button type="button" variant="outline" className="w-full" disabled={trades.length === 0} onClick={() => exportRows('view')}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Export this view ({filtered.length})
              </Button>
            </div>
          )}
        />
        {!isMobile && drillControls}
        {activeFilters && !isMobile && (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear
          </Button>
        )}
      </ScopeBarSlot>
      <ScopeBarSlot side="right">
        {!isMobile && viewControls}
        {!isMobile && (<>
        <label htmlFor="group-by" className="sr-only">Group by</label>
        <Select value={groupBy} onValueChange={(v) => changeGroup(v as GroupBy)}>
          <SelectTrigger id="group-by" className="h-7 w-auto shrink-0 gap-1.5 px-2 text-xs">
            <SelectValue>Group: {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {effectiveGroup !== 'none' && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0" aria-label={collapsedGroups.size ? 'Expand all groups' : 'Collapse all groups'} onClick={() => setCollapsedGroups(collapsedGroups.size ? new Set() : new Set(groups.map((g) => g.key)))}>
            {collapsedGroups.size ? <ChevronsUpDown className="h-3.5 w-3.5 2xl:hidden" aria-hidden="true" /> : <ChevronsDownUp className="h-3.5 w-3.5 2xl:hidden" aria-hidden="true" />}
            <span className="hidden 2xl:inline">{collapsedGroups.size ? 'Expand all' : 'Collapse all'}</span>
          </Button>
        )}
        <ColumnsMenu config={columns} onChange={(c) => { setColumns(c); saveColumnConfig(c); }} density={ui.density} onDensity={(d) => patchUiState({ density: d })} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={trades.length === 0} aria-label="Export">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden 2xl:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => exportRows('view')} disabled={filtered.length === 0}>This view ({filtered.length})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportRows('selection')} disabled={selected.size === 0}>Selection ({selected.size})</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportRows('scope')}>Everything in scope ({trades.length})</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </>)}
      </ScopeBarSlot>

      {/* Phones: the scope bar has no room left for the drill chip and its way back, so they sit above the list. */}
      {isMobile && (drill || importBatch) && <div className="flex min-w-0 flex-wrap items-center gap-2">{drillControls}</div>}
      {truncated && <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{copy.trades.ceiling}</p>}

      {isError ? (
        <ErrorState title={copy.trades.loadError.title} description={copy.trades.loadError.description} error={scopeError} onRetry={refetch} />
      ) : isLoading ? (
        <div role="status" className="space-y-1.5" aria-busy="true" aria-label="Loading trades">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : noTradesAtAll ? (
        filtersState.datePreset === 'all' && filtersState.accountId === 'ALL' ? (
          <ActivationPanel />
        ) : (
          <EmptyState
            title={copy.trades.emptyScope.title}
            description={copy.trades.emptyScope.description}
            action={
              <Button size="sm" variant="outline" onClick={() => { dispatch(setDateRangeFilter({ startDate: '2000-01-01', endDate: formatLocalDateOnly(new Date()), datePreset: 'all' })); dispatch(setSelectedAccount(null)); }}>
                {copy.trades.emptyScope.action}
              </Button>
            }
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState title={copy.trades.emptyMatch.title} action={<Button size="sm" variant="outline" onClick={() => { setFilters(EMPTY_FILTERS); applyView(BUILT_IN_VIEWS[0]); }}>{copy.trades.emptyMatch.action}</Button>} />
      ) : (
        <>
          <div className={cn('hidden overflow-x-auto rounded-lg border border-border md:block', isFetching && 'opacity-80')}>
            <TradeTable
              trades={pageTrades}
              accounts={accountMap}
              readOnlyAccountIds={readOnlyIds}
              onRowKey={onRowKey}
              onPickCell={openCellPicker}
              virtualize
              columnWidths={columns.widths}
              onResizeColumn={resizeColumn}
              onSortDir={(key, dir) => setSort({ key, dir })}
              onGroupBy={changeGroup}
              onFilterBy={(field) => setOpenField({ key: field, nonce: Date.now() })}
              onHideColumn={hideColumn}
              sort={sort}
              onSort={onSort}
              selection={{
                selected,
                onToggle: toggle,
                onTogglePage: togglePage,
                label: (id) => {
                  const t = tradeById.get(id);
                  return t ? `Select ${t.symbol} ${formatDateTime(t.exitDate || t.entryDate)}` : 'Select trade';
                },
              }}
              openId={param.trade}
              onOpen={(id) => param.openTrade(id)}
              compact={compact}
              showAccount={showAccount}
              columns={columns}
              groupBy={effectiveGroup}
              density={ui.density}
              groups={effectiveGroup !== 'none' ? groups : undefined}
              collapsed={collapsedGroups}
              onToggleGroup={toggleGroup}
              actions={actions}
              spansYears={spansYears}
            />
          </div>

          <ul ref={phoneRef} className="md:hidden" aria-label="Trades">
            {phoneWin.spacerTop > 0 && <li aria-hidden="true" style={{ height: phoneWin.spacerTop }} />}
            {phoneItems.slice(phoneWin.start, phoneWin.end).map((it) =>
              it.kind === 'head' ? (
                <li key={`h-${it.g.key}`} className="sticky top-0 z-sticky flex h-8 items-center justify-between gap-2 border-b border-border bg-background px-1 text-xs">
                  <span className="font-medium text-foreground">{it.g.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{it.g.net.map((n) => formatMoney(n.value, n.currency, { sign: true })).join(' · ')}</span>
                </li>
              ) : (
                <li key={it.t.id} className="flex h-[60px] items-center gap-2 border-b border-border px-1">
                  {selectMode && <Checkbox checked={selected.has(it.t.id)} onCheckedChange={() => toggle(it.t.id, { shiftKey: false })} aria-label={`Select ${it.t.symbol} ${formatDateShort(it.t.exitDate || it.t.entryDate)}`} className="h-6 w-6 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => (selectMode ? toggle(it.t.id, { shiftKey: false }) : param.openTrade(it.t.id))}
                    onPointerDown={(e) => {
                      if (e.pointerType !== 'touch' || selectMode) return;
                      const id = it.t.id;
                      pressTimer.current = window.setTimeout(() => {
                        setSelectMode(true);
                        toggle(id, { shiftKey: false });
                        pressTimer.current = null;
                      }, 500);
                    }}
                    onPointerUp={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
                    onPointerCancel={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
                    className="min-h-11 min-w-0 flex-1 scroll-mb-28 text-left"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">{it.t.symbol} <DirectionChip direction={it.t.direction} /></span>
                      <Money value={it.t.pnl} currency={it.t.accountId ? accountMap.get(it.t.accountId)?.currency : undefined} />
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {formatDateTime(it.t.exitDate || it.t.entryDate)} · <RMultiple value={realisedR(it.t)} /> · {OUTCOME_LABEL[it.t.outcome] ?? it.t.outcome}
                      <span className="ml-auto flex items-center gap-1.5" aria-hidden="true">
                        {(it.t.images?.length ?? 0) > 0 && <ImageIcon className="h-3.5 w-3.5" />}
                        {(it.t.keyLesson || it.t.notes) && <NotebookPen className="h-3.5 w-3.5" />}
                        {(it.t.tags?.length ?? 0) > 0 && <TagIcon className="h-3.5 w-3.5" />}
                      </span>
                    </span>
                  </button>
                </li>
              ),
            )}
            {phoneWin.spacerBottom > 0 && <li aria-hidden="true" style={{ height: phoneWin.spacerBottom }} />}
          </ul>

          <div className="sticky bottom-0 z-bar -mx-3 flex min-h-9 items-center gap-2 overflow-hidden border-t border-border bg-background px-3 py-1 text-13 md:-mx-6 md:h-9 md:px-6 md:py-0">
            <div role="status" aria-live="polite" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 overflow-hidden whitespace-nowrap md:flex-nowrap">
            {selected.size > 0 ? (
              <>
                <span className="font-medium text-foreground">{selected.size} selected</span>
                {statusLine(selectedSummary, selectedTrades, false)}
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {summary.count} {summary.count === 1 ? 'trade' : 'trades'}
                  {filtered.length !== trades.length && <span className="font-normal text-muted-foreground"> of {trades.length}</span>}
                </span>
                {statusLine(summary, filtered, true)}
              </>
            )}
            {isFetching && <span className="text-muted-foreground">Refreshing…</span>}
            </div>
            {isMobile && (
              <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => { if (selectMode) setSelected(new Set()); setSelectMode(!selectMode); }}>
                {selectMode ? 'Done' : 'Select'}
              </Button>
            )}
          </div>
        </>
      )}

      {isMobile ? renderBulkBar(false) : <ScopeBarSlot side="selection">{renderBulkBar(true)}</ScopeBarSlot>}

      {cellPicker && pickerTargets.length > 0 && (
        <CellPicker
          kind={cellPicker.kind}
          targets={pickerTargets}
          anchor={cellPicker.anchor}
          options={pickerOptions(cellPicker.kind)}
          onCreate={pickerCreate(cellPicker.kind)}
          busy={!!progress}
          onApply={(op, targets) => void applyBulk(op, targets)}
          onClose={() => setCellPicker(null)}
        />
      )}


      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
            <DialogDescription>Saves the filters, sort, grouping and columns. The account and period are not part of a view.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveAs(); }}>
            <Input value={viewName} onChange={(e) => setViewName(e.target.value)} aria-label="View name" placeholder="Breakouts in London" autoFocus />
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!viewName.trim()}>Save view</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
