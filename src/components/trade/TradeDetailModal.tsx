import { Trade } from '@/types/trade';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { TradeDetailContent } from './TradeDetailContent';

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
  ...contentProps
}: TradeDetailModalProps) {
  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Trade Details</DialogTitle>
        <TradeDetailContent trade={trade} {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}
