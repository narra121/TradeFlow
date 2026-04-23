import { useState, useMemo } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Plus,
  Import,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Loader2,
  Link2,
  Building2,
  AlertTriangle
} from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TradeDetailModal } from '@/components/trade/TradeDetailModal';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';
import { useAppSelector } from '@/store/hooks';
import { useAccounts } from '@/hooks/useAccounts';
import { useGetTradesQuery, useUpdateTradeMutation, useDeleteTradeMutation, useBulkDeleteTradesMutation } from '@/store/api';

interface TradesViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function TradesView({ onAddTrade, onImportTrades }: TradesViewProps) {
  const filters = useAppSelector((state) => state.trades.filters);
  
  // Prepare query params, excluding datePreset and accountId='ALL'
  // Use useMemo to prevent unnecessary re-renders and cache invalidation
  const queryParams = useMemo(() => ({
    accountId: filters.accountId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  }), [filters.accountId, filters.startDate, filters.endDate]);
  
  const { data: trades = [], isLoading: loading } = useGetTradesQuery(queryParams);
  const [updateTrade] = useUpdateTradeMutation();
  const [deleteTrade] = useDeleteTradeMutation();
  const [bulkDeleteTrades] = useBulkDeleteTradesMutation();
  const { accounts } = useAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'TP' | 'PARTIAL' | 'SL' | 'BREAKEVEN'>('ALL');
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<'account' | 'all'>('account');
  const [isDeleting, setIsDeleting] = useState(false);

  // Build a lookup: account ID -> account name
  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach(acc => { map[acc.id] = acc.name; });
    return map;
  }, [accounts]);

  // Detect linked trades (same trade mapped to multiple accounts)
  // Fingerprint: symbol + direction + entryPrice + exitPrice + entryDate + size
  const linkedTradesMap = useMemo(() => {
    const fingerprints: Record<string, Trade[]> = {};
    trades.forEach(trade => {
      const key = `${trade.symbol}|${trade.direction}|${trade.entryPrice}|${trade.exitPrice}|${trade.entryDate}|${trade.size}`;
      if (!fingerprints[key]) fingerprints[key] = [];
      fingerprints[key].push(trade);
    });
    // Only keep groups with 2+ trades across different accounts
    const result: Record<string, Trade[]> = {};
    for (const [, group] of Object.entries(fingerprints)) {
      const uniqueAccounts = new Set(group.map(t => t.accountId).filter(Boolean));
      if (group.length >= 2 && uniqueAccounts.size >= 2) {
        group.forEach(t => { result[t.id] = group.filter(g => g.id !== t.id); });
      }
    }
    return result;
  }, [trades]);

  const filteredTrades = useMemo(() => trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOutcome = outcomeFilter === 'ALL' || trade.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  }), [trades, searchQuery, outcomeFilter]);

  const handleViewTrade = (index: number) => {
    setSelectedTradeIndex(index);
    setIsDetailModalOpen(true);
  };

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
    setDeleteScope('account');
  };

  const confirmDelete = async () => {
    if (!deletingTradeId) return;
    setIsDeleting(true);
    try {
      const linkedTrades = linkedTradesMap[deletingTradeId] || [];
      if (deleteScope === 'all' && linkedTrades.length > 0) {
        // Delete this trade + all linked copies
        const allIds = [deletingTradeId, ...linkedTrades.map(t => t.id)];
        await bulkDeleteTrades({ tradeIds: allIds }).unwrap();
      } else {
        // Delete only this specific trade
        await deleteTrade(deletingTradeId).unwrap();
      }
      setDeletingTradeId(null);
    } catch (error: any) {
      // Toast middleware handles error display
    } finally {
      setIsDeleting(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Trade Log</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">All your trading history</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'TP', 'PARTIAL', 'SL', 'BREAKEVEN'] as const).map(outcome => (
            <button
              key={outcome}
              onClick={() => setOutcomeFilter(outcome)}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0",
                outcomeFilter === outcome
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {outcome === 'ALL' ? 'All' : outcome}
            </button>
          ))}
        </div>
      </div>

      {/* Trades Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Symbol</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Direction</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Account</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Entry</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Exit</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Size</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">R:R</th>
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Outcome</th>
                <th className="px-5 py-4 text-right text-sm font-medium text-muted-foreground">P&L</th>
                <th className="px-5 py-4 text-right text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredTrades.map((trade, index) => (
                <tr 
                  key={trade.id} 
                  className="hover:bg-secondary/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
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
                    </div>
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
                    {trade.accountId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-foreground truncate max-w-[140px]">
                          {accountNameMap[trade.accountId] || 'Unknown'}
                        </span>
                        {linkedTradesMap[trade.id] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 text-xs text-primary/70 shrink-0 cursor-default">
                                  <Link2 className="w-3 h-3" />
                                  <span>+{linkedTradesMap[trade.id].length}</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start">
                                <p className="font-medium mb-1">Shared across {linkedTradesMap[trade.id].length + 1} accounts:</p>
                                <ul className="text-xs space-y-0.5">
                                  <li>{accountNameMap[trade.accountId] || 'Unknown'} (current)</li>
                                  {linkedTradesMap[trade.id].map(linked => (
                                    <li key={linked.id}>{accountNameMap[linked.accountId!] || 'Unknown'}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-warning">Unmapped</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-mono text-foreground">{trade.entryPrice}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(trade.entryDate), "MMM d ''yy, HH:mm")}</p>
                    </div>
                  </td>
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
                  <td className="px-5 py-4 font-mono text-foreground">
                    {trade.size}
                  </td>
                  <td className="px-5 py-4 font-mono text-foreground">
                    {(trade.riskRewardRatio ?? 0).toFixed(2)}
                  </td>
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
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleViewTrade(index)}
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
                          <DropdownMenuItem onClick={() => handleViewTrade(index)}>
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
              ))}
            </tbody>
          </table>
        </div>

        {filteredTrades.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-muted-foreground">No trades found</p>
          </div>
        )}
      </div>

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
      <AlertDialog open={!!deletingTradeId} onOpenChange={(open) => { if (!open) { setDeletingTradeId(null); setDeleteScope('account'); } }}>
        <AlertDialogContent>
          {(() => {
            const tradeToDelete = trades.find(t => t.id === deletingTradeId);
            const linkedTrades = deletingTradeId ? (linkedTradesMap[deletingTradeId] || []) : [];
            const isMultiAccount = linkedTrades.length > 0;
            const accountName = tradeToDelete?.accountId ? (accountNameMap[tradeToDelete.accountId] || 'this account') : 'this account';

            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {isMultiAccount && <AlertTriangle className="w-5 h-5 text-warning" />}
                    Delete Trade
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      {isMultiAccount ? (
                        <>
                          <p>
                            This <span className="font-medium text-foreground">{tradeToDelete?.symbol} {tradeToDelete?.direction}</span> trade
                            is shared across {linkedTrades.length + 1} accounts.
                          </p>
                          <div className="space-y-2 pt-1">
                            <label
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                deleteScope === 'account'
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border hover:border-muted-foreground/30"
                              )}
                              onClick={() => setDeleteScope('account')}
                            >
                              <input
                                type="radio"
                                name="deleteScope"
                                checked={deleteScope === 'account'}
                                onChange={() => setDeleteScope('account')}
                                className="mt-0.5 accent-primary"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">Remove from {accountName} only</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  The trade remains in: {linkedTrades.map(t => accountNameMap[t.accountId!] || 'Unknown').join(', ')}
                                </p>
                              </div>
                            </label>
                            <label
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                deleteScope === 'all'
                                  ? "border-destructive/50 bg-destructive/5"
                                  : "border-border hover:border-muted-foreground/30"
                              )}
                              onClick={() => setDeleteScope('all')}
                            >
                              <input
                                type="radio"
                                name="deleteScope"
                                checked={deleteScope === 'all'}
                                onChange={() => setDeleteScope('all')}
                                className="mt-0.5 accent-destructive"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">Delete from all accounts</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Permanently removes this trade everywhere. This cannot be undone.
                                </p>
                              </div>
                            </label>
                          </div>
                        </>
                      ) : (
                        <p>
                          Permanently delete this <span className="font-medium text-foreground">{tradeToDelete?.symbol} {tradeToDelete?.direction}</span> trade
                          {tradeToDelete?.accountId ? ` from ${accountName}` : ''}? This cannot be undone.
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className={cn(
                      deleteScope === 'all' && isMultiAccount
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    )}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : isMultiAccount ? (
                      deleteScope === 'all' ? 'Delete Everywhere' : `Remove from ${accountName}`
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
