import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { batchFile, type ImportBatch } from '@/lib/import/batches';
import { sourceLabel } from '@/lib/import/labels';
import { readApiError } from '@/lib/apiError';
import { formatCount, formatDateShort } from '@/lib/format';
import { useGetImportBatchesQuery } from '@/store/api/importApi';
import { SCREENSHOT_SOURCE, type ImportSource } from '@/types/import';

interface PastImportsProps {
  accounts: { id: string; name: string }[];
  sources: ImportSource[];
  onView: (batch: ImportBatch) => void;
}

function sourceName(id: string, sources: ImportSource[]): string {
  if (id === SCREENSHOT_SOURCE) return 'Screenshots';
  if (id === 'mixed') return 'Several sources';
  const s = sources.find((x) => x.id === id);
  return s ? sourceLabel(s, sources) : id === 'unknown' ? '—' : id;
}

/** Past imports: date, file, source, account, trades and `View trades`. Loaded when opened, from the newest trades. */
export function PastImports({ accounts, sources, onView }: PastImportsProps) {
  const [open, setOpen] = useState(false);
  const { data, isFetching, isError, error, refetch } = useGetImportBatchesQuery({ accountIds: accounts.map((a) => a.id) }, { skip: !open || accounts.length === 0 });
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Account';
  const Caret = open ? ChevronDown : ChevronRight;
  return (
    <section aria-labelledby="past-h" className="space-y-2 border-t border-border pt-3">
      <h2 id="past-h" className="text-xs font-medium text-foreground-soft">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 hover:text-foreground">
          <Caret className="h-3.5 w-3.5" aria-hidden="true" /> Past imports
        </button>
      </h2>
      {open &&
        (isError ? (
          <p role="alert" className="text-13 text-loss">
            Couldn’t load your past imports. {readApiError(error, '').message}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>Retry</button>
          </p>
        ) : isFetching && !data ? (
          <div aria-busy="true" className="space-y-1"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : !data || data.length === 0 ? (
          <p className="text-13 text-muted-foreground">No imports yet. Imports made from now on are listed here with a link to their trades.</p>
        ) : (
          <>
            <table className="w-full text-13">
              <caption className="sr-only">Past imports, newest first</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="h-8 pr-3 font-medium">Imported</th>
                  <th scope="col" className="pr-3 font-medium">File</th>
                  <th scope="col" className="pr-3 font-medium">Source</th>
                  <th scope="col" className="pr-3 font-medium">Account</th>
                  <th scope="col" className="pr-3 text-right font-medium">Trades</th>
                  <th scope="col" className="font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => {
                  const file = batchFile(b.batchId);
                  return (
                    <tr key={b.batchId} className="h-9 border-t border-border/70">
                      <td className="whitespace-nowrap pr-3 font-mono tabular-nums">{formatDateShort(b.importedAt, true)}</td>
                      <td className="max-w-48 truncate pr-3">{file ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="pr-3">{sourceName(b.source, sources)}</td>
                      <td className="pr-3">{accountName(b.accountId)}</td>
                      <td className="pr-3 text-right font-mono tabular-nums">{formatCount(b.count)}</td>
                      <td className="text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onView(b)} aria-label={`View trades from the import of ${formatDateShort(b.importedAt, true)}, ${b.count} trades`}>
                          View trades →
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">Shows imports among your newest 1,000 trades per account. File names are remembered on this device.</p>
          </>
        ))}
    </section>
  );
}
