import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { TextEnhancerButton } from '@/components/ui/text-enhancer-button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trade, TradeDirection, TradeImage, TradeOutcome } from '@/types/trade';
import { DynamicSelect } from '@/components/trade/DynamicSelect';
import { SmartInput } from '@/components/trade/SmartInput';
import { MistakeTagsInput } from '@/components/trade/MistakeTagsInput';
import { ImageUploader } from '@/components/trade/ImageUploader';
import { BrokenRulesSelect } from '@/components/trade/BrokenRulesSelect';
import { AccountSelect } from '@/components/account/AccountSelect';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useSavedOptions } from '@/hooks/useSavedOptions';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useTradingRules } from '@/hooks/useTradingRules';
import { useAccounts } from '@/hooks/useAccounts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock, BarChart3, Camera, Lightbulb, FileText, Shield, Building2, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


interface AddTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTrade: (trade: Omit<Trade, 'id'>) => Promise<void> | void;
  editMode?: boolean;
  initialTrade?: Trade;
}

export function AddTradeModal({ open, onOpenChange, onAddTrade, editMode = false, initialTrade }: AddTradeModalProps) {
  // Core Trade Details
  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [size, setSize] = useState('0.1');
  const [manualPnl, setManualPnl] = useState('');
  const [entryDateTime, setEntryDateTime] = useState('');
  const [exitDateTime, setExitDateTime] = useState('');
  const [outcome, setOutcome] = useState<TradeOutcome>('TP');

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

  // Account selection
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Visual Evidence
  const [images, setImages] = useState<TradeImage[]>([]);
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form draft persistence
  const draftKey = editMode && initialTrade?.id ? `trade-draft-edit-${initialTrade.id}` : 'trade-draft-new';
  const { draft, hasDraft, save: saveDraft, clear: clearDraft } = useFormDraft(draftKey);

  // Saved options hook
  const {
    options,
    addSymbol,
    removeSymbol,
    addStrategy,
    removeStrategy,
    addSession,
    removeSession,
    addMarketCondition,
    removeMarketCondition,
    addNewsEvent,
    addMistake,
    addLesson,
    addTimeframe,
    removeTimeframe,
  } = useSavedOptions();

  // Trading rules hook
  const { rules } = useTradingRules();

  // Accounts hook
  const { accounts } = useAccounts();

  // Use the trade data passed from the list - no need for separate API call
  const editTrade = editMode && initialTrade ? initialTrade : null;

  const normalizeImages = (raw: any[] | undefined): TradeImage[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((img: any, index: number) => {
      // Extract the image ID (S3 key) from various possible formats
      const id =
        (typeof img?.id === 'string' && img.id) ||
        (typeof img?.imageId === 'string' && img.imageId) ||
        (typeof img?.key === 'string' && img.key) ||
        (typeof img?.s3Key === 'string' && img.s3Key) ||
        // If we have a URL, try to extract the filename from it
        (typeof img?.url === 'string' && img.url && img.url.includes('/') 
          ? img.url.split('/').pop()?.split('?')[0] || ''
          : '') ||
        (typeof img?.imageUrl === 'string' && img.imageUrl && img.imageUrl.includes('/')
          ? img.imageUrl.split('/').pop()?.split('?')[0] || ''
          : '') ||
        (typeof img?.signedUrl === 'string' && img.signedUrl && img.signedUrl.includes('/')
          ? img.signedUrl.split('/').pop()?.split('?')[0] || ''
          : '') ||
        String(index); // Fallback to index

      const timeframe =
        (typeof img?.timeframe === 'string' && img.timeframe) ||
        (typeof img?.timeFrame === 'string' && img.timeFrame) ||
        '1H';

      const description = (typeof img?.description === 'string' && img.description) || '';

      return { id, timeframe, description };
    });
  };

  // Reset visual states on close, but don't clear draft (it persists in sessionStorage)
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setShowAddAccount(false);
      setDraftRestored(false);
      if (editMode) resetForm();
    }
  }, [open, editMode]);

  // Auto-save form draft to sessionStorage (debounced)
  useEffect(() => {
    if (!open) return;
    saveDraft({
      direction, symbol, entryPrice, exitPrice, stopLoss, takeProfit,
      size, manualPnl, entryDateTime, exitDateTime, outcome,
      strategy, session, marketCondition, newsEvent, mistakes,
      keyLesson, tradeNotes, brokenRuleIds, selectedAccountIds, images,
    });
  }, [
    open, direction, symbol, entryPrice, exitPrice, stopLoss, takeProfit,
    size, manualPnl, entryDateTime, exitDateTime, outcome,
    strategy, session, marketCondition, newsEvent, mistakes,
    keyLesson, tradeNotes, brokenRuleIds, selectedAccountIds, images, saveDraft,
  ]);

  // Restore draft when modal opens for new trade (not edit mode)
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    if (!open || editMode || !hasDraft || !draft) {
      setDraftRestored(false);
      return;
    }
    setDirection(draft.direction || 'LONG');
    setSymbol(draft.symbol || '');
    setEntryPrice(draft.entryPrice || '');
    setExitPrice(draft.exitPrice || '');
    setStopLoss(draft.stopLoss || '');
    setTakeProfit(draft.takeProfit || '');
    setSize(draft.size || '0.1');
    setManualPnl(draft.manualPnl || '');
    setEntryDateTime(draft.entryDateTime || '');
    setExitDateTime(draft.exitDateTime || '');
    setOutcome(draft.outcome || 'TP');
    setStrategy(draft.strategy || '');
    setSession(draft.session || '');
    setMarketCondition(draft.marketCondition || '');
    setNewsEvent(draft.newsEvent || '');
    setMistakes(Array.isArray(draft.mistakes) ? draft.mistakes : []);
    setKeyLesson(draft.keyLesson || '');
    setTradeNotes(draft.tradeNotes || '');
    setBrokenRuleIds(Array.isArray(draft.brokenRuleIds) ? draft.brokenRuleIds : []);
    setSelectedAccountIds(Array.isArray(draft.selectedAccountIds) ? draft.selectedAccountIds : []);
    setImages(Array.isArray(draft.images) ? draft.images : []);
    setDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Check if trade is unmapped (no accountId or -1)
  const isUnmapped = useMemo(() => {
    if (!editMode || !editTrade) return true; // New trade
    const accId = editTrade.accountId;
    return !accId || accId === '-1';
  }, [editMode, editTrade]);

  // In edit mode with mapped trade, allow adding to more accounts
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Populate form when editing.
  // NOTE: include `open` so reopening the modal repopulates even if `initialTrade` reference is unchanged.
  useEffect(() => {
    if (!open || !editMode || !editTrade) return;

    setDirection(editTrade.direction || 'LONG');
    setSymbol(editTrade.symbol || '');
    setEntryPrice(editTrade.entryPrice != null ? String(editTrade.entryPrice) : '');
    setExitPrice(editTrade.exitPrice != null ? String(editTrade.exitPrice) : '');
    setStopLoss(editTrade.stopLoss != null ? String(editTrade.stopLoss) : '');
    setTakeProfit(editTrade.takeProfit != null ? String(editTrade.takeProfit) : '');
    setSize(editTrade.size != null ? String(editTrade.size) : '0.1');
    setManualPnl(editTrade.pnl != null ? String(editTrade.pnl) : '');
    setEntryDateTime(editTrade.entryDate || '');
    setExitDateTime(editTrade.exitDate || '');
    setOutcome(editTrade.outcome || 'TP');
    setStrategy(editTrade.strategy || editTrade.setup || '');
    setSession(editTrade.session || '');
    setMarketCondition(editTrade.marketCondition || '');
    setNewsEvent(editTrade.newsEvents?.[0] || '');
    setMistakes(Array.isArray(editTrade.mistakes) ? editTrade.mistakes : []);
    setKeyLesson(editTrade.keyLesson || '');
    setTradeNotes(editTrade.notes || '');
    setBrokenRuleIds(Array.isArray(editTrade.brokenRuleIds) ? editTrade.brokenRuleIds : []);
    
    // Handle accountId - single account per trade
    const accId = editTrade.accountId;
    setSelectedAccountIds(accId && accId !== '-1' ? [accId] : []);
    
    setImages(normalizeImages(editTrade.images));
  }, [open, editMode, editTrade]);

  // Calculate Net PnL (use manual if set, otherwise calculate)
  const entry = parseFloat(entryPrice) || 0;
  const exit = parseFloat(exitPrice) || 0;
  const posSize = parseFloat(size) || 0;
  const calculatedPnl = exit && entry ? ((exit - entry) * posSize * (direction === 'LONG' ? 1 : -1) * 10000).toFixed(2) : '';
  const displayPnl = manualPnl !== '' ? manualPnl : calculatedPnl;
  const finalPnl = parseFloat(displayPnl) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mandatory fields
    const errors: string[] = [];
    if (!symbol.trim()) errors.push('Symbol is required');
    if (!entryPrice || parseFloat(entryPrice) <= 0) errors.push('Entry price is required');
    if (!exitPrice || parseFloat(exitPrice) === 0) errors.push('Exit price is required');
    if (!size || parseFloat(size) <= 0) errors.push('Size is required');
    if (!entryDateTime) errors.push('Entry date & time is required');
    if (!exitDateTime) errors.push('Exit date & time is required');
    if (!displayPnl && displayPnl !== '0' && !calculatedPnl) errors.push('P&L is required');
    if (!outcome) errors.push('Outcome is required');

    if (errors.length > 0) {
      toast.warning('Missing required fields', { description: errors.join('\n') });
      return;
    }

    setIsSubmitting(true);

    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    const existingNewsEvents = editMode ? (editTrade?.newsEvents || []) : [];
    const newsValue = newsEvent.trim();
    const nextNewsEvents = newsValue
      ? Array.from(new Set([newsValue, ...existingNewsEvents]))
      : existingNewsEvents;

    try {
      await onAddTrade({
        symbol,
        direction,
        entryPrice: entry,
        exitPrice: exit,
        stopLoss: sl,
        takeProfit: tp,
        size: posSize,
        entryDate: entryDateTime ? new Date(entryDateTime).toISOString() : new Date().toISOString(),
        exitDate: exitDateTime ? new Date(exitDateTime).toISOString() : new Date().toISOString(),
        outcome,
        pnl: exit || manualPnl ? finalPnl : undefined,
        riskRewardRatio: risk > 0 ? reward / risk : 0,
        strategy,
        session,
        marketCondition,
        notes: tradeNotes,
        newsEvents: nextNewsEvents,
        mistakes,
        keyLesson,
        images,
        // No tags/emotions UI yet in this modal; preserve existing values on edit.
        tags: editMode ? (editTrade?.tags || []) : [],
        emotions: editMode ? editTrade?.emotions : undefined,
        // Send accountIds array for both create and edit (backend handles multi-account logic)
        accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
        brokenRuleIds,
      });

      resetForm();
      clearDraft();
      onOpenChange(false);
    } catch {
      // Keep dialog open so user can fix errors — toast middleware handles the error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDirection('LONG');
    setSymbol('');
    setEntryPrice('');
    setExitPrice('');
    setStopLoss('');
    setTakeProfit('');
    setSize('0.1');
    setEntryDateTime('');
    setExitDateTime('');
    setOutcome('TP');
    setStrategy('');
    setSession('');
    setMarketCondition('');
    setNewsEvent('');
    setMistakes([]);
    setKeyLesson('');
    setManualPnl('');
    setTradeNotes('');
    setImages([]);
    setBrokenRuleIds([]);
    setSelectedAccountIds([]);
    setShowAddAccount(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[95vw] sm:max-w-[90vw] h-[95vh] sm:h-[85vh] max-h-[95vh] sm:max-h-[85vh] p-0 bg-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-semibold">{editMode ? 'Edit Trade' : 'Add New Trade'}</DialogTitle>
            {draftRestored && !editMode && (
              <button
                type="button"
                onClick={() => { clearDraft(); resetForm(); setDraftRestored(false); }}
                className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
              >
                Discard draft
              </button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3">
              {/* Account Selection - New trade or unmapped trade */}
              {accounts.length > 0 && isUnmapped && (
                <section className="bg-card/50 border border-border/50 rounded-xl p-3.5 space-y-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Account
                    {selectedAccountIds.length > 0 && (
                      <span className="text-xs normal-case tracking-normal">({selectedAccountIds.length} selected)</span>
                    )}
                  </div>
                  <AccountSelect
                    accounts={accounts}
                    selectedAccountIds={selectedAccountIds}
                    onChange={setSelectedAccountIds}
                  />
                  {selectedAccountIds.length > 1 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                      A copy of this trade will be created for each selected account.
                    </p>
                  )}
                </section>
              )}

              {/* Current account info when editing mapped trade */}
              {accounts.length > 0 && editMode && !isUnmapped && (
                <section className="bg-card/50 border border-border/50 rounded-xl p-3.5 space-y-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Accounts
                  </div>
                  <div className="space-y-2">
                    {/* Show current account */}
                    <div className="flex items-center gap-2 p-2.5 bg-secondary/50 rounded-lg border border-border">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground flex-1">
                        {accounts.find(a => a.id === editTrade?.accountId)?.name || 'Unknown Account'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Current
                      </span>
                    </div>

                    {/* Add to another account */}
                    {!showAddAccount ? (
                      <button
                        type="button"
                        onClick={() => setShowAddAccount(true)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        + Add to another account
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <AccountSelect
                          accounts={accounts.filter(a => a.id !== editTrade?.accountId)}
                          selectedAccountIds={selectedAccountIds.filter(id => id !== editTrade?.accountId)}
                          onChange={(ids) => setSelectedAccountIds([...(editTrade?.accountId ? [editTrade.accountId] : []), ...ids])}
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                          Adding an account creates a separate copy of this trade for that account's tracking.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Section A: Core Trade Details */}
              <section className="bg-card/50 border border-border/50 rounded-xl p-3.5 space-y-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Core Details
                  <span className="text-[9px] font-normal normal-case tracking-normal text-muted-foreground ml-1">— required fields marked with <span className="text-destructive">*</span></span>
                </div>

                {/* Direction Toggle */}
                <div className="flex gap-2 w-full sm:max-w-xs">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Symbol <span className="text-destructive">*</span></Label>
                    <DynamicSelect
                      value={symbol}
                      onChange={setSymbol}
                      options={options.symbols}
                      onAddNew={addSymbol}
                      onRemove={removeSymbol}
                      placeholder="e.g. EURUSD"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Entry Price <span className="text-destructive">*</span></Label>
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
                    <Label className="text-xs">Exit Price <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      step="any"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      placeholder="0.00"
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Size (lots) <span className="text-destructive">*</span></Label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Entry Date & Time <span className="text-destructive">*</span></Label>
                    <DateTimePicker
                      value={entryDateTime}
                      onChange={setEntryDateTime}
                      placeholder="Select entry time"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Exit Date & Time <span className="text-destructive">*</span></Label>
                    <DateTimePicker
                      value={exitDateTime}
                      onChange={setExitDateTime}
                      placeholder="Select exit time"
                      required
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Net PnL ($) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      step="any"
                      value={displayPnl}
                      onChange={(e) => setManualPnl(e.target.value)}
                      placeholder={calculatedPnl || '0.00'}
                      className={cn(
                        "font-mono text-sm",
                        parseFloat(displayPnl) > 0 && "text-success",
                        parseFloat(displayPnl) < 0 && "text-destructive"
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculatedPnl && !manualPnl ? 'Auto-calculated from entry/exit prices. Enter a value to override.' :
                       manualPnl ? 'Manual override active.' : 'Enter prices above for auto-calculation, or type a value.'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Outcome <span className="text-destructive">*</span></Label>
                    <DynamicSelect
                      value={outcome}
                      onChange={(value) => setOutcome(value as TradeOutcome)}
                      options={['TP', 'PARTIAL', 'SL', 'BREAKEVEN']}
                      placeholder="Select outcome"
                    />
                  </div>
                </div>
              </section>

              {/* Section B: Trade Context (Collapsible) */}
              <Collapsible defaultOpen={false} className="bg-card/50 border border-border/50 rounded-xl">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3.5 py-3 text-[11px] font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors group">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Trade Context</span>
                  <span className="text-[10px] text-muted-foreground normal-case tracking-normal ml-auto mr-2">Optional</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-3.5 pb-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Strategy / Setup</Label>
                      <DynamicSelect
                        value={strategy}
                        onChange={setStrategy}
                        options={options.strategies}
                        onAddNew={addStrategy}
                        onRemove={removeStrategy}
                        placeholder="e.g. Breakout"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Session</Label>
                      <DynamicSelect
                        value={session}
                        onChange={setSession}
                        options={options.sessions}
                        onAddNew={addSession}
                        onRemove={removeSession}
                        placeholder="e.g. London"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Market Condition</Label>
                      <DynamicSelect
                        value={marketCondition}
                        onChange={setMarketCondition}
                        options={options.marketConditions}
                        onAddNew={addMarketCondition}
                        onRemove={removeMarketCondition}
                        placeholder="e.g. Trending"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Section C: Analysis (Collapsible) */}
              <Collapsible defaultOpen={false} className="bg-card/50 border border-border/50 rounded-xl">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3.5 py-3 text-[11px] font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors group">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analysis</span>
                  <span className="text-[10px] text-muted-foreground normal-case tracking-normal ml-auto mr-2">Optional</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-3.5 pb-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 h-6">
                        <Label className="text-xs">News / Events</Label>
                      </div>
                      <SmartInput
                        value={newsEvent}
                        onChange={setNewsEvent}
                        suggestions={options.newsEvents}
                        onAddNew={addNewsEvent}
                        placeholder="Type to search or add new..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 h-6">
                        <Lightbulb className="w-3.5 h-3.5 text-warning" />
                        <Label className="text-xs">Key Lesson</Label>
                      </div>
                      <div className="relative">
                        <SmartInput
                          value={keyLesson}
                          onChange={setKeyLesson}
                          suggestions={options.lessons}
                          onAddNew={addLesson}
                          placeholder="What did you learn from this trade?"
                          className="pr-12"
                        />
                        <div className="absolute top-2 right-2">
                          <TextEnhancerButton
                            text={keyLesson}
                            onEnhanced={setKeyLesson}
                          />
                        </div>
                      </div>
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

                  {/* Broken Rules — always visible so users discover the feature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-destructive" />
                      <Label className="text-xs">Broken Rules</Label>
                      {brokenRuleIds.length > 0 && (
                        <span className="text-xs text-destructive">({brokenRuleIds.length} broken)</span>
                      )}
                      {rules.length > 0 && (
                        <span className="text-xs text-muted-foreground/60 ml-auto">
                          from Goals & Rules
                        </span>
                      )}
                    </div>
                    <BrokenRulesSelect
                      rules={rules}
                      selectedRuleIds={brokenRuleIds}
                      onChange={setBrokenRuleIds}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Section D: Trade Notes (Collapsible) */}
              <Collapsible defaultOpen={false} className="bg-card/50 border border-border/50 rounded-xl">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3.5 py-3 text-[11px] font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors group">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Trade Notes</span>
                  <span className="text-[10px] text-muted-foreground normal-case tracking-normal ml-auto mr-2">Optional</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-3.5 pb-3.5">
                  <div className="space-y-1.5 relative">
                    <div className="relative">
                      <Textarea
                        value={tradeNotes}
                        onChange={(e) => setTradeNotes(e.target.value)}
                        placeholder="Add any additional notes about this trade..."
                        rows={4}
                        className="text-sm resize-y pr-12"
                      />
                      <div className="absolute top-2 right-2">
                        <TextEnhancerButton
                          text={tradeNotes}
                          onEnhanced={setTradeNotes}
                          isTradingNotes={true}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Section E: Visual Evidence (Collapsible) */}
              <Collapsible defaultOpen={false} className="bg-card/50 border border-border/50 rounded-xl">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3.5 py-3 text-[11px] font-medium uppercase tracking-wider text-primary hover:text-primary/80 transition-colors group">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Visual Evidence</span>
                  <span className="text-[10px] text-muted-foreground normal-case tracking-normal ml-auto mr-2">Optional</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-3.5 pb-3.5">
                  <ImageUploader
                    images={images}
                    onChange={setImages}
                    timeframeOptions={options.timeframes}
                    onAddTimeframe={addTimeframe}
                    onRemoveTimeframe={removeTimeframe}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-secondary/30 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-28"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full sm:w-28"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editMode ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              editMode ? 'Save' : 'Add Trade'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
