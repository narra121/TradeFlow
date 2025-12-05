import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trade, TradeDirection } from '@/types/trade';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
}

const popularSymbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'NAS100', 'US30', 'BTC/USD'];

export function AddTradeModal({ open, onOpenChange, onAddTrade }: AddTradeModalProps) {
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [size, setSize] = useState('0.1');
  const [notes, setNotes] = useState('');
  const [setup, setSetup] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    onAddTrade({
      symbol,
      direction,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      size: parseFloat(size),
      entryDate: new Date(),
      status: 'OPEN',
      riskRewardRatio: risk > 0 ? reward / risk : 0,
      notes,
      setup,
      tags: [],
    });
    
    // Reset form
    setSymbol('');
    setEntryPrice('');
    setStopLoss('');
    setTakeProfit('');
    setSize('0.1');
    setNotes('');
    setSetup('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Trade</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Direction Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('LONG')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                direction === 'LONG'
                  ? "bg-success text-success-foreground shadow-lg shadow-success/25"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpRight className="w-5 h-5" />
              Long
            </button>
            <button
              type="button"
              onClick={() => setDirection('SHORT')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                direction === 'SHORT'
                  ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownRight className="w-5 h-5" />
              Short
            </button>
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {popularSymbols.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Entry Price</Label>
              <Input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Take Profit</Label>
              <Input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                required
              />
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label>Position Size (lots)</Label>
            <Input
              type="number"
              step="0.01"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="font-mono"
              required
            />
          </div>

          {/* Setup */}
          <div className="space-y-2">
            <Label>Trade Setup</Label>
            <Input
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              placeholder="e.g., Breakout, Support bounce, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you taking this trade? What's your thesis?"
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Trade
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
