import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CalendarTradeModalProps {
  trades: Trade[];
  selectedDate: Date;
  isOpen: boolean;
  onClose: () => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  hasPreviousDay?: boolean;
  hasNextDay?: boolean;
  currentDayIndex?: number;
  totalDays?: number;
}

export function CalendarTradeModal({
  trades,
  selectedDate,
  isOpen,
  onClose,
  onPreviousDay,
  onNextDay,
  hasPreviousDay = false,
  hasNextDay = false,
  currentDayIndex,
  totalDays,
}: CalendarTradeModalProps) {
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);

  // Reset selected trade when trades change
  useEffect(() => {
    setSelectedTradeIndex(0);
  }, [trades]);

  const selectedTrade = trades[selectedTradeIndex];
  const isWin = selectedTrade ? (selectedTrade.pnl || 0) >= 0 : false;

  const handlePreviousTrade = () => {
    if (selectedTradeIndex > 0) {
      setSelectedTradeIndex(selectedTradeIndex - 1);
    }
  };

  const handleNextTrade = () => {
    if (selectedTradeIndex < trades.length - 1) {
      setSelectedTradeIndex(selectedTradeIndex + 1);
    }
  };

  if (!selectedTrade || trades.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-lg font-semibold">
              Trades on {format(selectedDate, 'MMMM do, yyyy')}
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              ({trades.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousDay}
              disabled={!hasPreviousDay}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
              disabled={!hasNextDay}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {currentDayIndex !== undefined && totalDays !== undefined && (
              <span className="text-sm text-muted-foreground ml-2">
                {currentDayIndex + 1}/{totalDays}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Sidebar - Trade List */}
          <div className="w-64 border-r border-border/50 flex flex-col">
            <div className="p-3 border-b border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Trades ({trades.length})
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {trades.map((trade, index) => {
                  const tradeIsWin = (trade.pnl || 0) >= 0;
                  return (
                    <button
                      key={trade.id}
                      onClick={() => setSelectedTradeIndex(index)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all",
                        selectedTradeIndex === index
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-secondary/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          trade.direction === 'LONG' ? "bg-success/10" : "bg-destructive/10"
                        )}>
                          {trade.direction === 'LONG' ? (
                            <ArrowUpRight className="w-3 h-3 text-success" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-destructive" />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-foreground">{trade.symbol}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(trade.entryDate, 'HH:mm')}
                        </span>
                        <span className={cn(
                          "text-xs font-mono font-semibold",
                          tradeIsWin ? "text-success" : "text-destructive"
                        )}>
                          {tradeIsWin ? '+' : ''}${trade.pnl?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Trade Navigation */}
            <div className="p-3 border-t border-border/50">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousTrade}
                  disabled={selectedTradeIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedTradeIndex + 1}/{trades.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextTrade}
                  disabled={selectedTradeIndex === trades.length - 1}
                  className="flex-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content - Trade Details */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Left Column - Trade Info */}
              <div className="space-y-4">
                {/* Header Card */}
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl font-bold text-foreground">{selectedTrade.symbol}</span>
                    <Badge variant={selectedTrade.direction === 'LONG' ? 'default' : 'destructive'} className={cn(
                      selectedTrade.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                    )}>
                      {selectedTrade.direction === 'LONG' ? 'BUY' : 'SELL'}
                    </Badge>
                    {selectedTrade.takeProfit && (
                      <Badge variant="outline">TP</Badge>
                    )}
                  </div>

                  <div className={cn(
                    "text-lg font-semibold mb-4",
                    isWin ? "text-success" : "text-destructive"
                  )}>
                    PnL: {isWin ? '+' : ''}${selectedTrade.pnl?.toFixed(2) || '0.00'}
                    <span className="text-sm text-muted-foreground ml-2">
                      (Net {selectedTrade.pnl?.toFixed(2) || '0.00'})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Quantity</p>
                      <p className="text-foreground font-mono">{selectedTrade.size}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Entry Price</p>
                      <p className="text-foreground font-mono">{selectedTrade.entryPrice}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Exit Price</p>
                      <p className="text-foreground font-mono">{selectedTrade.exitPrice || '—'}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Risk/Reward</p>
                      <p className="text-foreground font-mono">{selectedTrade.riskRewardRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Session</p>
                      <p className="text-foreground">{selectedTrade.session || '—'}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Market</p>
                      <p className="text-foreground">{selectedTrade.marketCondition || '—'}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Setup</p>
                      <p className="text-foreground">{selectedTrade.setup || '—'}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Strategy</p>
                      <p className="text-foreground">{selectedTrade.strategy || '—'}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Open Date</p>
                      <p className="text-foreground text-xs">{format(selectedTrade.entryDate, 'yyyy-MM-dd HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-primary text-xs uppercase font-medium mb-1">Close Date</p>
                      <p className="text-foreground text-xs">{selectedTrade.exitDate ? format(selectedTrade.exitDate, 'yyyy-MM-dd HH:mm') : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedTrade.notes && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <p className="text-primary text-xs uppercase font-medium mb-2">Notes</p>
                    <p className="text-sm text-muted-foreground">{selectedTrade.notes}</p>
                  </div>
                )}

                {/* Key Lesson */}
                {selectedTrade.keyLesson && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <p className="text-primary text-xs uppercase font-medium mb-2">Key Lesson</p>
                    <p className="text-sm text-muted-foreground">{selectedTrade.keyLesson}</p>
                  </div>
                )}

                {/* Mistakes */}
                {selectedTrade.mistakes && selectedTrade.mistakes.length > 0 && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <p className="text-primary text-xs uppercase font-medium mb-2">Mistakes</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrade.mistakes.map((mistake, idx) => (
                        <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          {mistake}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedTrade.tags && selectedTrade.tags.length > 0 && (
                  <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <p className="text-primary text-xs uppercase font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrade.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Images */}
              <div className="space-y-4">
                {selectedTrade.images && selectedTrade.images.length > 0 ? (
                  selectedTrade.images.map((image, idx) => (
                    <div key={image.id || idx} className="p-4 rounded-xl border border-border/50 bg-card/50">
                      <p className="text-sm font-semibold text-foreground mb-3">{image.timeframe}</p>
                      <div className="rounded-lg overflow-hidden bg-muted/30 mb-3">
                        <img
                          src={image.url}
                          alt={`Trade screenshot - ${image.timeframe}`}
                          className="w-full h-auto object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      {image.description && (
                        <p className="text-sm text-muted-foreground">{image.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-xl border border-border/50 bg-card/50 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                      {isWin ? (
                        <TrendingUp className="w-8 h-8 text-success" />
                      ) : (
                        <TrendingDown className="w-8 h-8 text-destructive" />
                      )}
                    </div>
                    <p className="text-muted-foreground">No screenshots attached</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
