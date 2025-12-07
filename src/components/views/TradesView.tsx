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
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TradeDetailModal } from '@/components/trade/TradeDetailModal';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTrades } from '@/store/slices/tradesSlice';

interface TradesViewProps {
  onAddTrade: () => void;
  onImportTrades: () => void;
}

export function TradesView({ onAddTrade, onImportTrades }: TradesViewProps) {
  const dispatch = useAppDispatch();
  const { trades = [], loading } = useAppSelector((state) => state.trades);
  const { selectedAccountId } = useAppSelector((state) => state.accounts);
  
  useEffect(() => {
    dispatch(fetchTrades({ accountId: selectedAccountId }));
  }, [dispatch, selectedAccountId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || trade.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          {(['ALL', 'OPEN', 'CLOSED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
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
                <th className="px-5 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
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
                      <p className="text-xs text-muted-foreground">{format(trade.entryDate, 'MMM d, HH:mm')}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {trade.exitPrice ? (
                      <div>
                        <p className="font-mono text-foreground">{trade.exitPrice}</p>
                        <p className="text-xs text-muted-foreground">{trade.exitDate && format(trade.exitDate, 'MMM d, HH:mm')}</p>
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
                    <div className="flex items-center gap-2">
                      {trade.status === 'OPEN' ? (
                        <>
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="text-warning text-sm">Open</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className={cn(
                            "w-4 h-4",
                            (trade.pnl || 0) >= 0 ? "text-success" : "text-destructive"
                          )} />
                          <span className="text-sm text-muted-foreground">Closed</span>
                        </>
                      )}
                    </div>
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
                          <DropdownMenuItem>Edit Trade</DropdownMenuItem>
                          {trade.status === 'OPEN' && (
                            <DropdownMenuItem>Close Trade</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
    </div>
  );
}
