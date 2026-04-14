import { useState } from 'react';
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
import { CachedImage } from '@/components/trade/CachedImage';
import { ImageViewerModal } from '@/components/trade/ImageViewerModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
  onEdit?: (trade: Trade) => void;
  onDelete?: (tradeId: string) => void;
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
  onEdit,
  onDelete,
}: TradeDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<TradeImage | null>(null);

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
          <div className="flex items-center gap-2 mr-8">
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
            <div className="w-px h-6 bg-border/50 mx-1" />
            <Button variant="outline" size="sm" onClick={() => onEdit?.(trade)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete?.(trade.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
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
                  <span className="text-xl font-bold text-foreground break-all">{trade.symbol}</span>
                  <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'} className={cn(
                    trade.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                  )}>
                    {trade.direction === 'LONG' ? 'BUY' : 'SELL'}
                  </Badge>
                  {trade.takeProfit != null && trade.takeProfit > 0 && (
                    <Badge variant="outline">TP: {trade.takeProfit}</Badge>
                  )}
                </div>

                <div className={cn(
                  "text-lg font-semibold mb-4 flex items-center gap-1.5",
                  isWin ? "text-success" : "text-destructive"
                )}>
                  {isWin
                    ? <ArrowUpRight className="w-4.5 h-4.5 shrink-0" />
                    : <ArrowDownRight className="w-4.5 h-4.5 shrink-0" />
                  }
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
                    <p className="text-foreground font-mono">
                      {trade.riskRewardRatio != null && trade.riskRewardRatio > 0
                        ? trade.riskRewardRatio.toFixed(2)
                        : '—'}
                    </p>
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
                    <p className="text-foreground text-xs">{format(new Date(trade.entryDate), "MMM d ''yy, HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-primary text-xs uppercase font-medium mb-1">Close Date</p>
                    <p className="text-foreground text-xs">{trade.exitDate ? format(new Date(trade.exitDate), "MMM d ''yy, HH:mm") : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {trade.notes && (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{trade.notes}</p>
                </div>
              )}

              {/* Key Lesson */}
              {trade.keyLesson ? (
                <div className="p-4 rounded-xl border border-border/50 bg-card/50">
                  <p className="text-primary text-xs uppercase font-medium mb-2">Key Lesson</p>
                  <p className="text-sm text-muted-foreground">{trade.keyLesson}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border/30 bg-card/20">
                  <p className="text-muted-foreground/50 text-xs italic">No key lesson recorded</p>
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
                <>
                {trade.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2">
                    {trade.images.map((img, idx) => (
                      <button
                        key={idx}
                        className="shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors"
                        onClick={() => {
                          const el = document.getElementById(`trade-image-${idx}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                      >
                        <CachedImage src={img.id} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground shrink-0 ml-1">
                      {trade.images.length} images
                    </span>
                  </div>
                )}
                {trade.images.map((image, idx) => (
                  <div key={image.id || idx} id={`trade-image-${idx}`} className="p-4 rounded-xl border border-border/50 bg-card/50">
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
                ))}
                </>
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
