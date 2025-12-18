import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Plus, 
  Upload,
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Loader2
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
import { TradeDetailModal } from '@/components/trade/TradeDetailModal';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { deleteTrade, updateTrade } from '@/store/slices/tradesSlice';

interface TradesViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function TradesView({ onAddTrade, onImportTrades }: TradesViewProps) {
  const dispatch = useAppDispatch();
  const { trades = [], loading } = useAppSelector((state) => state.trades);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'TP' | 'PARTIAL' | 'SL' | 'BREAKEVEN'>('ALL');
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOutcome = outcomeFilter === 'ALL' || trade.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  const handleViewTrade = (index: number) => {
    setSelectedTradeIndex(index);
    setIsDetailModalOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleSaveEditedTrade = async (updatedTrade: Omit<Trade, 'id'>) => {
    if (!editingTrade) return;
    
    const payload = {
      symbol: updatedTrade.symbol,
      side: updatedTrade.direction === 'LONG' ? 'BUY' as const : 'SELL' as const,
      quantity: updatedTrade.size,
      entryPrice: updatedTrade.entryPrice,
      exitPrice: updatedTrade.exitPrice,
      stopLoss: updatedTrade.stopLoss,
      takeProfit: updatedTrade.takeProfit,
      openDate: updatedTrade.entryDate,
      closeDate: updatedTrade.exitDate,
      outcome: updatedTrade.outcome,
      accountIds: updatedTrade.accountIds,
      brokenRuleIds: updatedTrade.brokenRuleIds,
      setupType: updatedTrade.strategy,
      tradingSession: updatedTrade.session,
      marketCondition: updatedTrade.marketCondition,
      newsEvents: updatedTrade.newsEvents,
      mistakes: updatedTrade.mistakes,
      lessons: updatedTrade.keyLesson ? [updatedTrade.keyLesson] : [],
      tags: updatedTrade.tags,
      images: updatedTrade.images?.map(img => ({
        url: img.url,
        timeframe: img.timeframe,
        description: img.description
      }))
    };
    
    await dispatch(updateTrade({ id: editingTrade.id, payload: payload as any })).unwrap();
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
          dispatch(deleteTrade(deletingTradeId)).unwrap(),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
        setDeletingTradeId(null);
      } catch (error: any) {
        console.error('Failed to delete trade:', error);
      } finally {
        setIsDeleting(false);
      }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trade Log</h1>
          <p className="text-muted-foreground mt-1">All your trading history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onImportTrades} variant="outline" size="lg" className="gap-2">
            <Upload className="w-5 h-5" />
            Import
          </Button>
          <Button onClick={onAddTrade} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {(['ALL', 'TP', 'PARTIAL', 'SL', 'BREAKEVEN'] as const).map(outcome => (
            <button
              key={outcome}
              onClick={() => setOutcomeFilter(outcome)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
                  <td className="px-5 py-4 font-mono text-foreground">
                    {trade.size}
                  </td>
                  <td className="px-5 py-4 font-mono text-foreground">
                    {trade.riskRewardRatio.toFixed(2)}
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
      <AlertDialog open={!!deletingTradeId} onOpenChange={(open) => !open && setDeletingTradeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the trade.
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
    </div>
  );
}
