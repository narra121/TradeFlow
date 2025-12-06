import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Trade, TradeDirection, TradeImage } from '@/types/trade';
import { DynamicSelect } from '@/components/trade/DynamicSelect';
import { SmartInput } from '@/components/trade/SmartInput';
import { MistakeTagsInput } from '@/components/trade/MistakeTagsInput';
import { ImageUploader } from '@/components/trade/ImageUploader';
import { BrokenRulesSelect } from '@/components/trade/BrokenRulesSelect';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useTradingRules } from '@/hooks/useTradingRules';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock, BarChart3, Camera, Lightbulb, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
}

export function AddTradeModal({ open, onOpenChange, onAddTrade }: AddTradeModalProps) {
  // Core Trade Details
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [size, setSize] = useState('0.1');

  // Trade Context
  const [strategy, setStrategy] = useState('');
  const [session, setSession] = useState('');
  const [marketCondition, setMarketCondition] = useState('');

  // Analysis
  const [newsEvent, setNewsEvent] = useState('');
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [keyLesson, setKeyLesson] = useState('');
  const [tradeNotes, setTradeNotes] = useState('');
  const [brokenRuleIds, setBrokenRuleIds] = useState<string[]>([]);

  // Visual Evidence
  const [images, setImages] = useState<TradeImage[]>([]);

  // Saved options hook
  const {
    options,
    addSymbol,
    addStrategy,
    addSession,
    addMarketCondition,
    addNewsEvent,
    addMistake,
    addLesson,
    addTimeframe,
  } = useSavedOptions();

  // Trading rules hook
  const { rules } = useTradingRules();

  // Calculate Net PnL
  const entry = parseFloat(entryPrice) || 0;
  const exit = parseFloat(exitPrice) || 0;
  const posSize = parseFloat(size) || 0;
  const netPnl = exit && entry ? ((exit - entry) * posSize * (direction === 'LONG' ? 1 : -1) * 10000).toFixed(2) : '—';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    onAddTrade({
      symbol,
      direction,
      entryPrice: entry,
      exitPrice: exit || undefined,
      stopLoss: sl,
      takeProfit: tp,
      size: posSize,
      entryDate: new Date(),
      exitDate: exit ? new Date() : undefined,
      status: exit ? 'CLOSED' : 'OPEN',
      pnl: exit ? parseFloat(netPnl) : undefined,
      riskRewardRatio: risk > 0 ? reward / risk : 0,
      strategy,
      session,
      marketCondition,
      newsEvents: newsEvent ? [newsEvent] : [],
      mistakes,
      keyLesson,
      images,
      tags: [],
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setDirection('LONG');
    setSymbol('');
    setEntryPrice('');
    setExitPrice('');
    setStopLoss('');
    setTakeProfit('');
    setSize('0.1');
    setStrategy('');
    setSession('');
    setMarketCondition('');
    setNewsEvent('');
    setMistakes([]);
    setKeyLesson('');
    setTradeNotes('');
    setImages([]);
    setBrokenRuleIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60vw] max-w-[60vw] h-[85vh] max-h-[85vh] p-0 bg-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl font-semibold">Add New Trade</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <div className="space-y-6">
              {/* Section A: Core Trade Details */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Core Details
                </div>

                {/* Direction Toggle */}
                <div className="flex gap-2 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setDirection('LONG')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm",
                      direction === 'LONG'
                        ? "bg-success text-success-foreground shadow-lg shadow-success/25"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SHORT')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm",
                      direction === 'SHORT'
                        ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Short
                  </button>
                </div>

                {/* Compact Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Symbol</Label>
                    <DynamicSelect
                      value={symbol}
                      onChange={setSymbol}
                      options={options.symbols}
                      onAddNew={addSymbol}
                      placeholder="Select..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Entry Price</Label>
                    <Input
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Exit Price</Label>
                    <Input
                      type="number"
                      step="any"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Size (lots)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stop Loss</Label>
                    <Input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Take Profit</Label>
                    <Input
                      type="number"
                      step="any"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Net PnL</Label>
                    <div className={cn(
                      "h-9 px-3 flex items-center rounded-md border border-input bg-secondary/50 font-mono text-sm",
                      parseFloat(netPnl) > 0 && "text-success",
                      parseFloat(netPnl) < 0 && "text-destructive"
                    )}>
                      {netPnl !== '—' ? `$${netPnl}` : netPnl}
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-border" />

              {/* Section B: Trade Context */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Trade Context
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Strategy / Setup</Label>
                    <DynamicSelect
                      value={strategy}
                      onChange={setStrategy}
                      options={options.strategies}
                      onAddNew={addStrategy}
                      placeholder="Select..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Session</Label>
                    <DynamicSelect
                      value={session}
                      onChange={setSession}
                      options={options.sessions}
                      onAddNew={addSession}
                      placeholder="Select..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Market Condition</Label>
                    <DynamicSelect
                      value={marketCondition}
                      onChange={setMarketCondition}
                      options={options.marketConditions}
                      onAddNew={addMarketCondition}
                      placeholder="Select..."
                    />
                  </div>
                </div>
              </section>

              <Separator className="bg-border" />

              {/* Section C: Analysis */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  Analysis
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">News / Events</Label>
                    <SmartInput
                      value={newsEvent}
                      onChange={setNewsEvent}
                      suggestions={options.newsEvents}
                      onAddNew={addNewsEvent}
                      placeholder="Type to search or add new..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-warning" />
                      <Label className="text-xs">Key Lesson</Label>
                    </div>
                    <SmartInput
                      value={keyLesson}
                      onChange={setKeyLesson}
                      suggestions={options.lessons}
                      onAddNew={addLesson}
                      placeholder="What did you learn from this trade?"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Mistakes</Label>
                  <MistakeTagsInput
                    selectedTags={mistakes}
                    onChange={setMistakes}
                    availableTags={options.mistakes}
                    onAddNew={addMistake}
                  />
                </div>

                {/* Broken Rules */}
                {rules.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-destructive" />
                      <Label className="text-xs">Broken Rules</Label>
                      {brokenRuleIds.length > 0 && (
                        <span className="text-xs text-destructive">({brokenRuleIds.length} broken)</span>
                      )}
                    </div>
                    <BrokenRulesSelect
                      rules={rules}
                      selectedRuleIds={brokenRuleIds}
                      onChange={setBrokenRuleIds}
                    />
                  </div>
                )}
              </section>

              <Separator className="bg-border" />

              {/* Section D: Trade Notes */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Trade Notes
                </div>

                <div className="space-y-1.5">
                  <Textarea
                    value={tradeNotes}
                    onChange={(e) => setTradeNotes(e.target.value)}
                    placeholder="Add any additional notes about this trade..."
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>
              </section>

              <Separator className="bg-border" />

              {/* Section E: Visual Evidence */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  Visual Evidence
                </div>

                <ImageUploader
                  images={images}
                  onChange={setImages}
                  timeframeOptions={options.timeframes}
                  onAddTimeframe={addTimeframe}
                />
              </section>
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-28"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-28"
          >
            Add Trade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
