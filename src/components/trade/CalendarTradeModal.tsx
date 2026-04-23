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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { TradeDetailContent } from './TradeDetailContent';

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
  onEdit?: (trade: Trade) => void;
  onDelete?: (tradeId: string) => void;
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
  onEdit,
  onDelete,
}: CalendarTradeModalProps) {
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);

  // Reset selected trade when trades change
  useEffect(() => {
    setSelectedTradeIndex(0);
  }, [trades]);

  const selectedTrade = trades[selectedTradeIndex];

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
      <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="pl-6 pr-12 py-3 border-b border-border/50 bg-card/90 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm sm:text-lg font-semibold truncate">
              Trades on {format(selectedDate, 'MMMM do, yyyy')}
              <span className="text-muted-foreground font-normal ml-2">({trades.length})</span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={onPreviousDay} disabled={!hasPreviousDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {currentDayIndex !== undefined && totalDays !== undefined && (
                <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                  {currentDayIndex + 1}/{totalDays}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={onNextDay} disabled={!hasNextDay}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(90vh-52px)]">
          {/* Trade List - Horizontal scroll on mobile, sidebar on desktop */}
          <div className="md:w-64 border-b md:border-b-0 md:border-r border-border/50 flex flex-col shrink-0">
            <div className="p-2 md:p-3 border-b border-border/50">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Trades ({trades.length})
              </p>
            </div>
            <ScrollArea className="md:flex-1">
              <div className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-x-visible">
                {trades.map((trade, index) => {
                  const tradeIsWin = (trade.pnl || 0) >= 0;
                  return (
                    <button
                      key={trade.id}
                      onClick={() => setSelectedTradeIndex(index)}
                      className={cn(
                        "shrink-0 md:shrink md:w-full p-2 md:p-3 rounded-lg text-left transition-all min-w-[120px] md:min-w-0",
                        selectedTradeIndex === index
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-secondary/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center shrink-0",
                          trade.direction === 'LONG' ? "bg-success/10" : "bg-destructive/10"
                        )}>
                          {trade.direction === 'LONG' ? (
                            <ArrowUpRight className="w-3 h-3 text-success" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-destructive" />
                          )}
                        </div>
                        <span className="font-semibold text-xs md:text-sm text-foreground">{trade.symbol}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(trade.entryDate), 'HH:mm')}
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
          </div>

          {/* Right Content - Trade Details (uses same header as table view) */}
          <div className="flex-1 min-h-0 flex flex-col">
            <TradeDetailContent
              trade={selectedTrade}
              onPrevious={handlePreviousTrade}
              onNext={handleNextTrade}
              hasPrevious={selectedTradeIndex > 0}
              hasNext={selectedTradeIndex < trades.length - 1}
              currentIndex={selectedTradeIndex}
              totalCount={trades.length}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
