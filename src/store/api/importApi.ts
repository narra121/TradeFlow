import { chunk, SAVE_CHUNK_SIZE, toCreateItems } from '@/lib/import';
import { groupBatches, type ImportBatch, type RawBatchTrade } from '@/lib/import/batches';
import type { ExtractedItem } from '@/lib/import/screenshot';
import type { ExtractedImageDates } from '@/lib/import/dates';
import type { ImportCreateItem, ImportSource, NormalizedTrade, ParseImportRequest, ParseImportResponse, SaveImportedResult } from '@/types/import';
import { api } from './baseApi';

const apiWithTags = api.enhanceEndpoints({ addTagTypes: ['ImportSources', 'ImportBatches', 'Entitlements'] });

interface SaveImportedArgs {
  trades: NormalizedTrade[];
  accountId: string;
  /** externalIds the user kept selected in the preview; default all non-duplicates */
  only?: ReadonlySet<string>;
  /** reuse the batchId of a previous attempt when retrying */
  batchId?: string;
  /** called before each chunk; `paused` while the browser is offline */
  onProgress?: (p: { done: number; total: number; paused?: boolean }) => void;
}

const waitOnline = () => new Promise<void>((resolve) => window.addEventListener('online', () => resolve(), { once: true }));

/** Pages of 100 scanned per account when looking for past imports. */
const BATCH_SCAN_PAGES = 10;

/** A save's result plus the externalIds of the trades the server already had (skipped as duplicates). */
export type SavedImport = SaveImportedResult & { skippedExternalIds: string[] };

export const importApi = apiWithTags.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    getImportSources: builder.query<ImportSource[], void>({
      query: () => '/import/sources',
      transformResponse: (r: { sources: ImportSource[] }) => r.sources,
      providesTags: ['ImportSources'],
      keepUnusedDataFor: 3600,
    }),

    /** Parses a file; uses one `broker_import` unit unless the same file was parsed in the last 30 minutes. */
    parseImport: builder.mutation<ParseImportResponse, ParseImportRequest>({
      query: (body) => ({ url: '/import/parse', method: 'POST', body }),
      invalidatesTags: ['Entitlements'],
    }),

    /**
     * Past imports: groups the newest trades (up to MAX_PAGES x 100 per account, newest first by open date) by
     * importBatchId. There is no batch index on the API, so this scans trades; it is requested on demand only.
     */
    getImportBatches: builder.query<ImportBatch[], { accountIds: string[] }>({
      async queryFn({ accountIds }, _api, _extra, baseQuery) {
        const end = new Date(Date.now() + 366 * 86_400_000).toISOString().slice(0, 10);
        const all: RawBatchTrade[] = [];
        let failed = 0;
        let firstError: unknown;
        await Promise.all(
          accountIds.map(async (accountId) => {
            let cursor: string | undefined;
            for (let page = 0; page < BATCH_SCAN_PAGES; page++) {
              const r = await baseQuery({ url: '/trades', params: { accountId, startDate: '2000-01-01', endDate: end, limit: 100, ...(cursor ? { cursor } : {}) } });
              if (r.error) {
                failed += 1;
                firstError ??= r.error;
                return;
              }
              const d = (r.data ?? {}) as { trades?: RawBatchTrade[]; pagination?: { nextCursor?: string | null; hasMore?: boolean } };
              all.push(...(d.trades ?? []));
              cursor = d.pagination?.hasMore ? d.pagination.nextCursor ?? undefined : undefined;
              if (!cursor) return;
            }
          }),
        );
        if (failed > 0 && all.length === 0) return { error: firstError as never };
        return { data: groupBatches(all) };
      },
      providesTags: ['ImportBatches'],
      keepUnusedDataFor: 120,
    }),

    /**
     * AI extraction from up to 3 screenshots (data URLs); one `ai_extract` unit per call. `timeZone` (IANA) is the
     * clock the review shows: the server fills missing years from it and falls back to its region's day/month order.
     */
    extractScreenshots: builder.mutation<
      { items: ExtractedItem[]; images?: ExtractedImageDates[]; error?: { code: string; message: string } },
      { images: string[]; timeZone?: string }
    >({
      query: (body) => ({ url: '/trades/extract', method: 'POST', body, timeout: 90_000 }),
      invalidatesTags: ['Entitlements'],
    }),

    /** Saves in chunks of 50 through POST /trades. Safe to repeat: every item has an idempotency key. */
    saveImportedTrades: builder.mutation<SavedImport, SaveImportedArgs>({
      async queryFn({ trades, accountId, only, batchId, onProgress }, _api, _extra, baseQuery) {
        const batch = batchId ?? crypto.randomUUID();
        const items: ImportCreateItem[] = toCreateItems(trades, accountId, { only, batchId: batch });
        const result: SavedImport = { created: 0, skipped: 0, errors: 0, failed: 0, batchId: batch, createdIds: [], failedExternalIds: [], skippedExternalIds: [] };
        let lastError: unknown;
        let sent = 0;
        for (const part of chunk(items, SAVE_CHUNK_SIZE)) {
          while (typeof navigator !== 'undefined' && navigator.onLine === false) {
            onProgress?.({ done: sent, total: items.length, paused: true });
            await waitOnline();
          }
          onProgress?.({ done: sent, total: items.length });
          sent += part.length;
          const r = await baseQuery({ url: '/trades', method: 'POST', body: { items: part } });
          if (r.error) {
            lastError = r.error;
            result.failed += part.length;
            result.failedExternalIds.push(...part.map((i) => i.externalId));
            continue;
          }
          const d = (r.data ?? {}) as { created?: number | unknown[]; skipped?: { index?: number }[]; errors?: unknown[]; items?: { tradeId?: string }[] };
          for (const it of d.items ?? []) if (it.tradeId) result.createdIds.push(it.tradeId);
          result.created += typeof d.created === 'number' ? d.created : Array.isArray(d.created) ? d.created.length : 0;
          result.skipped += Array.isArray(d.skipped) ? d.skipped.length : 0;
          // `index` points into this chunk: the rows the server already had, so the review can say so per row.
          for (const s of d.skipped ?? []) if (typeof s.index === 'number' && part[s.index]) result.skippedExternalIds.push(part[s.index].externalId);
          result.errors += Array.isArray(d.errors) ? d.errors.length : 0;
        }
        if (items.length > 0 && result.failed === items.length) return { error: lastError as never };
        return { data: result };
      },
      invalidatesTags: [{ type: 'Trades', id: 'LIST' }, { type: 'Trades', id: 'PAGINATED_LIST' }, 'Stats', 'ImportBatches'],
    }),
  }),
});

export const { useGetImportSourcesQuery, useParseImportMutation, useSaveImportedTradesMutation, useExtractScreenshotsMutation, useGetImportBatchesQuery } = importApi;
