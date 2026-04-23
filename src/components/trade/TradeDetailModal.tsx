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
  return (
    <Dialog open={isOpen && !!trade} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Trade Details</DialogTitle>
        {trade && <TradeDetailContent trade={trade} {...contentProps} />}
      </DialogContent>
    </Dialog>
  );
}
