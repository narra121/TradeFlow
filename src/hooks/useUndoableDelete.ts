import { useCallback } from 'react';
import { toast } from 'sonner';
import { useBulkDeleteTradesMutation, useDeleteTradeMutation, useRestoreTradesMutation } from '@/store/api';
import { chunk } from '@/lib/tradeFilters';
import { readApiError } from '@/lib/apiError';
import { formatDayText } from '@/lib/format';
import type { Trade } from '@/types/trade';

const BULK_DELETE_CHUNK = 50;
export const UNDO_MS = 10_000;

/**
 * Deletes trades and offers `Undo` for ten seconds (E-055, BE-E1): a single trade needs no confirmation, since a
 * mis-tap can be taken back; a selection keeps its dialog (the caller's) and gains the same Undo.
 * Resolves true when everything was deleted; a failure is reported by the toast middleware. When a later chunk fails,
 * the trades already deleted keep their Undo, the toast says how many went, and it resolves false. A bulk call that answers
 * 200 with per-trade `errors` counts those trades as not deleted (the store puts them back in the lists).
 */
export function useUndoableDelete() {
  const [deleteOne] = useDeleteTradeMutation();
  const [bulkDelete] = useBulkDeleteTradesMutation();
  const [restore] = useRestoreTradesMutation();

  return useCallback(
    async (trades: Trade[]): Promise<boolean> => {
      if (trades.length === 0) return true;
      const deleted: Trade[] = [];
      let refused = 0;
      let reason: string | undefined;
      try {
        if (trades.length === 1) {
          await deleteOne(trades[0].id).unwrap();
          deleted.push(trades[0]);
        } else {
          for (const part of chunk(trades, BULK_DELETE_CHUNK)) {
            const res = (await bulkDelete({ tradeIds: part.map((t) => t.id) }).unwrap()) as { errors?: { tradeId: string; message?: string }[] } | undefined;
            reason ??= res?.errors?.[0]?.message;
            const failed = new Set((res?.errors ?? []).map((e) => e.tradeId));
            deleted.push(...part.filter((t) => !failed.has(t.id)));
            refused += failed.size;
          }
        }
      } catch {
        if (deleted.length === 0) return false;
      }
      if (deleted.length === 0) {
        toast.error("Couldn't delete.", { description: reason ?? 'Try again.' });
        return false;
      }
      const label = deleted.length === 1 ? `${deleted[0].symbol} ${deleted[0].direction === 'LONG' ? 'long' : 'short'}, ${formatDayText(deleted[0].exitDate || deleted[0].entryDate)} deleted` : `${deleted.length} trades deleted`;
      const complete = deleted.length === trades.length;
      toast(complete ? label : `${deleted.length} of ${trades.length} trades deleted`, {
        duration: UNDO_MS,
        ...(complete ? {} : { description: refused > 0 ? `${refused} could not be deleted.` : 'The rest could not be deleted.' }),
        action: {
          label: 'Undo',
          onClick: () => {
            restore({ trades: deleted })
              .unwrap()
              .then(() => toast.success(deleted.length === 1 ? 'Trade restored' : `${deleted.length} trades restored`))
              .catch((err) => toast.error("Couldn't restore.", { description: readApiError(err, 'Try again.').message }));
          },
        },
      });
      return complete;
    },
    [deleteOne, bulkDelete, restore],
  );
}
