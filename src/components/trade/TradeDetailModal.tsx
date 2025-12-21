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
import { CachedImage } from '@/components/trade/CachedImage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown } from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export function TradeDetailModal({
  trade,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex,
  totalCount,
}: TradeDetailModalProps) {
  if (!trade) return null;

  const isWin = (trade.pnl || 0) >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-lg font-semibold">
              Trade Details
            </DialogTitle>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1}/{totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-[30%_70%] gap-6 p-6">
            {/* Left Column - Trade Info */}
            <div className="space-y-4">
              {/* Header Card */}
              <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-bold text-foreground">{trade.symbol}</span>
                  <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'} className={cn(
                    trade.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                  )}>
                    {trade.direction === 'LONG' ? 'BUY' : 'SELL'}
                  </Badge>
                  {trade.takeProfit && (
                    <Badge variant="outline">TP</Badge>
                  )}
                </div>

                <div className={cn(
                  "text-lg font-semibold mb-4",
                  isWin ? "text-success" : "text-destructive"
                )}>
                  PnL: {isWin ? '+' : ''}${trade.pnl?.toFixed(2) || '0.00'}
                  <span className="text-sm text-muted-foreground ml-2">
                    (Net {trade.pnl?.toFixed(2) || '0.00'})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Quantity</p>
                    <p className="text-foreground font-mono">{trade.size}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Entry Price</p>
                    <p className="text-foreground font-mono">{trade.entryPrice}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Exit Price</p>
                    <p className="text-foreground font-mono">{trade.exitPrice || '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Risk/Reward</p>
                    <p className="text-foreground font-mono">{trade.riskRewardRatio.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Session</p>
                    <p className="text-foreground">{trade.session || '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Market</p>
                    <p className="text-foreground">{trade.marketCondition || '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Setup</p>
                    <p className="text-foreground">{trade.setup || '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Strategy</p>
                    <p className="text-foreground">{trade.strategy || '—'}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Open Date</p>
                    <p className="text-foreground text-xs">{format(new Date(trade.entryDate), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Close Date</p>
                    <p className="text-foreground text-xs">{trade.exitDate ? format(new Date(trade.exitDate), 'yyyy-MM-dd HH:mm') : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {trade.notes && (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground">{trade.notes}</p>
                </div>
              )}

              {/* Key Lesson */}
              {trade.keyLesson && (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Key Lesson</p>
                  <p className="text-sm text-muted-foreground">{trade.keyLesson}</p>
                </div>
              )}

              {/* Mistakes */}
              {trade.mistakes && trade.mistakes.length > 0 && (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Mistakes</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.mistakes.map((mistake, idx) => (
                      <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                        {mistake}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {trade.tags && trade.tags.length > 0 && (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.tags.map((tag, idx) => (
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
              {trade.images && trade.images.length > 0 ? (
                trade.images.map((image, idx) => (
                  <div key={image.id || idx} className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <p className="text-sm font-semibold text-foreground mb-3">{image.timeframe}</p>
                    <div className="rounded-lg overflow-hidden bg-muted/30 mb-3">
                      <CachedImage
                        src={image.url}
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
      </DialogContent>
    </Dialog>
  );
}
