import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { tradesApi } from '@/lib/api/trades';
import {
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trade, TradeDirection } from '@/types/trade';
import { useAccounts } from '@/hooks/useAccounts';
import {
  Import,
  Image as ImageIcon,
  FileSpreadsheet,
  ClipboardPaste,
  Trash2,
  Pencil,
  Merge,
  Save,
  X,
  Check,
  Loader2,
  AlertCircle,
  Info,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportedTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
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
  onImportTrades: (trades: Omit<Trade, 'id'>[]) => Promise<{ success: boolean; error?: any }>;
}

const MAX_FILE_SIZE = 10 * 1024; // 10KB
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB per image
const SPREADSHEET_EXTENSIONS = ['.csv', '.txt', '.xls', '.xlsx'];
const isSpreadsheetFile = (file: File) => {
  const ext = '.' + file.name.toLowerCase().split('.').pop();
  return SPREADSHEET_EXTENSIONS.includes(ext);
};

const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

export function ImportTradesModal({ open, onOpenChange, onImportTrades }: ImportTradesModalProps) {
  const [uploadedImages, setUploadedImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [extractedTrades, setExtractedTrades] = useState<ImportedTrade[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importAccountIds, setImportAccountIds] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string; size: number; type: string; parsedText: string; rowCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'none' | 'image' | 'file'>('none');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { accounts } = useAccounts();

  // Handle paste event
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Check for images first
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          if (importMode === 'file') return; // Don't mix modes
          const file = item.getAsFile();
          if (file) {
            setImportMode('image');
            processImageFile(file);
          }
          return;
        }
      }

      // Check for text (pasted CSV/tabular data)
      const text = e.clipboardData?.getData('text/plain');
      if (text && text.trim().length > 10 && (text.includes('\t') || text.includes(',')) && text.includes('\n')) {
        if (importMode === 'image' && uploadedImages.length > 0) return; // Don't mix
        const parseResult = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
        if (parseResult.data.length > 1) {
          setUploadedFile({
            name: 'Pasted data',
            size: new Blob([text]).size,
            type: 'paste',
            parsedText: text,
            rowCount: parseResult.data.length - 1,
          });
          setImportMode('file');
          setUploadedImages([]);
          setExtractionError(null);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, importMode, uploadedImages.length]);

  const processImageFile = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 1 MB limit`);
      return;
    }
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

  const processSpreadsheetFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size (${(file.size / 1024).toFixed(1)} KB) exceeds 10 KB limit`);
      return;
    }

    try {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      const isExcel = ext === 'xls' || ext === 'xlsx';
      let csvText: string;

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(firstSheet);
      } else {
        csvText = await file.text();
      }

      const parseResult = Papa.parse(csvText.trim(), { header: false, skipEmptyLines: true });
      const rowCount = Math.max(0, parseResult.data.length - 1);

      if (rowCount === 0) {
        toast.error('File contains no data rows');
        return;
      }

      setUploadedFile({ name: file.name, size: file.size, type: ext, parsedText: csvText, rowCount });
      setImportMode('file');
      setUploadedImages([]);
      setExtractionError(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
    }
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
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (importMode === 'file') {
          toast.error('Remove the uploaded file before adding images');
          return;
        }
        setImportMode('image');
        processImageFile(file);
      } else if (isSpreadsheetFile(file)) {
        if (importMode === 'image' && uploadedImages.length > 0) {
          toast.error('Remove uploaded images before adding a file');
          return;
        }
        processSpreadsheetFile(file);
      }
    }
  }, [importMode, uploadedImages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        setImportMode('image');
        processImageFile(file);
      }
    });
    e.target.value = '';
  };

  const handleSpreadsheetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processSpreadsheetFile(files[0]);
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (next.length === 0) setImportMode('none');
      return next;
    });
  };

  const extractTrades = async () => {
    if (importMode === 'image' && uploadedImages.length === 0) return;
    if (importMode === 'file' && !uploadedFile) return;

    setIsProcessing(true);
    setExtractionError(null);

    try {
      let response;

      if (importMode === 'image') {
        const imageData = uploadedImages.slice(0, 3).map(img => img.url);
        response = await tradesApi.extractTrades({ images: imageData });
      } else {
        response = await tradesApi.extractTrades({ textContent: uploadedFile!.parsedText });
      }

      // Check for extraction errors returned by the API
      if (response.error) {
        setExtractionError(response.error.message || 'Extraction failed');
        if (response.items.length === 0) {
          setIsProcessing(false);
          return; // Keep source intact for retry
        }
      }

      const extracted: ImportedTrade[] = response.items.map((trade: any, index: number) => ({
        id: (Date.now() + index).toString(),
        symbol: trade.symbol || '',
        direction: trade.side === 'BUY' ? 'LONG' : trade.side === 'SELL' ? 'SHORT' : 'LONG',
        entryPrice: parseFloat(trade.entryPrice) || 0,
        exitPrice: parseFloat(trade.exitPrice) || 0,
        stopLoss: parseFloat(trade.stopLoss) || 0,
        takeProfit: parseFloat(trade.takeProfit) || 0,
        size: parseFloat(trade.quantity) || 0,
        pnl: parseFloat(trade.pnl) || 0,
        entryDate: trade.openDate ? new Date(trade.openDate) : new Date(),
        exitDate: trade.closeDate ? new Date(trade.closeDate) : new Date(),
        isEditing: false,
        isSelected: false,
      }));

      if (extracted.length === 0) {
        const apiMsg = response.message || 'No trades found in the uploaded data';
        toast.warning(apiMsg);
        return; // Keep source intact for retry
      }

      if (extracted.length > 50) {
        toast.warning(`File contains ${extracted.length} trades. Only the first 50 will be imported.`);
      }

      setExtractedTrades(extracted.slice(0, 50));

      // On success, clear the source material
      setUploadedImages([]);
      setUploadedFile(null);
    } catch (error: any) {
      const source = importMode === 'image' ? 'image' : 'file';
      const msg = error?.response?.data?.message || error?.message || `Failed to extract trades from ${source}`;
      setExtractionError(msg);
      // Keep source intact for retry
    } finally {
      setIsProcessing(false);
    }
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

  // Merge eligibility: 2+ selected AND all same direction
  const selectedTrades = extractedTrades.filter(t => t.isSelected);
  const selectedCount = selectedTrades.length;
  const selectedDirections = new Set(selectedTrades.map(t => t.direction));
  const canMerge = selectedCount >= 2 && selectedDirections.size === 1;
  const mergeDisabledReason = selectedCount < 2
    ? 'Select 2 or more trades to merge'
    : selectedDirections.size > 1
      ? 'Can only merge trades with the same direction (all Long or all Short)'
      : '';

  const mergeSelectedTrades = () => {
    if (!canMerge) return;

    // Merge logic: combine into first trade, sum size and pnl
    const merged: ImportedTrade = {
      ...selectedTrades[0],
      size: selectedTrades.reduce((sum, t) => sum + t.size, 0),
      pnl: selectedTrades.reduce((sum, t) => sum + t.pnl, 0),
      stopLoss: selectedTrades[0].stopLoss,
      takeProfit: selectedTrades[0].takeProfit,
      entryDate: new Date(Math.min(...selectedTrades.map(t => t.entryDate.getTime()))),
      exitDate: new Date(Math.max(...selectedTrades.map(t => t.exitDate.getTime()))),
      isSelected: false,
    };

    const unselectedTrades = extractedTrades.filter(t => !t.isSelected);
    setExtractedTrades([...unselectedTrades, merged]);
    toast.success(`Merged ${selectedTrades.length} trades — size and P&L combined`);
  };

  const deleteSelectedTrades = () => {
    setExtractedTrades(prev => prev.filter(t => !t.isSelected));
  };

  const handleSaveAll = async () => {
    // Validate all trades have required fields
    const errors: string[] = [];
    for (let i = 0; i < extractedTrades.length; i++) {
      const t = extractedTrades[i];
      const row = i + 1;
      if (!t.symbol || !t.symbol.trim()) errors.push(`Row ${row}: Symbol is required`);
      if (!t.entryPrice || t.entryPrice <= 0) errors.push(`Row ${row}: Entry price is required`);
      if (!t.exitPrice || t.exitPrice <= 0) errors.push(`Row ${row}: Exit price is required`);
      if (!t.size || t.size <= 0) errors.push(`Row ${row}: Size is required`);
    }

    if (errors.length > 0) {
      toast.warning('Missing required fields', {
        description: errors.length <= 3
          ? errors.join('\n')
          : `${errors.slice(0, 3).join('\n')}\n...and ${errors.length - 3} more`,
      });
      return;
    }

    setIsSaving(true);

    try {
      const tradesToSave: Omit<Trade, 'id'>[] = extractedTrades.map(t => ({
        symbol: t.symbol,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        size: t.size,
        entryDate: t.entryDate.toISOString(),
        exitDate: t.exitDate.toISOString(),
        outcome: t.pnl > 0 ? 'TP' as const : t.pnl < 0 ? 'SL' as const : 'BREAKEVEN' as const,
        pnl: t.pnl,
        riskRewardRatio: 0,
        ...(importAccountIds.length > 0 ? { accountIds: importAccountIds } : {}),
      }));

      const result = await onImportTrades(tradesToSave);
      
      // Only close and reset if save was successful
      if (result?.success) {
        resetModal();
        onOpenChange(false);
      }
      // If not successful, keep dialog open for user to retry
    } catch (error) {
      toast.error('Failed to save trades');
    } finally {
      setIsSaving(false);
    }
  };

  const resetModal = () => {
    setUploadedImages([]);
    setUploadedFile(null);
    setImportMode('none');
    setExtractedTrades([]);
    setIsProcessing(false);
    setImportAccountIds([]);
    setExtractionError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetModal();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[80vw] max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] h-[95vh] sm:h-[85vh] max-h-[95vh] sm:max-h-[85vh] p-0 bg-card border-border overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">Import Trades</DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Upload screenshots, spreadsheet files (CSV, Excel, TXT), or paste trade data directly. AI extracts and normalizes trade data from any format.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
            {/* Upload Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-4 sm:p-8 transition-all duration-200",
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
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={spreadsheetInputRef}
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                onChange={handleSpreadsheetSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
                <div className={cn(
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-colors",
                  isDragging ? "bg-primary/20" : "bg-muted"
                )}>
                  <Import className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <p className="text-base sm:text-lg font-medium">
                    {isDragging ? "Drop your file here" : "Import Trades"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Drag & drop, paste from clipboard (Ctrl+V), or click to select
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMode === 'file'}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Select Images
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => spreadsheetInputRef.current?.click()}
                    disabled={importMode === 'image'}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Select File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text && text.trim().length > 10 && (text.includes('\t') || text.includes(',')) && text.includes('\n')) {
                          const parseResult = Papa.parse(text.trim(), { header: false, skipEmptyLines: true });
                          if (parseResult.data.length > 1) {
                            setUploadedFile({
                              name: 'Pasted data',
                              size: new Blob([text]).size,
                              type: 'paste',
                              parsedText: text,
                              rowCount: parseResult.data.length - 1,
                            });
                            setImportMode('file');
                            setUploadedImages([]);
                            setExtractionError(null);
                          } else {
                            toast.info('Clipboard text does not appear to contain tabular trade data');
                          }
                        } else if (text && text.trim()) {
                          toast.info('Clipboard text does not appear to contain tabular trade data. Use CSV or tab-separated format.');
                        } else {
                          toast.info('Clipboard is empty');
                        }
                      } catch {
                        toast.error('Unable to read clipboard. Please use Ctrl+V to paste instead.');
                      }
                    }}
                    disabled={importMode === 'image' && uploadedImages.length > 0}
                  >
                    <ClipboardPaste className="w-4 h-4 mr-2" />
                    Paste from Clipboard
                  </Button>
                </div>

                <p className="text-[10px] sm:text-xs text-muted-foreground/60">
                  Supports: PNG, JPG, CSV, TXT, XLS, XLSX · Paste text directly · Max 1 MB per image, 10 KB for files
                </p>
              </div>
            </div>

            {/* Uploaded File Preview */}
            {uploadedFile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Uploaded File
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
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  {uploadedFile.type === 'paste' ? (
                    <ClipboardPaste className="w-8 h-8 text-muted-foreground shrink-0" />
                  ) : (
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.rowCount} rows detected · {uploadedFile.type.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => { setUploadedFile(null); setImportMode('none'); setExtractionError(null); }}
                    className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

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

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {uploadedImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-border"
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

            {/* Extraction Error Banner */}
            {extractionError && !isProcessing && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Extraction Failed</p>
                  <p className="text-xs text-muted-foreground mt-1">{extractionError}</p>
                </div>
                <button
                  onClick={() => setExtractionError(null)}
                  className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-muted-foreground">{importMode === 'image' ? 'AI is extracting trades from your screenshots...' : 'AI is extracting trades from your data...'}</span>
              </div>
            )}

            {/* Extracted Trades Table */}
            {extractedTrades.length > 0 && !isProcessing && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Extracted Trades ({extractedTrades.length})
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCount > 0 ? (
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {selectedCount} selected
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">
                        Select rows to merge or delete
                      </span>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={mergeSelectedTrades}
                              className="gap-1"
                              disabled={!canMerge}
                            >
                              <Merge className="w-3.5 h-3.5" />
                              Merge
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canMerge && mergeDisabledReason && (
                          <TooltipContent>
                            <p>{mergeDisabledReason}</p>
                          </TooltipContent>
                        )}
                        {canMerge && (
                          <TooltipContent>
                            <p>Combine selected trades: sizes and P&L summed</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteSelectedTrades}
                      className="gap-1"
                      disabled={selectedCount === 0}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden grid">
                  <ScrollAreaPrimitive.Root type="always" className="relative w-full overflow-hidden">
                    <ScrollAreaPrimitive.Viewport className="w-full h-full">
                      {/* w-max ensures the container expands to fit the table width */}
                      {/* min-w-full ensures it fills the viewport if content is small */}
                      <div className="min-w-full w-max">
                        <table className="w-full caption-bottom text-sm whitespace-nowrap">
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
                              <TableHead>Stop Loss</TableHead>
                              <TableHead>Take Profit</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>P&L</TableHead>
                              <TableHead>Entry Date</TableHead>
                              <TableHead>Exit Date</TableHead>
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
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded text-xs font-medium",
                                        trade.direction === 'LONG'
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : "bg-red-500/20 text-red-400"
                                      )}
                                    >
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
                                    trade.entryPrice.toFixed(2)
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
                                    trade.exitPrice.toFixed(2)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {trade.isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.00001"
                                      value={trade.stopLoss}
                                      onChange={(e) => updateTrade(trade.id, 'stopLoss', parseFloat(e.target.value))}
                                      className="h-8 w-24"
                                    />
                                  ) : (
                                    trade.stopLoss.toFixed(2)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {trade.isEditing ? (
                                    <Input
                                      type="number"
                                      step="0.00001"
                                      value={trade.takeProfit}
                                      onChange={(e) => updateTrade(trade.id, 'takeProfit', parseFloat(e.target.value))}
                                      className="h-8 w-24"
                                    />
                                  ) : (
                                    trade.takeProfit.toFixed(2)
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
                                    trade.size.toFixed(2)
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
                                    <span
                                      className={cn(
                                        "font-medium",
                                        trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                                      )}
                                    >
                                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {trade.isEditing ? (
                                    <div className="w-48">
                                      <DateTimePicker
                                        value={toLocalISOString(trade.entryDate)}
                                        onChange={(value) => updateTrade(trade.id, 'entryDate', new Date(value))}
                                        className="h-8"
                                      />
                                    </div>
                                  ) : (
                                    trade.entryDate.toLocaleString()
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {trade.isEditing ? (
                                    <div className="w-48">
                                      <DateTimePicker
                                        value={toLocalISOString(trade.exitDate)}
                                        onChange={(value) => updateTrade(trade.id, 'exitDate', new Date(value))}
                                        className="h-8"
                                      />
                                    </div>
                                  ) : (
                                    trade.exitDate.toLocaleString()
                                  )}
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
                        </table>
                      </div>
                    </ScrollAreaPrimitive.Viewport>

                    <ScrollBar orientation="horizontal" />
                    <ScrollAreaPrimitive.Corner />
                  </ScrollAreaPrimitive.Root>
                </div>

                {extractedTrades.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p>No trades extracted. Try a different file format or a clearer screenshot.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-secondary/30 shrink-0 space-y-3">
          {/* Account selector — show when trades are extracted */}
          {extractedTrades.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Building2 className="w-4 h-4" />
                <span>Save to account{accounts.length > 1 ? '(s)' : ''}:</span>
              </div>
              {accounts.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-secondary/30 rounded-lg p-2.5">
                  <span>No accounts yet.</span>
                  <button
                    type="button"
                    onClick={() => window.open('/app/accounts', '_blank')}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Create an account
                  </button>
                  <span>to organize trades, or save without an account.</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const isSelected = importAccountIds.includes(acc.id);
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setImportAccountIds(prev =>
                            isSelected
                              ? prev.filter(id => id !== acc.id)
                              : [...prev, acc.id]
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {acc.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {importAccountIds.length === 0 && accounts.length > 0 && (
                <span className="text-xs text-muted-foreground/60">
                  No account selected — trades will be saved without an account
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetModal();
                onOpenChange(false);
              }}
              className="w-full sm:w-28"
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={extractedTrades.length === 0 || isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                importAccountIds.length > 0
                  ? `Save to ${importAccountIds.map(id => accounts.find(a => a.id === id)?.name).filter(Boolean).join(', ')}`
                  : 'Save All'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
