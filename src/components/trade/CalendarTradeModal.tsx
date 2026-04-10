import { useState, useEffect } from 'react';
import { Trade, TradeImage } from '@/types/trade';
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
import { CachedImage } from '@/components/trade/CachedImage';
import { ImageViewerModal } from '@/components/trade/ImageViewerModal';

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
  const [selectedImage, setSelectedImage] = useState<TradeImage | null>(null);

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
      <DialogContent className="w-[95vw] max-w-[95vw] md:w-[90vw] md:max-w-[90vw] max-h-[95vh] md:max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-3 py-3 sm:px-6 sm:py-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <DialogTitle className="text-sm sm:text-lg font-semibold truncate">
              Trades on {format(selectedDate, 'MMMM do, yyyy')}
            </DialogTitle>
            <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
              ({trades.length})
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousDay}
              disabled={!hasPreviousDay}
              className="h-7 px-2 sm:h-8 sm:px-3"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
              disabled={!hasNextDay}
              className="h-7 px-2 sm:h-8 sm:px-3"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
            {currentDayIndex !== undefined && totalDays !== undefined && (
              <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2">
                {currentDayIndex + 1}/{totalDays}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[calc(95vh-80px)] md:h-[calc(90vh-80px)]">
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

            {/* Trade Navigation */}
            <div className="p-2 md:p-3 border-t border-border/50">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousTrade}
                  disabled={selectedTradeIndex === 0}
                  className="flex-1 h-7 md:h-8"
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
                  className="flex-1 h-7 md:h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content - Trade Details */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-6">
              {/* Left Column - Trade Info */}
              <div className="space-y-4">
                {/* Header Card */}
                <div className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card/50">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
                    <span className="text-lg sm:text-xl font-bold text-foreground">{selectedTrade.symbol}</span>
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
                    "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                    isWin ? "text-success" : "text-destructive"
                  )}>
                    PnL: {isWin ? '+' : ''}${selectedTrade.pnl?.toFixed(2) || '0.00'}
                    <span className="text-xs sm:text-sm text-muted-foreground ml-2">
                      (Net {selectedTrade.pnl?.toFixed(2) || '0.00'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 text-sm">
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
                    <div key={image.id || idx} className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card/50">
                      <p className="text-sm font-semibold text-foreground mb-3">{image.timeframe}</p>
                      <div 
                        className="rounded-lg overflow-hidden bg-muted/30 mb-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => setSelectedImage(image)}
                      >
                        <CachedImage
                          src={image.id}
                          alt={`Trade screenshot - ${image.timeframe}`}
                          className="w-full h-auto object-contain"
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

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageId={selectedImage?.id || ''}
        timeframe={selectedImage?.timeframe}
        description={selectedImage?.description}
      />
    </Dialog>
  );
}
