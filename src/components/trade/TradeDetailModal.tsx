import { useState, useEffect } from 'react';
import { Trade, TradeImage } from '@/types/trade';
import { format, formatDistanceStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetRulesQuery, useGetAccountsQuery } from '@/store/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CachedImage } from '@/components/trade/CachedImage';
import { ImageViewerModal } from '@/components/trade/ImageViewerModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Check,
  ImageIcon,
} from 'lucide-react';

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

const CARD = 'bg-card/50 border border-border/50 rounded-xl p-3.5';
const EMPTY_CARD = 'bg-card/20 border border-dashed border-border/30 rounded-xl p-3.5';
const LABEL = 'text-[11px] font-medium uppercase tracking-wider text-primary mb-1.5';
const INNER_ROW = 'bg-secondary/30 rounded-lg p-[6px_10px] hover:bg-secondary/50 transition-colors';
const SUBLABEL = 'text-[10px] text-muted-foreground';
const VALUE = 'font-mono text-sm text-foreground';

const outcomeLabels: Record<string, string> = {
  TP: 'TP Hit',
  PARTIAL: 'Partial',
  SL: 'SL Hit',
  BREAKEVEN: 'Breakeven',
};

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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<TradeImage | null>(null);
  const { data: rules } = useGetRulesQuery();
  const { data: accountsData } = useGetAccountsQuery();

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [trade?.id]);

  if (!trade) return null;

  const isWin = (trade.pnl ?? 0) >= 0;
  const duration = trade.exitDate && trade.entryDate
    ? formatDistanceStrict(new Date(trade.exitDate), new Date(trade.entryDate))
    : null;
  const resolvedBrokenRules = trade.brokenRuleIds
    ?.map(id => rules?.find(r => r.ruleId === id))
    .filter(Boolean) ?? [];
  const accountName = accountsData?.accounts?.find(a => a.id === trade.accountId)?.name;
  const heroImage = trade.images?.[selectedImageIndex] ?? trade.images?.[0];
  const hasImages = trade.images && trade.images.length > 0;
  const hasNewsEvents = trade.newsEvents && trade.newsEvents.length > 0;

  const pnlDisplay = `${isWin ? '+' : ''}$${(trade.pnl ?? 0).toFixed(2)}`;
  const pnlPercentDisplay = trade.pnlPercent != null
    ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* STICKY HEADER */}
        <div className="px-6 py-3.5 border-b border-border/50 bg-card/90 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="sr-only">Trade Details</DialogTitle>
            <span className="text-lg font-bold text-foreground shrink-0">{trade.symbol}</span>
            <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'} className={cn(
              'shrink-0',
              trade.direction === 'LONG' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            )}>
              {trade.direction === 'LONG' ? 'LONG' : 'SHORT'}
            </Badge>
            <Badge variant="outline" className="shrink-0">
              {outcomeLabels[trade.outcome] ?? trade.outcome}
            </Badge>
            <span className={cn(
              'font-mono font-semibold text-base shrink-0 flex items-center gap-1',
              isWin ? 'text-success' : 'text-destructive'
            )}>
              {isWin
                ? <ArrowUpRight className="w-4 h-4 shrink-0" />
                : <ArrowDownRight className="w-4 h-4 shrink-0" />
              }
              {pnlDisplay}
            </span>
            <span className="text-muted-foreground text-xs shrink-0">|</span>
            {pnlPercentDisplay && (
              <>
                <span className={cn('font-mono text-xs shrink-0', isWin ? 'text-success' : 'text-destructive')}>
                  {pnlPercentDisplay}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">|</span>
              </>
            )}
            {duration && (
              <>
                <span className="text-muted-foreground text-xs shrink-0">{duration}</span>
                <span className="text-muted-foreground text-xs shrink-0">|</span>
              </>
            )}
            {trade.riskRewardRatio != null && trade.riskRewardRatio > 0 && (
              <>
                <span className="text-muted-foreground text-xs shrink-0">R:R {trade.riskRewardRatio.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs shrink-0">|</span>
              </>
            )}
            {trade.session && (
              <span className="text-muted-foreground text-xs shrink-0">{trade.session}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                {currentIndex + 1}/{totalCount}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <Button variant="outline" size="sm" onClick={() => onEdit?.(trade)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete?.(trade.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* KPI STRIP */}
          <div className="grid grid-cols-6 px-6 py-3 border-b border-border/30">
            <div className="text-center">
              <div className={SUBLABEL}>Entry</div>
              <div className={VALUE}>{trade.entryPrice ?? '—'}</div>
            </div>
            <div className="text-center">
              <div className={SUBLABEL}>Exit</div>
              <div className={VALUE}>{trade.exitPrice ?? '—'}</div>
            </div>
            <div className="text-center">
              <div className={SUBLABEL}>Stop Loss</div>
              <div className={cn(VALUE, 'text-destructive')}>{trade.stopLoss ?? '—'}</div>
            </div>
            <div className="text-center">
              <div className={SUBLABEL}>Take Profit</div>
              <div className={cn(VALUE, 'text-success')}>{trade.takeProfit ?? '—'}</div>
            </div>
            <div className="text-center">
              <div className={SUBLABEL}>Size</div>
              <div className={VALUE}>{trade.size ?? '—'}</div>
            </div>
            <div className="text-center">
              <div className={SUBLABEL}>R:R</div>
              <div className={cn(VALUE, 'text-primary')}>
                {trade.riskRewardRatio != null && trade.riskRewardRatio > 0
                  ? trade.riskRewardRatio.toFixed(2)
                  : '—'}
              </div>
            </div>
          </div>

          {/* BENTO GRID */}
          <div className="p-4 px-6 grid grid-cols-[2fr_1fr] gap-3">

            {/* SCREENSHOT HERO (spans 2 rows) */}
            <div className="row-span-2 flex flex-col gap-2.5">
              {hasImages && heroImage ? (
                <>
                  <div
                    className="group relative flex-1 min-h-[280px] rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-[hsl(220_18%_12%)] to-[hsl(220_18%_8%)] cursor-pointer hover:border-primary/40 hover:shadow-[0_0_20px_hsl(160_84%_39%/0.1)] transition-all"
                    onClick={() => setSelectedImage(heroImage)}
                  >
                    <CachedImage
                      src={heroImage.id}
                      alt={`Trade screenshot - ${heroImage.timeframe}`}
                      className="w-full h-full object-contain"
                    />
                    {heroImage.timeframe && (
                      <div className="absolute top-3 left-3 bg-card/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs text-foreground border border-border/50">
                        {heroImage.timeframe}
                      </div>
                    )}
                    {heroImage.description && (
                      <div className="absolute bottom-10 left-3 right-3 bg-card/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground border border-border/50 line-clamp-2">
                        {heroImage.description}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] text-muted-foreground border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to enlarge
                    </div>
                  </div>
                  {trade.images!.length > 1 && (
                    <div className="flex items-center gap-2">
                      {trade.images!.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          className={cn(
                            'shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors',
                            idx === selectedImageIndex ? 'border-primary' : 'border-transparent hover:border-primary/40'
                          )}
                          onClick={() => setSelectedImageIndex(idx)}
                        >
                          <CachedImage src={img.id} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <span className="text-[11px] text-muted-foreground ml-1">
                        {trade.images!.length} screenshots
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 min-h-[280px] rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-[hsl(220_18%_12%)] to-[hsl(220_18%_8%)] flex flex-col items-center justify-center gap-3">
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center',
                    isWin ? 'bg-success/10' : 'bg-destructive/10'
                  )}>
                    {isWin
                      ? <TrendingUp className="w-7 h-7 text-success" />
                      : <TrendingDown className="w-7 h-7 text-destructive" />
                    }
                  </div>
                  <span className="text-sm text-muted-foreground">No screenshots attached</span>
                  <span className="text-xs text-muted-foreground/50">Add screenshots when editing this trade</span>
                </div>
              )}
            </div>

            {/* TRADE CONTEXT (right top) */}
            <div className={CARD}>
              <div className={LABEL}>Trade Context</div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Strategy</div>
                  <div className="text-xs">{trade.strategy || '—'}</div>
                </div>
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Setup</div>
                  <div className="text-xs">{trade.setup || '—'}</div>
                </div>
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Market</div>
                  <div className="text-xs">{trade.marketCondition || '—'}</div>
                </div>
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Session</div>
                  <div className="text-xs">{trade.session || '—'}</div>
                </div>
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Opened</div>
                  <div className="text-[11px]">
                    {trade.entryDate ? format(new Date(trade.entryDate), "MMM d ''yy, HH:mm") : '—'}
                  </div>
                </div>
                <div className={INNER_ROW}>
                  <div className={SUBLABEL}>Closed</div>
                  <div className="text-[11px]">
                    {trade.exitDate ? format(new Date(trade.exitDate), "MMM d ''yy, HH:mm") : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* NEWS & ACCOUNT (right bottom) */}
            <div className={cn(
              !hasNewsEvents && !accountName ? EMPTY_CARD : CARD
            )}>
              <div className={LABEL}>News & Events</div>
              {hasNewsEvents ? (
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {trade.newsEvents!.map((event, idx) => (
                    <Badge key={idx} variant="outline" className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                      {event}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic mb-2.5">None recorded</p>
              )}
              {accountName && (
                <div className="border-t border-border/30 pt-2">
                  <div className={SUBLABEL}>Account</div>
                  <div className="text-xs mt-0.5">{accountName}</div>
                </div>
              )}
            </div>

            {/* BOTTOM ROW: 5 cards */}
            <div className="col-span-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3">

              {/* Notes + Emotions */}
              <div className={cn(trade.notes ? CARD : EMPTY_CARD)}>
                <div className={LABEL}>Notes</div>
                {trade.notes ? (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                    {trade.notes}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">No notes recorded</p>
                )}
                {trade.emotions && (
                  <div className="border-t border-border/40 pt-2.5 mt-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-accent mb-1">Emotions</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{trade.emotions}</p>
                  </div>
                )}
              </div>

              {/* Key Lesson */}
              <div className={cn(trade.keyLesson ? CARD : EMPTY_CARD)}>
                <div className={LABEL}>Key Lesson</div>
                {trade.keyLesson ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{trade.keyLesson}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">No key lesson recorded</p>
                )}
              </div>

              {/* Mistakes */}
              <div className={cn(trade.mistakes && trade.mistakes.length > 0 ? CARD : EMPTY_CARD)}>
                <div className={LABEL}>Mistakes</div>
                {trade.mistakes && trade.mistakes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {trade.mistakes.map((mistake, idx) => (
                      <Badge key={idx} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                        {mistake}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">Clean trade — no mistakes</p>
                )}
              </div>

              {/* Broken Rules */}
              <div className={cn(
                resolvedBrokenRules.length > 0 ? CARD :
                  (trade.brokenRuleIds && trade.brokenRuleIds.length === 0) || !trade.brokenRuleIds
                    ? CARD : CARD
              )}>
                <div className={LABEL}>Broken Rules</div>
                {resolvedBrokenRules.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {resolvedBrokenRules.map(rule => (
                      <div key={rule!.ruleId} className="flex items-start gap-1.5 text-[11px] text-destructive leading-snug">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{rule!.rule}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs text-success">All rules followed</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className={cn(trade.tags && trade.tags.length > 0 ? CARD : EMPTY_CARD)}>
                <div className={LABEL}>Tags</div>
                {trade.tags && trade.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {trade.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">No tags</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

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
