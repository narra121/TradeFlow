import { useCallback } from 'react';
import { toast } from 'sonner';
import { useBulkDeleteTradesMutation, useDeleteTradeMutation, useRestoreTradesMutation } from '@/store/api';
import { chunk } from '@/lib/tradeFilters';
import { formatDateShort } from '@/lib/format';
import type { Trade } from '@/types/trade';

const BULK_DELETE_CHUNK = 50;
export const UNDO_MS = 10_000;

/**
 * Deletes trades and offers `Undo` for ten seconds (E-055, BE-E1): a single trade needs no confirmation, since a
 * mis-tap can be taken back; a selection keeps its dialog (the caller's) and gains the same Undo.
 * Resolves true when everything was deleted; a failure is reported by the toast middleware.
 */
export function useUndoableDelete() {
  const [deleteOne] = useDeleteTradeMutation();
  const [bulkDelete] = useBulkDeleteTradesMutation();
  const [restore] = useRestoreTradesMutation();

  return useCallback(
    async (trades: Trade[]): Promise<boolean> => {
      if (trades.length === 0) return true;
      try {
        if (trades.length === 1) await deleteOne(trades[0].id).unwrap();
        else for (const part of chunk(trades, BULK_DELETE_CHUNK)) await bulkDelete({ tradeIds: part.map((t) => t.id) }).unwrap();
      } catch {
        return false;
      }
      const label = trades.length === 1 ? `${trades[0].symbol} ${trades[0].direction === 'LONG' ? 'long' : 'short'}, ${formatDateShort(trades[0].exitDate || trades[0].entryDate)} deleted` : `${trades.length} trades deleted`;
      toast(label, {
        duration: UNDO_MS,
        action: {
          label: 'Undo',
          onClick: () => {
            restore({ trades })
              .unwrap()
              .then(() => toast.success(trades.length === 1 ? 'Trade restored' : `${trades.length} trades restored`))
              .catch(() => toast.error("Couldn't restore. Try again."));
          },
        },
      });
      return true;
    },
    [deleteOne, bulkDelete, restore],
  );
}
