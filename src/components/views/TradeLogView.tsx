import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdSlot } from '@/components/ads/AdSlot';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, subDays, isWithinInterval } from 'date-fns';
import {
  Plus,
  Import,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Trash2,
  BookOpen,
  SlidersHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TradeTableSkeleton, CalendarSkeleton } from '@/components/ui/loading-skeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TradeDetailModal } from '@/components/trade/TradeDetailModal';
import { CalendarTradeModal } from '@/components/trade/CalendarTradeModal';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';
import { AccountFilter } from '@/components/account/AccountFilter';
import { DateRangeFilter, DatePreset, getDateRangeFromPreset } from '@/components/filters/DateRangeFilter';
import { TablePagination, getStoredPageSize, type PageSize } from '@/components/ui/table-pagination';
import { useAppSelector } from '@/store/hooks';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { useGetTradesPaginatedQuery, useUpdateTradeMutation, useDeleteTradeMutation, useBulkDeleteTradesMutation, useGetAccountsQuery } from '@/store/api';
import { getEligibleTrades } from '@/lib/tradeCalculations';
import { CreateTradePayload } from '@/lib/api/trades';

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'checkbox', label: '', defaultVisible: true, sortable: false },
  { key: 'symbol', label: 'Symbol', defaultVisible: true, sortable: true },
  { key: 'account', label: 'Account', defaultVisible: true, sortable: true },
  { key: 'direction', label: 'Direction', defaultVisible: true, sortable: true },
  { key: 'entryDate', label: 'Entry', defaultVisible: true, sortable: true },
  { key: 'exitDate', label: 'Exit', defaultVisible: true, sortable: true },
  { key: 'size', label: 'Size', defaultVisible: true, sortable: true },
  { key: 'rr', label: 'R:R', defaultVisible: true, sortable: true },
  { key: 'outcome', label: 'Outcome', defaultVisible: true, sortable: true },
  { key: 'pnl', label: 'P&L', defaultVisible: true, sortable: true },
  { key: 'strategy', label: 'Strategy', defaultVisible: false, sortable: true },
  { key: 'session', label: 'Session', defaultVisible: false, sortable: true },
  { key: 'mistakes', label: 'Mistakes', defaultVisible: false, sortable: false },
  { key: 'keyLesson', label: 'Key Lesson', defaultVisible: false, sortable: false },
  { key: 'actions', label: 'Actions', defaultVisible: true, sortable: false },
];

const STORAGE_KEY = 'tradequt-table-columns';
const SORT_STORAGE_KEY = 'tradequt-table-sort';

function getDefaultVisibility(): Record<string, boolean> {
  return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultVisible]));
}

function getStoredSort(): { column: string | null; direction: 'asc' | 'desc' } {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { column: null, direction: 'desc' };
}

function getStoredVisibility(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new columns added later
      const defaults = getDefaultVisibility();
      return { ...defaults, ...parsed };
    }
  } catch {}
  return getDefaultVisibility();
}

interface TradeLogViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

type TabType = 'trades' | 'calendar';

export function TradeLogView({ onAddTrade, onImportTrades }: TradeLogViewProps) {
  const isMobile = useIsMobile();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Local filter state — independent from Dashboard/Analytics
  const [localAccountId, setLocalAccountId] = useState<string | null>(null);
  const accountId = localAccountId || 'ALL';
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [localDates, setLocalDates] = useState(() => {
    const range = getDateRangeFromPreset('all');
    return {
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
    };
  });

  // Pagination state (must be declared before the query hook that uses pageSize/cursor)
  const [pageSize, setPageSize] = useState<PageSize>(getStoredPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paginatedData, isLoading: tradesLoading, isFetching: tradesFetching, refetch } = useGetTradesPaginatedQuery({
    accountId,
    startDate: localDates.startDate,
    endDate: localDates.endDate,
    limit: pageSize,
    cursor: cursor || undefined,
  });
  const trades = paginatedData?.trades ?? [];
  const paginationInfo = paginatedData?.pagination ?? { nextCursor: null, hasMore: false, limit: pageSize };
  const { data: accountsData, isFetching: accountsFetching } = useGetAccountsQuery();
  const showSkeleton = tradesLoading;
  const isRefreshing = tradesFetching || accountsFetching;
  const accounts = accountsData?.accounts || [];
  const [updateTrade] = useUpdateTradeMutation();
  const [deleteTrade] = useDeleteTradeMutation();
  const [bulkDeleteTrades] = useBulkDeleteTradesMutation();

  // Bulk selection state
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const toggleTradeSelection = (tradeId: string) => {
    setSelectedTradeIds(prev => {
      const next = new Set(prev);
      next.has(tradeId) ? next.delete(tradeId) : next.add(tradeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTradeIds.size === paginatedTrades.length) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(paginatedTrades.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTradeIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await bulkDeleteTrades({ tradeIds: [...selectedTradeIds] }).unwrap();
      setSelectedTradeIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    } catch { /* toast middleware handles error */ }
    finally { setIsBulkDeleting(false); }
  };

  const [activeTab, setActiveTab] = useState<TabType>('trades');

  // Date filter state - customRange only
  const [customRange, setCustomRange] = useState({ from: subDays(new Date(), 30), to: new Date() });

  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    setDatePreset(preset);
    setLocalDates({
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
    });
  };
  
  // Sorting state (persisted to localStorage)
  type SortColumn = 'symbol' | 'account' | 'direction' | 'entryDate' | 'exitDate' | 'size' | 'rr' | 'outcome' | 'pnl' | 'strategy' | 'session';
  type SortDirection = 'asc' | 'desc';
  const storedSort = getStoredSort();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(storedSort.column as SortColumn | null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(storedSort.direction);

  const handleSort = (column: SortColumn) => {
    let newDirection: SortDirection = 'desc';
    if (sortColumn === column) {
      newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    }
    setSortColumn(column);
    setSortDirection(newDirection);
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ column, direction: newDirection }));
  };

  // Trades table state
  const [symbolFilters, setSymbolFilters] = useState<Set<string>>(new Set());
  const [outcomeFilters, setOutcomeFilters] = useState<Set<string>>(new Set());
  const [strategyFilters, setStrategyFilters] = useState<Set<string>>(new Set());
  const [sessionFilters, setSessionFilters] = useState<Set<string>>(new Set());
  const [mistakeFilters, setMistakeFilters] = useState<Set<string>>(new Set());

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(getStoredVisibility);

  const updateColumnVisibility = (key: string, visible: boolean) => {
    setColumnVisibility(prev => {
      const next = { ...prev, [key]: visible };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetColumnVisibility = () => {
    const defaults = getDefaultVisibility();
    setColumnVisibility(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  };

  const isColumnVisible = (key: string) => columnVisibility[key] !== false;

  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  useEffect(() => {
    if (isCalendarExpanded) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isCalendarExpanded]);

  useEffect(() => {
    if (!isCalendarExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCalendarExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarExpanded]);

  // Trades are already filtered by backend based on Redux date range
  const dateFilteredTrades = trades;
  const eligibleTrades = useMemo(() => getEligibleTrades(trades), [trades]);

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(dateFilteredTrades.map(trade => trade.symbol));
    return Array.from(symbols).sort();
  }, [dateFilteredTrades]);

  const uniqueStrategies = useMemo(() =>
    Array.from(new Set(dateFilteredTrades.map(t => t.strategy).filter(Boolean) as string[])).sort(),
    [dateFilteredTrades]
  );
  const uniqueSessions = useMemo(() =>
    Array.from(new Set(dateFilteredTrades.map(t => t.session).filter(Boolean) as string[])).sort(),
    [dateFilteredTrades]
  );
  const uniqueMistakes = useMemo(() =>
    Array.from(new Set(dateFilteredTrades.flatMap(t => t.mistakes || []).filter(Boolean))).sort(),
    [dateFilteredTrades]
  );

  const accountNameMap = useMemo(() =>
    new Map(accounts.map(a => [a.id, a.name])),
    [accounts]
  );

  const filteredTrades = useMemo(() => {
    const filtered = dateFilteredTrades.filter(trade => {
      const matchesSymbol = symbolFilters.size === 0 || symbolFilters.has(trade.symbol);
      const matchesOutcome = outcomeFilters.size === 0 || outcomeFilters.has(trade.outcome || '');
      const matchesStrategy = strategyFilters.size === 0 || strategyFilters.has(trade.strategy || '');
      const matchesSession = sessionFilters.size === 0 || sessionFilters.has(trade.session || '');
      const matchesMistakes = mistakeFilters.size === 0 || (trade.mistakes || []).some(m => mistakeFilters.has(m));
      return matchesSymbol && matchesOutcome && matchesStrategy && matchesSession && matchesMistakes;
    });

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'account': {
          const aName = accountNameMap.get(a.accountId) || '';
          const bName = accountNameMap.get(b.accountId) || '';
          cmp = aName.localeCompare(bName); break;
        }
        case 'direction': cmp = a.direction.localeCompare(b.direction); break;
        case 'entryDate': cmp = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime(); break;
        case 'exitDate': {
          const aTime = a.exitDate ? new Date(a.exitDate).getTime() : 0;
          const bTime = b.exitDate ? new Date(b.exitDate).getTime() : 0;
          cmp = aTime - bTime; break;
        }
        case 'size': cmp = (a.size || 0) - (b.size || 0); break;
        case 'rr': cmp = (a.riskRewardRatio || 0) - (b.riskRewardRatio || 0); break;
        case 'outcome': cmp = (a.outcome || '').localeCompare(b.outcome || ''); break;
        case 'pnl': cmp = (a.pnl || 0) - (b.pnl || 0); break;
        case 'strategy': cmp = (a.strategy || '').localeCompare(b.strategy || ''); break;
        case 'session': cmp = (a.session || '').localeCompare(b.session || ''); break;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [dateFilteredTrades, symbolFilters, outcomeFilters, strategyFilters, sessionFilters, mistakeFilters, sortColumn, sortDirection, accountNameMap]);

  // --- Server-side cursor-based pagination ---
  // Client-side filters operate on the current page only (no slicing needed).
  const paginatedTrades = filteredTrades;

  // Estimate total items for TablePagination UI (exact total unknown with cursor pagination)
  const hasMore = paginationInfo.hasMore;
  const estimatedTotal = hasMore
    ? currentPage * pageSize + 1          // signals "at least one more page"
    : (currentPage - 1) * pageSize + trades.length;  // exact count on last page

  // Reset pagination when server-side query params change
  useEffect(() => {
    setCursor(null);
    setCursorHistory([null]);
    setCurrentPage(1);
    setSelectedTradeIds(new Set());
  }, [accountId, localDates.startDate, localDates.endDate]);

  const handlePageChange = useCallback((page: number) => {
    if (page === currentPage) return;

    if (page > currentPage && paginationInfo.hasMore) {
      // Going forward — store next cursor position and advance
      setCursorHistory(prev => {
        const next = [...prev];
        next[page - 1] = paginationInfo.nextCursor;
        return next;
      });
      setCursor(paginationInfo.nextCursor);
    } else if (page < currentPage) {
      // Going backward — use stored cursor from history
      setCursor(cursorHistory[page - 1] ?? null);
    }

    setCurrentPage(page);
    setSelectedTradeIds(new Set());
  }, [currentPage, paginationInfo, cursorHistory]);

  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size);
    setCursor(null);
    setCursorHistory([null]);
    setCurrentPage(1);
    setSelectedTradeIds(new Set());
  }, []);

  // Helper to check if a trade is unmapped (no accountId)
  const isTradeIncomplete = (trade: Trade) => {
    // A trade is unmapped if it has no accountId or accountId is -1
    return !trade.accountId || trade.accountId === '-1' ;
  };

  // Trade table handlers
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleSaveEditedTrade = async (updatedTrade: Omit<Trade, 'id'>) => {
    if (!editingTrade) return;

    // IMPORTANT: `useUpdateTradeMutation` expects UI-shaped fields (CreateTradePayload),
    // and the API layer maps them to backend keys.
    await updateTrade({ id: editingTrade.id, payload: updatedTrade as Partial<CreateTradePayload> }).unwrap();
    setEditingTrade(null);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    setDeletingTradeId(tradeId);
  };

  const confirmDelete = async () => {
    if (deletingTradeId) {
      setIsDeleting(true);
      try {
        await deleteTrade(deletingTradeId).unwrap();
        setDeletingTradeId(null);
      } catch (error: any) {
        // Toast middleware handles error display
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleViewTrade = (index: number) => {
    setSelectedTradeIndex(index);
    setIsDetailModalOpen(true);
  };

  const handlePreviousTrade = () => {
    if (selectedTradeIndex !== null && selectedTradeIndex > 0) {
      setSelectedTradeIndex(selectedTradeIndex - 1);
    }
  };

  const handleNextTrade = () => {
    if (selectedTradeIndex !== null && selectedTradeIndex < filteredTrades.length - 1) {
      setSelectedTradeIndex(selectedTradeIndex + 1);
    }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  const getTradesForDay = (date: Date) => {
    return eligibleTrades.filter(trade => {
      if (!trade.exitDate) return false;
      return isSameDay(trade.exitDate, date);
    });
  };

  const getDayStats = (date: Date) => {
    const dayTrades = getTradesForDay(date);
    if (dayTrades.length === 0) return null;
    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = dayTrades.filter(t => (t.pnl || 0) > 0).length;
    return { trades: dayTrades.length, pnl, wins, losses: dayTrades.length - wins };
  };

  const getWeekStats = (weekStart: Date) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    let totalTrades = 0, totalPnl = 0, wins = 0, losses = 0;
    weekDays.forEach(day => {
      const stats = getDayStats(day);
      if (stats) {
        totalTrades += stats.trades;
        totalPnl += stats.pnl;
        wins += stats.wins;
        losses += stats.losses;
      }
    });
    return { trades: totalTrades, pnl: totalPnl, wins, losses, winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0 };
  };

  const tradingDays = useMemo(() => {
    const days: Date[] = [];
    eligibleTrades.forEach(trade => {
      if (trade.exitDate) {
        const exitDate = new Date(trade.exitDate);
        const exists = days.some(d => isSameDay(d, exitDate));
        if (!exists) days.push(exitDate);
      }
    });
    return days.sort((a, b) => a.getTime() - b.getTime());
  }, [eligibleTrades]);

  const handleDayClick = (date: Date) => {
    const dayTrades = getTradesForDay(date);
    if (dayTrades.length > 0) {
      setSelectedDate(date);
      setIsCalendarModalOpen(true);
    }
  };

  const getCurrentDayIndex = () => {
    if (!selectedDate) return undefined;
    return tradingDays.findIndex(d => isSameDay(d, selectedDate));
  };

  const handlePreviousDay = () => {
    const currentIndex = getCurrentDayIndex();
    if (currentIndex !== undefined && currentIndex > 0) {
      setSelectedDate(tradingDays[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = getCurrentDayIndex();
    if (currentIndex !== undefined && currentIndex < tradingDays.length - 1) {
      setSelectedDate(tradingDays[currentIndex + 1]);
    }
  };

  const activeFilterCount = (symbolFilters.size > 0 ? 1 : 0)
    + (outcomeFilters.size > 0 ? 1 : 0)
    + (strategyFilters.size > 0 ? 1 : 0)
    + (sessionFilters.size > 0 ? 1 : 0)
    + (mistakeFilters.size > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Trade Log</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">View, filter, and manage all your trades</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <RefreshButton onRefresh={refetch} isFetching={tradesFetching} />
            <Button onClick={onImportTrades} variant="outline" size="default" className="gap-2">
              <Import className="w-4 h-4 sm:w-5 sm:h-5" />
              Import
            </Button>
            <Button onClick={onAddTrade} size="default" className="gap-2">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Trade</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <AccountFilter value={localAccountId} onValueChange={setLocalAccountId} />
          {activeTab === 'trades' && (
            <DateRangeFilter
              selectedPreset={datePreset}
              onPresetChange={handleDatePresetChange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              showCustomPicker
            />
          )}
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-wrap sm:min-h-[44px]">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('trades')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'trades'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Trades
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'calendar'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calendar
          </button>
        </div>

        {activeTab === 'trades' && (
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {isMobile ? (
              /* Mobile: Filters collapsed into a bottom sheet */
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[70vh] overflow-auto">
                  <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <div className="space-y-4 py-4">
                    {/* Symbol Filter */}
                    <div>
                      <p className="text-sm font-medium mb-2">Symbol</p>
                      <div className="space-y-1 max-h-[160px] overflow-auto">
                        {uniqueSymbols.map(symbol => (
                          <label
                            key={symbol}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={symbolFilters.has(symbol)}
                              onCheckedChange={(checked) => {
                                setSymbolFilters(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(symbol) : next.delete(symbol);
                                  return next;
                                });
                              }}
                            />
                            {symbol}
                          </label>
                        ))}
                      </div>
                      {symbolFilters.size > 0 && (
                        <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setSymbolFilters(new Set())}>Clear</Button>
                      )}
                    </div>
                    <Separator />
                    {/* Outcome Filter */}
                    <div>
                      <p className="text-sm font-medium mb-2">Outcome</p>
                      <div className="space-y-1">
                        {([
                          { value: 'TP', label: 'TP (Take Profit)' },
                          { value: 'PARTIAL', label: 'Partial' },
                          { value: 'SL', label: 'SL (Stop Loss)' },
                          { value: 'BREAKEVEN', label: 'Breakeven' },
                        ] as const).map(opt => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={outcomeFilters.has(opt.value)}
                              onCheckedChange={(checked) => {
                                setOutcomeFilters(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(opt.value) : next.delete(opt.value);
                                  return next;
                                });
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      {outcomeFilters.size > 0 && (
                        <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setOutcomeFilters(new Set())}>Clear</Button>
                      )}
                    </div>
                    {/* Strategy Filter */}
                    {uniqueStrategies.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Strategy</p>
                          <div className="space-y-1 max-h-[160px] overflow-auto">
                            {uniqueStrategies.map(strategy => (
                              <label
                                key={strategy}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={strategyFilters.has(strategy)}
                                  onCheckedChange={(checked) => {
                                    setStrategyFilters(prev => {
                                      const next = new Set(prev);
                                      checked ? next.add(strategy) : next.delete(strategy);
                                      return next;
                                    });
                                  }}
                                />
                                {strategy}
                              </label>
                            ))}
                          </div>
                          {strategyFilters.size > 0 && (
                            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setStrategyFilters(new Set())}>Clear</Button>
                          )}
                        </div>
                      </>
                    )}
                    {/* Session Filter */}
                    {uniqueSessions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Session</p>
                          <div className="space-y-1 max-h-[160px] overflow-auto">
                            {uniqueSessions.map(session => (
                              <label
                                key={session}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={sessionFilters.has(session)}
                                  onCheckedChange={(checked) => {
                                    setSessionFilters(prev => {
                                      const next = new Set(prev);
                                      checked ? next.add(session) : next.delete(session);
                                      return next;
                                    });
                                  }}
                                />
                                {session}
                              </label>
                            ))}
                          </div>
                          {sessionFilters.size > 0 && (
                            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setSessionFilters(new Set())}>Clear</Button>
                          )}
                        </div>
                      </>
                    )}
                    {/* Mistakes Filter */}
                    {uniqueMistakes.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Mistakes</p>
                          <div className="space-y-1 max-h-[160px] overflow-auto">
                            {uniqueMistakes.map(mistake => (
                              <label
                                key={mistake}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={mistakeFilters.has(mistake)}
                                  onCheckedChange={(checked) => {
                                    setMistakeFilters(prev => {
                                      const next = new Set(prev);
                                      checked ? next.add(mistake) : next.delete(mistake);
                                      return next;
                                    });
                                  }}
                                />
                                {mistake}
                              </label>
                            ))}
                          </div>
                          {mistakeFilters.size > 0 && (
                            <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setMistakeFilters(new Set())}>Clear</Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              /* Desktop: inline filter popovers */
              <>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filters:</span>
                </div>

                {/* Symbol Filter (multi-select) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[160px] justify-between font-normal">
                      {symbolFilters.size === 0
                        ? 'All Symbols'
                        : symbolFilters.size === 1
                          ? [...symbolFilters][0]
                          : `${symbolFilters.size} symbols`}
                      <ChevronsUpDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-2" align="start">
                    <div className="space-y-1 max-h-[240px] overflow-auto">
                      {uniqueSymbols.map(symbol => (
                        <label
                          key={symbol}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={symbolFilters.has(symbol)}
                            onCheckedChange={(checked) => {
                              setSymbolFilters(prev => {
                                const next = new Set(prev);
                                checked ? next.add(symbol) : next.delete(symbol);
                                return next;
                              });
                            }}
                          />
                          {symbol}
                        </label>
                      ))}
                    </div>
                    {symbolFilters.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => setSymbolFilters(new Set())}
                      >
                        Clear all
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Outcome Filter (multi-select) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[160px] justify-between font-normal">
                      {outcomeFilters.size === 0
                        ? 'All Outcomes'
                        : outcomeFilters.size === 1
                          ? [...outcomeFilters][0]
                          : `${outcomeFilters.size} outcomes`}
                      <ChevronsUpDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-2" align="start">
                    <div className="space-y-1">
                      {([
                        { value: 'TP', label: 'TP (Take Profit)' },
                        { value: 'PARTIAL', label: 'Partial' },
                        { value: 'SL', label: 'SL (Stop Loss)' },
                        { value: 'BREAKEVEN', label: 'Breakeven' },
                      ] as const).map(opt => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={outcomeFilters.has(opt.value)}
                            onCheckedChange={(checked) => {
                              setOutcomeFilters(prev => {
                                const next = new Set(prev);
                                checked ? next.add(opt.value) : next.delete(opt.value);
                                return next;
                              });
                            }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {outcomeFilters.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => setOutcomeFilters(new Set())}
                      >
                        Clear all
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Strategy Filter (multi-select) */}
                {uniqueStrategies.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[160px] justify-between font-normal">
                        {strategyFilters.size === 0
                          ? 'All Strategies'
                          : strategyFilters.size === 1
                            ? [...strategyFilters][0]
                            : `${strategyFilters.size} strategies`}
                        <ChevronsUpDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-2" align="start">
                      <div className="space-y-1 max-h-[240px] overflow-auto">
                        {uniqueStrategies.map(strategy => (
                          <label
                            key={strategy}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={strategyFilters.has(strategy)}
                              onCheckedChange={(checked) => {
                                setStrategyFilters(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(strategy) : next.delete(strategy);
                                  return next;
                                });
                              }}
                            />
                            {strategy}
                          </label>
                        ))}
                      </div>
                      {strategyFilters.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => setStrategyFilters(new Set())}
                        >
                          Clear all
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                {/* Session Filter (multi-select) */}
                {uniqueSessions.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[160px] justify-between font-normal">
                        {sessionFilters.size === 0
                          ? 'All Sessions'
                          : sessionFilters.size === 1
                            ? [...sessionFilters][0]
                            : `${sessionFilters.size} sessions`}
                        <ChevronsUpDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[180px] p-2" align="start">
                      <div className="space-y-1 max-h-[240px] overflow-auto">
                        {uniqueSessions.map(session => (
                          <label
                            key={session}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={sessionFilters.has(session)}
                              onCheckedChange={(checked) => {
                                setSessionFilters(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(session) : next.delete(session);
                                  return next;
                                });
                              }}
                            />
                            {session}
                          </label>
                        ))}
                      </div>
                      {sessionFilters.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => setSessionFilters(new Set())}
                        >
                          Clear all
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                {/* Mistakes Filter (multi-select) */}
                {uniqueMistakes.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[160px] justify-between font-normal">
                        {mistakeFilters.size === 0
                          ? 'All Mistakes'
                          : mistakeFilters.size === 1
                            ? [...mistakeFilters][0]
                            : `${mistakeFilters.size} mistakes`}
                        <ChevronsUpDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2" align="start">
                      <div className="space-y-1 max-h-[240px] overflow-auto">
                        {uniqueMistakes.map(mistake => (
                          <label
                            key={mistake}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={mistakeFilters.has(mistake)}
                              onCheckedChange={(checked) => {
                                setMistakeFilters(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(mistake) : next.delete(mistake);
                                  return next;
                                });
                              }}
                            />
                            {mistake}
                          </label>
                        ))}
                      </div>
                      {mistakeFilters.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => setMistakeFilters(new Set())}
                        >
                          Clear all
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </>
            )}

            {/* Column Visibility Toggle */}
            {!isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Show/Hide Columns</p>
                    {COLUMN_DEFS.filter(c => c.key !== 'checkbox' && c.key !== 'actions').map(col => (
                      <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer text-sm">
                        <Checkbox
                          checked={isColumnVisible(col.key)}
                          onCheckedChange={(checked) => updateColumnVisibility(col.key, !!checked)}
                        />
                        {col.label}
                      </label>
                    ))}
                    <Separator className="my-1" />
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetColumnVisibility}>
                      Reset to defaults
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>

      {/* Trades Tab Content */}
      {activeTab === 'trades' && (
        <div className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60')}>
          {/* Bulk Actions Toolbar */}
          {selectedTradeIds.size > 0 && (
            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {selectedTradeIds.size} trade{selectedTradeIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTradeIds(new Set())}
              >
                Clear selection
              </Button>
            </div>
          )}

          {/* Trades Table with Loading State */}
          {showSkeleton ? (
            <TradeTableSkeleton rows={8} />
          ) : isMobile ? (
          /* Mobile card layout */
          <div className="space-y-2">
            <div className="space-y-3 px-2">
              {paginatedTrades.map((trade, idx) => (
                <div
                  key={trade.id}
                  className="glass-card p-4 cursor-pointer active:bg-secondary/30"
                  onClick={() => handleViewTrade(idx)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center",
                        trade.direction === 'LONG' ? 'bg-success/10' : 'bg-destructive/10'
                      )}>
                        {trade.direction === 'LONG'
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                          : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                        }
                      </div>
                      <span className="font-semibold">{trade.symbol}</span>
                      <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'}
                        className={trade.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                        {trade.direction}
                      </Badge>
                    </div>
                    <span className={cn(
                      "font-mono font-bold",
                      (trade.pnl ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {(trade.pnl ?? 0) >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{accountNameMap.get(trade.accountId) || '—'}</span>
                    <span>{format(new Date(trade.entryDate), "MMM d, HH:mm")}</span>
                    <Badge variant="outline" className="text-xs">{trade.outcome}</Badge>
                  </div>
                </div>
              ))}
            </div>

            {filteredTrades.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No trades found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {activeFilterCount > 0
                    ? "Try adjusting your filters to see more trades."
                    : "Add your first trade to start building your trading log."}
                </p>
                {activeFilterCount === 0 && (
                  <Button onClick={onAddTrade} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Trade
                  </Button>
                )}
              </div>
            )}

            {/* Pagination bar */}
            {filteredTrades.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalItems={estimatedTotal}
                pageSize={pageSize}
                isLoading={tradesFetching}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
          ) : (
          /* Desktop table layout */
          <div className="glass-card overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-[1100px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/50">
                    {isColumnVisible('checkbox') && (
                      <th className="px-3 py-4 w-10">
                        <Checkbox
                          checked={paginatedTrades.length > 0 && selectedTradeIds.size === paginatedTrades.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    {([
                      { key: 'symbol', label: 'Symbol', align: 'left' },
                      { key: 'account', label: 'Account', align: 'left' },
                      { key: 'direction', label: 'Direction', align: 'left' },
                      { key: 'entryDate', label: 'Entry', align: 'left' },
                      { key: 'exitDate', label: 'Exit', align: 'left' },
                      { key: 'size', label: 'Size', align: 'left' },
                      { key: 'rr', label: 'R:R', align: 'left' },
                      { key: 'outcome', label: 'Outcome', align: 'left' },
                      { key: 'pnl', label: 'P&L', align: 'right' },
                    ] as const).filter(col => isColumnVisible(col.key)).map(col => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-5 py-4 text-sm font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors",
                          col.align === 'right' ? 'text-right' : 'text-left'
                        )}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className={cn("inline-flex items-center gap-1", col.align === 'right' && "flex-row-reverse")}>
                          {col.label}
                          {sortColumn === col.key ? (
                            sortDirection === 'desc'
                              ? <ArrowDown className="w-3.5 h-3.5 text-primary" />
                              : <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                    {isColumnVisible('strategy') && (
                      <th
                        className="px-5 py-4 text-sm font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors text-left"
                        onClick={() => handleSort('strategy')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Strategy
                          {sortColumn === 'strategy' ? (
                            sortDirection === 'desc'
                              ? <ArrowDown className="w-3.5 h-3.5 text-primary" />
                              : <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('session') && (
                      <th
                        className="px-5 py-4 text-sm font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors text-left"
                        onClick={() => handleSort('session')}
                      >
                        <span className="inline-flex items-center gap-1">
                          Session
                          {sortColumn === 'session' ? (
                            sortDirection === 'desc'
                              ? <ArrowDown className="w-3.5 h-3.5 text-primary" />
                              : <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('mistakes') && (
                      <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Mistakes</th>
                    )}
                    {isColumnVisible('keyLesson') && (
                      <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Key Lesson</th>
                    )}
                    {isColumnVisible('actions') && (
                      <th className="px-5 py-4 text-right text-sm font-medium text-muted-foreground"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedTrades.map((trade, index) => {
                    const account = accounts.find(a => a.id === trade.accountId);
                    // Index within current page's filteredTrades for the detail modal
                    const globalIndex = index;
                    return (
                    <tr
                      key={trade.id}
                      className={cn(
                        "border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in",
                        selectedTradeIds.has(trade.id) && "bg-primary/5"
                      )}
                      style={{ animationDelay: `${index * 0.03}s` }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('[role="menuitem"]')) return;
                        handleViewTrade(globalIndex);
                      }}
                    >
                      {isColumnVisible('checkbox') && (
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedTradeIds.has(trade.id)}
                            onCheckedChange={() => toggleTradeSelection(trade.id)}
                          />
                        </td>
                      )}
                      {isColumnVisible('symbol') && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              trade.direction === 'LONG' ? "bg-success/10" : "bg-destructive/10"
                            )}>
                              {trade.direction === 'LONG' ? (
                                <ArrowUpRight className="w-4 h-4 text-success" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">{trade.symbol}</span>
                            {isTradeIncomplete(trade) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>No account assigned — this trade won't appear in your stats. Click Edit to assign an account.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('account') && (
                        <td className="px-5 py-4">
                          <span className="text-sm text-foreground">{account?.name || '—'}</span>
                        </td>
                      )}
                      {isColumnVisible('direction') && (
                        <td className="px-5 py-4">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            trade.direction === 'LONG'
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {trade.direction}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('entryDate') && (
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-mono text-foreground">{trade.entryPrice}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(trade.entryDate), "MMM d ''yy, HH:mm")}</p>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('exitDate') && (
                        <td className="px-5 py-4">
                          {trade.exitPrice ? (
                            <div>
                              <p className="font-mono text-foreground">{trade.exitPrice}</p>
                              <p className="text-xs text-muted-foreground">{trade.exitDate && format(new Date(trade.exitDate), "MMM d ''yy, HH:mm")}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('size') && (
                        <td className="px-5 py-4 font-mono text-foreground">{trade.size}</td>
                      )}
                      {isColumnVisible('rr') && (
                        <td className="px-5 py-4 font-mono text-foreground">{(trade.riskRewardRatio ?? 0).toFixed(2)}</td>
                      )}
                      {isColumnVisible('outcome') && (
                        <td className="px-5 py-4">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-medium",
                            trade.outcome === 'TP' ? "bg-success/10 text-success" :
                            trade.outcome === 'PARTIAL' ? "bg-primary/10 text-primary" :
                            trade.outcome === 'BREAKEVEN' ? "bg-muted text-muted-foreground" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {trade.outcome}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('pnl') && (
                        <td className="px-5 py-4 text-right">
                          {trade.pnl !== undefined ? (
                            <div>
                              <p className={cn(
                                "font-semibold font-mono",
                                trade.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {trade.pnl >= 0 ? '+' : ''}${(trade.pnl ?? 0).toFixed(2)}
                              </p>
                              {trade.pnlPercent !== undefined && (
                                <p className={cn(
                                  "text-xs font-mono",
                                  trade.pnlPercent >= 0 ? "text-success/70" : "text-destructive/70"
                                )}>
                                  {trade.pnlPercent >= 0 ? '+' : ''}{(trade.pnlPercent ?? 0).toFixed(2)}%
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('strategy') && (
                        <td className="px-5 py-4 text-sm text-muted-foreground">{trade.strategy || '—'}</td>
                      )}
                      {isColumnVisible('session') && (
                        <td className="px-5 py-4 text-sm text-muted-foreground">{trade.session || '—'}</td>
                      )}
                      {isColumnVisible('mistakes') && (
                        <td className="px-5 py-4">
                          {trade.mistakes && trade.mistakes.length > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                              {trade.mistakes.length}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isColumnVisible('keyLesson') && (
                        <td className="px-5 py-4">
                          {trade.keyLesson ? (
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={trade.keyLesson}>
                              {trade.keyLesson}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isColumnVisible('actions') && (
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTrade(globalIndex)}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditTrade(trade)}>Edit Trade</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteTrade(trade.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {filteredTrades.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No trades found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {symbolFilters.size > 0 || outcomeFilters.size > 0 || strategyFilters.size > 0 || sessionFilters.size > 0 || mistakeFilters.size > 0
                    ? "Try adjusting your filters to see more trades."
                    : "Add your first trade to start building your trading log."}
                </p>
                {symbolFilters.size === 0 && outcomeFilters.size === 0 && strategyFilters.size === 0 && sessionFilters.size === 0 && mistakeFilters.size === 0 && (
                  <Button onClick={onAddTrade} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Trade
                  </Button>
                )}
              </div>
            )}

            {/* Pagination bar */}
            {filteredTrades.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalItems={estimatedTotal}
                pageSize={pageSize}
                isLoading={tradesFetching}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                className="sticky bottom-0 rounded-b-xl"
              />
            )}
          </div>
          )}
        </div>
      )}

      {activeTab === 'trades' && (
        <AdSlot placementId="tradelog-below-pagination" className="mt-6" />
      )}

      {/* Calendar Tab Content */}
      {activeTab === 'calendar' && !isCalendarExpanded && (
        <div className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60')}>
          {showSkeleton ? (
            <CalendarSkeleton />
          ) : (
            <div className="glass-card p-3 sm:p-6 overflow-x-auto">
              {/* Month Navigation */}
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-semibold text-foreground min-w-[160px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCalendarExpanded(true)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Enter fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-2 min-w-[560px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                    {day}
                  </div>
                ))}
                <div className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                  Weekly
                </div>
              </div>

              {/* Calendar Grid with Weekly Summaries */}
              {weeks.map((weekStart, weekIndex) => {
                const weekDays = eachDayOfInterval({
                  start: weekStart,
                  end: endOfWeek(weekStart, { weekStartsOn: 1 }),
                });
                const weekStats = getWeekStats(weekStart);

                return (
                  <div key={weekStart.toISOString()} className="grid grid-cols-8 gap-1 sm:gap-2 mb-1 sm:mb-2 min-w-[560px]">
                    {weekDays.map((day, dayIndex) => {
                        const stats = getDayStats(day);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                        return (
                          <div
                            key={day.toISOString()}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                              "group aspect-square p-2 rounded-xl transition-all animate-fade-in border",
                              stats
                                ? cn("cursor-pointer", stats.pnl >= 0 ? "border-transparent hover:border-success/40" : "border-transparent hover:border-destructive/40")
                                : "cursor-default border-transparent",
                              !isCurrentMonth && "opacity-30",
                              isToday && "ring-2 ring-primary",
                              stats && (stats.pnl >= 0 ? "bg-success/10" : "bg-destructive/10")
                            )}
                            style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 0.01}s` }}
                          >
                            <div className="h-full flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-sm",
                                  isToday ? "text-primary font-semibold" : "text-muted-foreground"
                                )}>
                                  {format(day, 'd')}
                                </span>
                                {stats && (
                                  <span className={cn(
                                    "text-[10px] font-medium",
                                    stats.pnl >= 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {stats.wins}W {stats.losses}L
                                  </span>
                                )}
                              </div>

                              {stats && (
                                <div className="flex-1 flex flex-col justify-end">
                                  <span className={cn(
                                    "text-sm font-semibold font-mono",
                                    stats.pnl >= 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] underline underline-offset-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0",
                                    stats.pnl >= 0 ? "text-success" : "text-destructive"
                                  )}>
                                    View trades →
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Weekly Summary */}
                      <div
                        className={cn(
                          "p-2 rounded-xl transition-all animate-fade-in border border-border/50",
                          weekStats.trades > 0 && (weekStats.pnl >= 0 ? "bg-success/5" : "bg-destructive/5")
                        )}
                        style={{ animationDelay: `${weekIndex * 0.05}s` }}
                      >
                        {weekStats.trades > 0 ? (
                          <div className="h-full flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">W{weekIndex + 1}</span>
                              <span className={cn(
                                "text-xs font-semibold font-mono",
                                weekStats.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {weekStats.pnl >= 0 ? '+' : ''}${weekStats.pnl.toFixed(2)}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Trades</span>
                                <span className="font-mono">{weekStats.trades}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Win%</span>
                                <span className="font-mono">{weekStats.winRate.toFixed(0)}%</span>
                              </div>
                              <div className="flex gap-1 text-xs">
                                <span className="text-success">{weekStats.wins}W</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-destructive">{weekStats.losses}L</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">—</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Monthly Summary + Legend */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50 space-y-4 sm:space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {(() => {
                    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                    const tradingDaysCount = monthDays.filter(d => getDayStats(d)).length;
                    const profitableDays = monthDays.filter(d => { const s = getDayStats(d); return s && s.pnl > 0; }).length;
                    const lossDays = monthDays.filter(d => { const s = getDayStats(d); return s && s.pnl < 0; }).length;
                    const monthlyPnl = monthDays.reduce((sum, d) => { const s = getDayStats(d); return sum + (s?.pnl ?? 0); }, 0);
                    return [
                      { label: 'Trading Days', value: String(tradingDaysCount) },
                      { label: 'Profitable Days', value: String(profitableDays) },
                      { label: 'Loss Days', value: String(lossDays) },
                      { label: 'Monthly P&L', value: `$${monthlyPnl.toFixed(2)}`, isPnl: true, pnl: monthlyPnl },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-secondary/30 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                        <p className={cn(
                          "text-lg sm:text-2xl font-semibold font-mono mt-1 truncate",
                          stat.isPnl
                            ? (stat.pnl ?? 0) >= 0 ? "text-success" : "text-destructive"
                            : "text-foreground"
                        )}>{stat.value}</p>
                      </div>
                    ));
                  })()}
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-success/20" />
                    <span className="text-xs sm:text-sm text-muted-foreground">Profitable Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-destructive/20" />
                    <span className="text-xs sm:text-sm text-muted-foreground">Loss Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded ring-2 ring-primary" />
                    <span className="text-xs sm:text-sm text-muted-foreground">Today</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Fullscreen Expanded */}
      {isCalendarExpanded && createPortal(
        <div className="fixed inset-0 z-50 bg-background flex flex-col p-4 sm:p-6 animate-scale-in">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center shrink-0 mb-3">
            <div className="flex items-center">
              <AccountFilter value={localAccountId} onValueChange={setLocalAccountId} />
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground min-w-[160px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCalendarExpanded(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Exit fullscreen"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-2 shrink-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                {day}
              </div>
            ))}
            <div className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
              Weekly
            </div>
          </div>

          <div className="flex-1 grid gap-1 sm:gap-2 min-h-0" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
            {weeks.map((weekStart, weekIndex) => {
              const weekDays = eachDayOfInterval({
                start: weekStart,
                end: endOfWeek(weekStart, { weekStartsOn: 1 }),
              });
              const weekStats = getWeekStats(weekStart);

              return (
                <div key={weekStart.toISOString()} className="grid grid-cols-8 gap-1 sm:gap-2 min-h-0">
                  {weekDays.map((day) => {
                    const stats = getDayStats(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "group p-1.5 sm:p-2 rounded-xl transition-all border overflow-hidden",
                          stats
                            ? cn("cursor-pointer", stats.pnl >= 0 ? "border-transparent hover:border-success/40" : "border-transparent hover:border-destructive/40")
                            : "cursor-default border-transparent",
                          !isCurrentMonth && "opacity-30",
                          isToday && "ring-2 ring-primary",
                          stats && (stats.pnl >= 0 ? "bg-success/10" : "bg-destructive/10")
                        )}
                      >
                        <div className="h-full flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-xs sm:text-sm",
                              isToday ? "text-primary font-semibold" : "text-muted-foreground"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {stats && (
                              <span className={cn(
                                "text-[9px] sm:text-[10px] font-medium",
                                stats.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {stats.wins}W {stats.losses}L
                              </span>
                            )}
                          </div>

                          {stats && (
                            <div className="flex-1 flex flex-col justify-end min-h-0">
                              <span className={cn(
                                "text-xs sm:text-sm font-semibold font-mono truncate",
                                stats.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
                              </span>
                              <span className={cn(
                                "text-[10px] underline underline-offset-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0",
                                stats.pnl >= 0 ? "text-success" : "text-destructive"
                              )}>
                                View trades →
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className={cn(
                      "p-1.5 sm:p-2 rounded-xl transition-all border border-border/50 overflow-hidden",
                      weekStats.trades > 0 && (weekStats.pnl >= 0 ? "bg-success/5" : "bg-destructive/5")
                    )}
                  >
                    {weekStats.trades > 0 ? (
                      <div className="h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">W{weekIndex + 1}</span>
                          <span className={cn(
                            "text-[10px] sm:text-xs font-semibold font-mono truncate",
                            weekStats.pnl >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {weekStats.pnl >= 0 ? '+' : ''}${weekStats.pnl.toFixed(0)}
                          </span>
                        </div>
                        <div className="space-y-0">
                          <div className="flex justify-between text-[10px] sm:text-xs">
                            <span className="text-muted-foreground">Trades</span>
                            <span className="font-mono">{weekStats.trades}</span>
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-xs">
                            <span className="text-muted-foreground">Win%</span>
                            <span className="font-mono">{weekStats.winRate.toFixed(0)}%</span>
                          </div>
                          <div className="flex gap-1 text-[10px] sm:text-xs">
                            <span className="text-success">{weekStats.wins}W</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-destructive">{weekStats.losses}L</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTradeIndex !== null ? filteredTrades[selectedTradeIndex] : null}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTradeIndex(null);
        }}
        onEdit={(trade) => {
          handleEditTrade(trade);
        }}
        onDelete={(tradeId) => {
          setIsDetailModalOpen(false);
          setSelectedTradeIndex(null);
          handleDeleteTrade(tradeId);
        }}
        onPrevious={handlePreviousTrade}
        onNext={handleNextTrade}
        hasPrevious={selectedTradeIndex !== null && selectedTradeIndex > 0}
        hasNext={selectedTradeIndex !== null && selectedTradeIndex < filteredTrades.length - 1}
        currentIndex={selectedTradeIndex ?? undefined}
        totalCount={filteredTrades.length}
      />

      {/* Calendar Trade Modal */}
      {selectedDate && (
        <CalendarTradeModal
          trades={getTradesForDay(selectedDate)}
          selectedDate={selectedDate}
          isOpen={isCalendarModalOpen}
          onClose={() => {
            setIsCalendarModalOpen(false);
            setSelectedDate(null);
          }}
          onPreviousDay={handlePreviousDay}
          onNextDay={handleNextDay}
          hasPreviousDay={(getCurrentDayIndex() ?? 0) > 0}
          hasNextDay={(getCurrentDayIndex() ?? tradingDays.length) < tradingDays.length - 1}
          currentDayIndex={getCurrentDayIndex()}
          totalDays={tradingDays.length}
          onEdit={(trade) => {
            handleEditTrade(trade);
          }}
          onDelete={(tradeId) => {
            setIsCalendarModalOpen(false);
            setSelectedDate(null);
            handleDeleteTrade(tradeId);
          }}
        />
      )}

      {/* Edit Trade Modal */}
      {editingTrade && (
        <AddTradeModal
          open={!!editingTrade}
          onOpenChange={(open) => !open && setEditingTrade(null)}
          onAddTrade={handleSaveEditedTrade}
          editMode={true}
          initialTrade={editingTrade}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTradeId} onOpenChange={(open) => !open && setDeletingTradeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTradeIds.size} trade{selectedTradeIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedTradeIds.size} trade${selectedTradeIds.size > 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
