import { useState, useMemo, useEffect, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, subDays, isWithinInterval } from 'date-fns';
import {
  Plus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Trash2,
  BookOpen
} from 'lucide-react';
import { TradeTableSkeleton, CalendarSkeleton } from '@/components/ui/loading-skeleton';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { useGetTradesQuery, useUpdateTradeMutation, useDeleteTradeMutation, useBulkDeleteTradesMutation, useGetAccountsQuery } from '@/store/api';
import { getEligibleTrades } from '@/lib/tradeCalculations';

interface TradeLogViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

type TabType = 'trades' | 'calendar';

export function TradeLogView({ onAddTrade, onImportTrades }: TradeLogViewProps) {
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.trades);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  // Prepare query params, excluding datePreset and accountId='ALL'
  // Use useMemo to prevent unnecessary re-renders and cache invalidation
  const queryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [filters.accountId, filters.startDate, filters.endDate]);
  
  const { data: trades = [], isLoading: tradesLoading, isFetching: tradesFetching, refetch } = useGetTradesQuery(queryParams);
  const { data: accountsData, isFetching: accountsFetching } = useGetAccountsQuery();
  const loading = tradesLoading || tradesFetching || accountsFetching;
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(getStoredPageSize);

  const [activeTab, setActiveTab] = useState<TabType>('trades');

  // Date filter state - customRange only
  const [customRange, setCustomRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  
  // Update Redux when date filter changes
  const handleDatePresetChange = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset, customRange);
    dispatch(setDateRangeFilter({
      startDate: formatLocalDateOnly(range.from),
      endDate: formatLocalDateOnly(range.to),
      datePreset: preset
    }));
  };
  
  // Sorting state
  type SortColumn = 'symbol' | 'account' | 'direction' | 'entryDate' | 'exitDate' | 'size' | 'rr' | 'outcome' | 'pnl';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Trades table state
  const [symbolFilters, setSymbolFilters] = useState<Set<string>>(new Set());
  const [outcomeFilters, setOutcomeFilters] = useState<Set<string>>(new Set());
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Trades are already filtered by backend based on Redux date range
  const dateFilteredTrades = trades;
  const eligibleTrades = useMemo(() => getEligibleTrades(trades), [trades]);

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(dateFilteredTrades.map(trade => trade.symbol));
    return Array.from(symbols).sort();
  }, [dateFilteredTrades]);

  const filteredTrades = useMemo(() => {
    const filtered = dateFilteredTrades.filter(trade => {
      const matchesSymbol = symbolFilters.size === 0 || symbolFilters.has(trade.symbol);
      const matchesOutcome = outcomeFilters.size === 0 || outcomeFilters.has(trade.outcome || '');
      return matchesSymbol && matchesOutcome;
    });

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'account': {
          const aName = accounts.find(acc => acc.id === a.accountId)?.name || '';
          const bName = accounts.find(acc => acc.id === b.accountId)?.name || '';
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
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [dateFilteredTrades, symbolFilters, outcomeFilters, sortColumn, sortDirection, accounts]);

  // --- Pagination: compute paged slice ---
  const totalFilteredTrades = filteredTrades.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredTrades / pageSize));

  // Clamp currentPage when data or filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when filters, sort, or query params change
  useEffect(() => {
    setCurrentPage(1);
  }, [symbolFilters, outcomeFilters, sortColumn, sortDirection, queryParams]);

  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedTradeIds(new Set());
  }, []);

  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size);
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
    await updateTrade({ id: editingTrade.id, payload: updatedTrade as any }).unwrap();
    setEditingTrade(null);
  };

  const handleDeleteTrade = async (tradeId: string) => {
    setDeletingTradeId(tradeId);
  };

  const confirmDelete = async () => {
    if (deletingTradeId) {
      setIsDeleting(true);
      try {
        // Ensure minimum 1 second loading for better UX
        await Promise.all([
          deleteTrade(deletingTradeId).unwrap(),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
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
  }, [dateFilteredTrades]);

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
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Import
            </Button>
            <Button onClick={onAddTrade} size="default" className="gap-2">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add Trade</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
        {activeTab === 'trades' && (
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <AccountFilter />
            <DateRangeFilter
              selectedPreset={filters.datePreset}
              onPresetChange={handleDatePresetChange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              showCustomPicker
            />
          </div>
        )}
        {activeTab !== 'trades' && (
          <div className="flex items-center gap-4">
            <AccountFilter />
          </div>
        )}
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
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
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">Filters:</span>
            </div>
            
            {/* Symbol Filter (multi-select) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px] sm:w-[160px] justify-between font-normal">
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
                <Button variant="outline" size="sm" className="w-[140px] sm:w-[160px] justify-between font-normal">
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
          </div>
        )}
      </div>

      {/* Trades Tab Content */}
      {activeTab === 'trades' && (
        <>
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
          {loading ? (
            <TradeTableSkeleton rows={8} />
          ) : (
          <div className="glass-card overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-[1100px]">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border/50">
                    <th className="px-3 py-4 w-10">
                      <Checkbox
                        checked={paginatedTrades.length > 0 && selectedTradeIds.size === paginatedTrades.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
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
                    ] as const).map(col => (
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
                    <th className="px-5 py-4 text-right text-sm font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedTrades.map((trade, index) => {
                    const account = accounts.find(a => a.id === trade.accountId);
                    // Global index within filteredTrades for the detail modal
                    const globalIndex = (currentPage - 1) * pageSize + index;
                    return (
                    <tr
                      key={trade.id}
                      className={cn(
                        "hover:bg-secondary/30 transition-colors animate-fade-in",
                        selectedTradeIds.has(trade.id) && "bg-primary/5"
                      )}
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedTradeIds.has(trade.id)}
                          onCheckedChange={() => toggleTradeSelection(trade.id)}
                        />
                      </td>
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
                          <span className="font-semibold text-foreground">{trade.symbol}</span>
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
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{account?.name || '—'}</span>
                      </td>
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
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-mono text-foreground">{trade.entryPrice}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(trade.entryDate), 'MMM d, HH:mm')}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {trade.exitPrice ? (
                          <div>
                            <p className="font-mono text-foreground">{trade.exitPrice}</p>
                            <p className="text-xs text-muted-foreground">{trade.exitDate && format(new Date(trade.exitDate), 'MMM d, HH:mm')}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-foreground">{trade.size}</td>
                      <td className="px-5 py-4 font-mono text-foreground">{trade.riskRewardRatio.toFixed(2)}</td>
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
                      <td className="px-5 py-4 text-right">
                        {trade.pnl !== undefined ? (
                          <div>
                            <p className={cn(
                              "font-semibold font-mono",
                              trade.pnl >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </p>
                            {trade.pnlPercent !== undefined && (
                              <p className={cn(
                                "text-xs font-mono",
                                trade.pnlPercent >= 0 ? "text-success/70" : "text-destructive/70"
                              )}>
                                {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewTrade(globalIndex)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {filteredTrades.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No trades found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {symbolFilters.size > 0 || outcomeFilters.size > 0
                    ? "Try adjusting your filters to see more trades."
                    : "Add your first trade to start building your trading log."}
                </p>
                {symbolFilters.size === 0 && outcomeFilters.size === 0 && (
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
                totalItems={totalFilteredTrades}
                pageSize={pageSize}
                isLoading={tradesFetching}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                className="sticky bottom-0 rounded-b-xl"
              />
            )}
          </div>
          )}
        </>
      )}

      {/* Calendar Tab Content */}
      {activeTab === 'calendar' && (
        <>
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <>
              {/* Calendar Card */}
              <div className="glass-card p-3 sm:p-6 overflow-x-auto">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-semibold text-foreground">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="w-5 h-5" />
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
                              "aspect-square p-2 rounded-xl transition-all animate-fade-in",
                              stats ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : "cursor-default",
                              "hover:bg-secondary/50",
                              !isCurrentMonth && "opacity-30",
                              isToday && "ring-2 ring-primary",
                              stats && (stats.pnl >= 0 ? "bg-success/10" : "bg-destructive/10")
                            )}
                            style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 0.01}s` }}
                          >
                            <div className="h-full flex flex-col">
                              <span className={cn(
                                "text-sm",
                                isToday ? "text-primary font-semibold" : "text-muted-foreground"
                              )}>
                                {format(day, 'd')}
                              </span>
                              
                              {stats && (
                                <div className="flex-1 flex flex-col justify-end">
                                  <span className={cn(
                                    "text-xs font-semibold font-mono",
                                    stats.pnl >= 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {stats.pnl >= 0 ? '+' : ''}{stats.pnl.toFixed(0)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {stats.trades} trade{stats.trades !== 1 ? 's' : ''}
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
                                {weekStats.pnl >= 0 ? '+' : ''}${weekStats.pnl.toFixed(0)}
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

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50 flex-wrap">
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

              {/* Monthly Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Trading Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 1 }) })).filter(d => getDayStats(d)).length },
                  { label: 'Profitable Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 1 }) })).filter(d => { const s = getDayStats(d); return s && s.pnl > 0; }).length },
                  { label: 'Loss Days', value: weeks.flatMap(w => eachDayOfInterval({ start: w, end: endOfWeek(w, { weekStartsOn: 1 }) })).filter(d => { const s = getDayStats(d); return s && s.pnl < 0; }).length },
                  { label: 'Monthly P&L', value: `$${weeks.reduce((sum, w) => sum + getWeekStats(w).pnl, 0).toFixed(2)}` },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="glass-card p-3 sm:p-4 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-lg sm:text-2xl font-semibold text-foreground font-mono mt-1 truncate">{stat.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTradeIndex !== null ? filteredTrades[selectedTradeIndex] : null}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTradeIndex(null);
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
