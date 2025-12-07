import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trade, TradeDirection } from '@/types/trade';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Pencil, 
  Merge, 
  Save,
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportedTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  entryDate: Date;
  exitDate: Date;
  isEditing: boolean;
  isSelected: boolean;
}

interface ImportTradesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportTrades: (trades: Omit<Trade, 'id'>[]) => void;
}

export function ImportTradesModal({ open, onOpenChange, onImportTrades }: ImportTradesModalProps) {
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [extractedTrades, setExtractedTrades] = useState<ImportedTrade[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle paste event
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open]);

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setUploadedImages(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        name: file.name
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const extractTrades = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    
    // Simulate API call - replace with actual AI extraction later
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock extracted trades for UI demo
    const mockExtracted: ImportedTrade[] = [
      {
        id: '1',
        symbol: 'EURUSD',
        direction: 'LONG',
        entryPrice: 1.0850,
        exitPrice: 1.0920,
        size: 1.0,
        pnl: 70,
        entryDate: new Date('2024-01-15T09:30:00'),
        exitDate: new Date('2024-01-15T14:45:00'),
        isEditing: false,
        isSelected: false,
      },
      {
        id: '2',
        symbol: 'GBPUSD',
        direction: 'SHORT',
        entryPrice: 1.2650,
        exitPrice: 1.2580,
        size: 0.5,
        pnl: 35,
        entryDate: new Date('2024-01-15T10:15:00'),
        exitDate: new Date('2024-01-15T16:00:00'),
        isEditing: false,
        isSelected: false,
      },
      {
        id: '3',
        symbol: 'USDJPY',
        direction: 'LONG',
        entryPrice: 148.50,
        exitPrice: 148.20,
        size: 0.25,
        pnl: -75,
        entryDate: new Date('2024-01-15T11:00:00'),
        exitDate: new Date('2024-01-15T15:30:00'),
        isEditing: false,
        isSelected: false,
      },
    ];

    setExtractedTrades(mockExtracted);
    setIsProcessing(false);
  };

  const toggleEdit = (id: string) => {
    setExtractedTrades(prev => 
      prev.map(trade => 
        trade.id === id ? { ...trade, isEditing: !trade.isEditing } : trade
      )
    );
  };

  const updateTrade = (id: string, field: keyof ImportedTrade, value: any) => {
    setExtractedTrades(prev =>
      prev.map(trade =>
        trade.id === id ? { ...trade, [field]: value } : trade
      )
    );
  };

  const deleteTrade = (id: string) => {
    setExtractedTrades(prev => prev.filter(trade => trade.id !== id));
  };

  const toggleSelect = (id: string) => {
    setExtractedTrades(prev =>
      prev.map(trade =>
        trade.id === id ? { ...trade, isSelected: !trade.isSelected } : trade
      )
    );
  };

  const toggleSelectAll = () => {
    const allSelected = extractedTrades.every(t => t.isSelected);
    setExtractedTrades(prev =>
      prev.map(trade => ({ ...trade, isSelected: !allSelected }))
    );
  };

  const mergeSelectedTrades = () => {
    const selectedTrades = extractedTrades.filter(t => t.isSelected);
    if (selectedTrades.length < 2) return;

    // Merge logic: combine into first trade, sum size and pnl
    const merged: ImportedTrade = {
      ...selectedTrades[0],
      size: selectedTrades.reduce((sum, t) => sum + t.size, 0),
      pnl: selectedTrades.reduce((sum, t) => sum + t.pnl, 0),
      entryDate: new Date(Math.min(...selectedTrades.map(t => t.entryDate.getTime()))),
      exitDate: new Date(Math.max(...selectedTrades.map(t => t.exitDate.getTime()))),
      isSelected: false,
    };

    const unselectedTrades = extractedTrades.filter(t => !t.isSelected);
    setExtractedTrades([...unselectedTrades, merged]);
  };

  const deleteSelectedTrades = () => {
    setExtractedTrades(prev => prev.filter(t => !t.isSelected));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tradesToSave: Omit<Trade, 'id'>[] = extractedTrades.map(t => ({
      symbol: t.symbol,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      stopLoss: 0,
      takeProfit: 0,
      size: t.size,
      entryDate: t.entryDate.toISOString(),
      exitDate: t.exitDate.toISOString(),
      status: 'CLOSED' as const,
      pnl: t.pnl,
      riskRewardRatio: 0,
    }));

    onImportTrades(tradesToSave);
    setIsSaving(false);
    resetModal();
    onOpenChange(false);
  };

  const resetModal = () => {
    setUploadedImages([]);
    setExtractedTrades([]);
    setIsProcessing(false);
  };

  const selectedCount = extractedTrades.filter(t => t.isSelected).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetModal();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="w-[80vw] max-w-[80vw] h-[85vh] max-h-[85vh] p-0 bg-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl font-semibold">Import Trades from Screenshot</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 pb-6 space-y-6">
            {/* Upload Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                  isDragging ? "bg-primary/20" : "bg-muted"
                )}>
                  <Upload className={cn(
                    "w-8 h-8 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragging ? "Drop your screenshots here" : "Upload Trade Screenshots"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop, paste from clipboard (Ctrl+V), or click to select
                  </p>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Select Images
                </Button>
              </div>
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Uploaded Screenshots ({uploadedImages.length})
                  </h3>
                  <Button
                    onClick={extractTrades}
                    disabled={isProcessing}
                    size="sm"
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>Extract Trades</>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {uploadedImages.map((img) => (
                    <div 
                      key={img.id} 
                      className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border"
                    >
                      <img 
                        src={img.url} 
                        alt={img.name} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-muted-foreground">AI is extracting trades from your screenshots...</span>
              </div>
            )}

            {/* Extracted Trades Table */}
            {extractedTrades.length > 0 && !isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Extracted Trades ({extractedTrades.length})
                  </h3>
                  
                  {selectedCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedCount} selected
                      </span>
                      {selectedCount >= 2 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={mergeSelectedTrades}
                          className="gap-1"
                        >
                          <Merge className="w-3.5 h-3.5" />
                          Merge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={deleteSelectedTrades}
                        className="gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">
                          <Checkbox 
                            checked={extractedTrades.length > 0 && extractedTrades.every(t => t.isSelected)}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Entry Date</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedTrades.map((trade) => (
                        <TableRow key={trade.id} className={cn(trade.isSelected && "bg-primary/5")}>
                          <TableCell>
                            <Checkbox 
                              checked={trade.isSelected}
                              onCheckedChange={() => toggleSelect(trade.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Input
                                value={trade.symbol}
                                onChange={(e) => updateTrade(trade.id, 'symbol', e.target.value)}
                                className="h-8 w-24"
                              />
                            ) : (
                              <span className="font-medium">{trade.symbol}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Select
                                value={trade.direction}
                                onValueChange={(v) => updateTrade(trade.id, 'direction', v)}
                              >
                                <SelectTrigger className="h-8 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LONG">LONG</SelectItem>
                                  <SelectItem value="SHORT">SHORT</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                trade.direction === 'LONG' 
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              )}>
                                {trade.direction}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Input
                                type="number"
                                step="0.00001"
                                value={trade.entryPrice}
                                onChange={(e) => updateTrade(trade.id, 'entryPrice', parseFloat(e.target.value))}
                                className="h-8 w-24"
                              />
                            ) : (
                              trade.entryPrice.toFixed(4)
                            )}
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Input
                                type="number"
                                step="0.00001"
                                value={trade.exitPrice}
                                onChange={(e) => updateTrade(trade.id, 'exitPrice', parseFloat(e.target.value))}
                                className="h-8 w-24"
                              />
                            ) : (
                              trade.exitPrice.toFixed(4)
                            )}
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.size}
                                onChange={(e) => updateTrade(trade.id, 'size', parseFloat(e.target.value))}
                                className="h-8 w-20"
                              />
                            ) : (
                              trade.size
                            )}
                          </TableCell>
                          <TableCell>
                            {trade.isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={trade.pnl}
                                onChange={(e) => updateTrade(trade.id, 'pnl', parseFloat(e.target.value))}
                                className="h-8 w-24"
                              />
                            ) : (
                              <span className={cn(
                                "font-medium",
                                trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                              )}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {trade.entryDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => toggleEdit(trade.id)}
                              >
                                {trade.isEditing ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Pencil className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteTrade(trade.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {extractedTrades.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p>No trades extracted. Try uploading a clearer screenshot.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30 flex justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetModal();
              onOpenChange(false);
            }}
            className="w-28"
            disabled={isSaving}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSaveAll}
            disabled={extractedTrades.length === 0 || isSaving}
            className="w-28"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save All'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
