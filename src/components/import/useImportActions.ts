import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAppDispatch } from '@/store/hooks';
import { setAccountFilter, setDateRangeFilter } from '@/store/slices/tradesSlice';
import { useBulkDeleteTradesMutation } from '@/store/api';
import { importApi, useExtractScreenshotsMutation, useParseImportMutation, useSaveImportedTradesMutation } from '@/store/api/importApi';
import { chunk, fileToBase64, ImportFileError, importErrorMessage } from '@/lib/import';
import { readApiError } from '@/lib/apiError';
import { rememberBatchFile, type ImportBatch } from '@/lib/import/batches';
import { base64ToText, recoverSkipped } from '@/lib/import/skipped';
import { loadMapping, saveMapping, type ColumnMap } from '@/lib/import/mappingMemory';
import { appTimeZone, zoneOffsetMinutes } from '@/lib/appTimeZone';
import { switchDateOrder } from '@/lib/import/dates';
import { editRow, makeRows, MAX_REVIEW_ROWS, mergeRows, moveRows, rowStatus, setIncluded, type EditableField, type ReviewRow } from '@/lib/import/rows';
import {
  batchLabel,
  batches,
  classifyFile,
  fromExtracted,
  fitScreenshot,
  rowDatesOf,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  readAsDataUrl,
  SCREENSHOTS_PER_REQUEST,
} from '@/lib/import/screenshot';
import { importFlow } from '@/lib/importFlowStore';
import { trackImportCompleted } from '@/lib/analytics';
import { emitPlanSignal } from '@/lib/planErrors';
import { openTrialExpired } from '@/components/billing/readOnly';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { SCREENSHOT_SOURCE, type ImportSourceId, type NormalizedTrade, type ParseImportResponse, type SaveImportedResult } from '@/types/import';
import { formatCount } from '@/lib/format';

const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

/** Rows that already sit in the review (same source and external id) are marked as duplicates when a second file adds them. */
function dedupeAgainst(existing: ReviewRow[], incoming: ReviewRow[]): ReviewRow[] {
  const seen = new Set(existing.map((r) => `${r.trade.importSource}|${r.trade.externalId}`));
  return incoming.map((r) => {
    const id = `${r.trade.importSource}|${r.trade.externalId}`;
    if (seen.has(id)) return { ...r, trade: { ...r.trade, duplicate: true }, included: false };
    seen.add(id);
    return r;
  });
}

/** Everything the import page does to the flow store: read files, parse, edit rows, save, retry, undo. */
export function useImportActions() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const ent = useEntitlements();
  const [parse] = useParseImportMutation();
  const [extract] = useExtractScreenshotsMutation();
  const [save] = useSaveImportedTradesMutation();
  const [bulkDelete] = useBulkDeleteTradesMutation();
  const abort = useRef<{ abort: () => void } | null>(null);
  const cancelled = useRef(false);

  const limitReached = useCallback(
    (feature: 'broker_import' | 'ai_extract') => {
      if (ent.readOnly) {
        openTrialExpired();
        return true;
      }
      const row = ent.usage.find((u) => u.feature === feature);
      if (row && row.limit !== null && row.used >= row.limit) {
        emitPlanSignal({ code: 'QUOTA_EXCEEDED', feature, limit: row.limit, resetsAt: ent.periodResetsAt, message: 'You have reached your plan limit.', kind: 'mutation' });
        return true;
      }
      return false;
    },
    [ent.readOnly, ent.usage, ent.periodResetsAt],
  );

  const fail = (message: string) => importFlow.set({ phase: importFlow.get().rows.length > 0 ? 'review' : 'idle', progress: null, error: message });

  /** Parses one broker file and returns its response (or null after reporting why not). */
  const parseOne = useCallback(
    async (name: string, contentBase64: string, mapping?: ColumnMap, source?: ImportSourceId): Promise<ParseImportResponse | null> => {
      const flow = importFlow.get();
      const chosen = source ?? flow.source;
      // A generic CSV has no broker clock: its times are read in the app time zone, not the parser's IST default. A mapping only exists for a generic CSV.
      const zone = chosen === 'generic_csv' || mapping ? { utcOffsetMinutes: zoneOffsetMinutes(new Date()) } : {};
      const req = parse({ source: chosen, fileName: name, contentBase64, accountId: flow.accountId ?? undefined, ...(mapping ? { mapping } : {}), ...zone });
      abort.current = req;
      try {
        return await req.unwrap();
      } catch (e) {
        if (cancelled.current) return null;
        fail(importErrorMessage(e).message);
        return null;
      } finally {
        abort.current = null;
      }
    },
    [parse],
  );

  const showParsed = useCallback((name: string, res: ParseImportResponse, append: boolean, mapping: { values: ColumnMap; remembered: boolean } | null, contentBase64?: string) => {
    const flow = importFlow.get();
    const base = append ? flow.rows : [];
    const room = Math.max(0, MAX_REVIEW_ROWS - base.length);
    const kept = res.trades.slice(0, room);
    const added = dedupeAgainst(base, makeRows(kept, name, { startAt: base.length }));
    // Lines the parser dropped come back as rows that need a fix, so nothing disappears without a trace.
    let recovered: ReturnType<typeof recoverSkipped> = { rows: [], unread: [] };
    try {
      if (contentBase64) recovered = recoverSkipped(name, base64ToText(contentBase64), res, base.length + added.length);
    } catch {
      recovered = { rows: [], unread: [] };
    }
    const rows = [...base, ...added, ...dedupeAgainst([...base, ...added], recovered.rows)];
    importFlow.set({
      phase: 'review',
      progress: null,
      error: null,
      rows,
      rawFile: flow.rawFile,
      fileLabel: append && flow.fileLabel ? `${flow.fileLabel}, ${name}` : name,
      detected: res.detectedSource,
      warnings: [...(append ? flow.warnings : []), ...res.warnings],
      skipped: (append ? flow.skipped : 0) + res.skipped - recovered.rows.length,
      unreadLines: [...(append ? flow.unreadLines : []), ...recovered.unread],
      truncated: (append ? flow.truncated : 0) + (res.trades.length - kept.length),
      columns: null,
      mapping,
      filter: 'all',
      undoRows: null,
      result: null,
    });
  }, []);

  const readBrokerFile = useCallback(
    async (file: File, append: boolean) => {
      const flow = importFlow.get();
      importFlow.set({ phase: 'parsing', error: null, progress: { label: `Reading ${file.name}`, done: 0, total: 1 } });
      let contentBase64: string;
      try {
        contentBase64 = await fileToBase64(file);
      } catch (e) {
        fail(e instanceof ImportFileError ? e.message : 'Couldn’t read this file.');
        return;
      }
      importFlow.set({ rawFile: { name: file.name, contentBase64 } });
      let res = await parseOne(file.name, contentBase64);
      if (!res) return;
      // Auto-detect found no broker: a file with plain trade columns is read as a generic CSV (mapping step if needed).
      if (flow.source === 'auto' && res.detectedSource === 'unknown' && res.trades.length === 0 && !res.columns) {
        const generic = await parseOne(file.name, contentBase64, undefined, 'generic_csv');
        if (!generic) return;
        if (generic.trades.length > 0 || generic.columns) res = generic;
      }
      let mapping: { values: ColumnMap; remembered: boolean } | null = null;
      if (res.columns) {
        const saved = loadMapping(res.columns.headers);
        if (saved) {
          const again = await parseOne(file.name, contentBase64, saved);
          if (!again) return;
          res = again;
          mapping = { values: saved, remembered: true };
        }
      }
      if (res.columns && res.trades.length === 0) {
        importFlow.set({ phase: 'review', progress: null, columns: res.columns, rows: append ? flow.rows : [], fileLabel: file.name, detected: res.detectedSource, warnings: res.warnings, skipped: res.skipped });
        return;
      }
      showParsed(file.name, res, append, mapping, contentBase64);
    },
    [parseOne, showParsed],
  );

  const readScreenshots = useCallback(
    async (picked: File[], append: boolean) => {
      const flow = importFlow.get();
      const files = await Promise.all(picked.map((f) => fitScreenshot(f)));
      const tooBig = files.filter((f) => f.size > MAX_SCREENSHOT_BYTES);
      if (tooBig.length > 0) {
        fail(`${tooBig.map((f) => f.name).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} larger than 1 MB. Crop the screenshot or export a smaller image.`);
        return;
      }
      const have = append ? flow.screenshots.length : 0;
      if (have + files.length > MAX_SCREENSHOTS) {
        fail(`You can read up to ${MAX_SCREENSHOTS} screenshots in one import. Import this set first, then add the rest.`);
        return;
      }
      cancelled.current = false;
      const shots = [...(append ? flow.screenshots : []), ...(await Promise.all(files.map(async (f) => ({ name: f.name, url: await readAsDataUrl(f) }))))];
      const groups = batches(shots.slice(have), SCREENSHOTS_PER_REQUEST);
      const firstBatch = Math.floor(have / SCREENSHOTS_PER_REQUEST);
      importFlow.set({
        phase: 'parsing',
        error: null,
        screenshots: shots,
        rows: append ? flow.rows : [],
        fileLabel: `${plural(shots.length, 'screenshot')}`,
        detected: SCREENSHOT_SOURCE,
        warnings: append ? flow.warnings : [],
        skipped: 0,
        truncated: 0,
        columns: null,
        result: null,
        progress: { label: `Reading screenshot 1 of ${shots.length - have}`, done: 0, total: shots.length - have },
      });
      let done = 0;
      const problems: string[] = [];
      for (const [i, group] of groups.entries()) {
        if (cancelled.current) break;
        importFlow.set({ progress: { label: `Reading screenshot ${Math.min(done + 1, shots.length - have)} of ${shots.length - have}`, done, total: shots.length - have } });
        const req = extract({ images: group.map((g) => g.url), timeZone: appTimeZone() });
        abort.current = req;
        const batchIndex = firstBatch + i;
        const label = batchLabel(batchIndex, shots.length);
        try {
          const res = await req.unwrap();
          if (res.error && res.items.length === 0) problems.push(`${label}: ${res.error.message}`);
          else {
            const counts = new Map<string, number>();
            const trades: NormalizedTrade[] = res.items.map((it) => {
              const first = fromExtracted(it);
              const n = counts.get(first.externalId) ?? 0;
              counts.set(first.externalId, n + 1);
              return n === 0 ? first : fromExtracted(it, n);
            });
            const current = importFlow.get();
            const made = makeRows(trades, label, { batch: batchIndex, startAt: current.rows.length }).map((r, k) => {
              const dates = rowDatesOf(res.items[k], res.images, batchIndex);
              return dates ? { ...r, dates } : r;
            });
            const added = dedupeAgainst(current.rows, made);
            if (trades.length === 0) problems.push(`${label}: no trades found. Try a clearer screenshot of the trade history table.`);
            importFlow.set({ rows: [...current.rows, ...added] });
          }
        } catch (e) {
          if (cancelled.current) break;
          const info = importErrorMessage(e);
          if (info.upgrade) break;
          problems.push(`${label}: ${info.message}`);
        } finally {
          abort.current = null;
        }
        done += group.length;
      }
      const after = importFlow.get();
      if (after.rows.length === 0) {
        importFlow.set({ phase: 'idle', progress: null, screenshots: [], fileLabel: null, error: problems[0] ?? (cancelled.current ? null : 'No trades were read from these screenshots.') });
        return;
      }
      importFlow.set({ phase: 'review', progress: null, warnings: [...after.warnings, ...problems] });
    },
    [extract],
  );

  const addFiles = useCallback(
    async (input: File[], opts: { append?: boolean } = {}) => {
      const flow = importFlow.get();
      if (flow.phase === 'parsing' || flow.phase === 'saving') return;
      if (!flow.accountId) {
        importFlow.set({ error: 'Choose the account these trades belong to first.' });
        return;
      }
      const kinds = input.map((f) => ({ f, kind: classifyFile(f) }));
      const bad = kinds.filter((k) => k.kind === 'unsupported');
      if (bad.length > 0) {
        importFlow.set({ error: `${bad.map((b) => b.f.name).join(', ')} can’t be imported. Use a CSV, XLSX or HTML export, or PNG, JPG or WebP screenshots.` });
        return;
      }
      const shots = kinds.filter((k) => k.kind === 'screenshot').map((k) => k.f);
      const brokers = kinds.filter((k) => k.kind === 'broker').map((k) => k.f);
      if (shots.length > 0 && brokers.length > 0) {
        importFlow.set({ error: 'Add either broker files or screenshots in one import, not both.' });
        return;
      }
      const append = !!opts.append && flow.rows.length > 0;
      if (append && ((shots.length > 0 && flow.detected !== SCREENSHOT_SOURCE) || (brokers.length > 0 && flow.detected === SCREENSHOT_SOURCE))) {
        importFlow.set({ error: 'This import already has ' + (flow.detected === SCREENSHOT_SOURCE ? 'screenshots' : 'a broker file') + '. Import it first, then start another.' });
        return;
      }
      if (limitReached(shots.length > 0 ? 'ai_extract' : 'broker_import')) return;
      cancelled.current = false;
      if (shots.length > 0) {
        await readScreenshots(shots, append);
        return;
      }
      for (const [i, file] of brokers.entries()) {
        if (cancelled.current) break;
        await readBrokerFile(file, append || i > 0);
        if (importFlow.get().columns) break;
      }
    },
    [limitReached, readBrokerFile, readScreenshots],
  );

  /** Parses the kept file again with a column mapping, another account or another source. */
  const reparse = useCallback(
    async (mapping?: ColumnMap) => {
      const flow = importFlow.get();
      if (!flow.rawFile) return;
      const { name, contentBase64 } = flow.rawFile;
      importFlow.set({ phase: 'parsing', error: null, progress: { label: `Reading ${name}`, done: 0, total: 1 } });
      cancelled.current = false;
      let res = await parseOne(name, contentBase64, mapping);
      if (!res) return;
      // Same fallback as a first read: Auto-detect with no broker found tries the generic CSV layout.
      if (!mapping && importFlow.get().source === 'auto' && res.detectedSource === 'unknown' && res.trades.length === 0 && !res.columns) {
        const generic = await parseOne(name, contentBase64, undefined, 'generic_csv');
        if (!generic) return;
        if (generic.trades.length > 0 || generic.columns) res = generic;
      }
      if (mapping && flow.columns) saveMapping(flow.columns.headers, mapping);
      if (res.columns && res.trades.length === 0) {
        importFlow.set({ phase: 'review', progress: null, columns: res.columns, error: 'The file still can’t be read with this mapping. Check each column.' });
        return;
      }
      showParsed(name, res, false, mapping ? { values: mapping, remembered: false } : null, contentBase64);
    },
    [parseOne, showParsed],
  );

  const cancelParse = useCallback(() => {
    cancelled.current = true;
    abort.current?.abort();
    const flow = importFlow.get();
    importFlow.set({ phase: flow.rows.length > 0 ? 'review' : 'idle', progress: null });
  }, []);

  const apply = (next: (rows: ReviewRow[]) => ReviewRow[], remember = true) => {
    const flow = importFlow.get();
    importFlow.set({ rows: next(flow.rows), undoRows: remember ? flow.rows : flow.undoRows });
  };

  const edit = useCallback((key: string, field: EditableField, value: string | number) => {
    importFlow.set({ rows: editRow(importFlow.get().rows, key, field, value) });
  }, []);

  const toggle = useCallback((keys: string[], included: boolean) => apply((rows) => setIncluded(rows, new Set(keys), included)), []);
  const merge = useCallback((keys: string[]) => apply((rows) => mergeRows(rows, new Set(keys))), []);
  const move = useCallback((keys: string[], accountId: string | undefined) => apply((rows) => moveRows(rows, new Set(keys), accountId)), []);
  /** Re-reads screenshot `shot`'s date cells with the other day/month order; Undo restores the previous reading. */
  const switchDates = useCallback((shot: number) => apply((rows) => switchDateOrder(rows, shot)), []);
  const undoRows = useCallback(() => {
    const prev = importFlow.get().undoRows;
    if (prev) importFlow.set({ rows: prev, undoRows: null });
  }, []);

  const importable = (rows: ReviewRow[]) => rows.filter((r) => rowStatus(r) === 'ready');

  const saveRows = useCallback(
    async (opts: { retry?: boolean } = {}) => {
      const flow = importFlow.get();
      if (!flow.accountId || flow.phase === 'saving') return;
      if (ent.readOnly) return openTrialExpired();
      const failed = new Set(flow.result?.failedExternalIds ?? []);
      const targets = opts.retry ? flow.rows.filter((r) => failed.has(r.trade.externalId)) : importable(flow.rows);
      if (targets.length === 0) return;
      if (!opts.retry && flow.rows.some((r) => rowStatus(r) === 'fix')) return;
      const before = opts.retry ? flow.result : null;
      const groups = new Map<string, ReviewRow[]>();
      for (const r of targets) {
        const id = r.accountId ?? flow.accountId;
        groups.set(id, [...(groups.get(id) ?? []), r]);
      }
      const total = targets.length;
      importFlow.set({ phase: 'saving', error: null, progress: { label: 'Saving', done: 0, total } });
      const sum: SaveImportedResult = {
        created: before?.created ?? 0,
        skipped: before?.skipped ?? 0,
        errors: before?.errors ?? 0,
        failed: 0,
        batchId: before?.batchId ?? '',
        createdIds: [...(before?.createdIds ?? [])],
        failedExternalIds: [],
      };
      let batchId = before?.batchId;
      let offset = 0;
      let blocked = false;
      let message: string | null = null;
      for (const [accountId, group] of groups) {
        try {
          const res = await save({
            trades: group.map((r) => ({ ...r.trade, duplicate: false })),
            accountId,
            batchId,
            onProgress: ({ done, paused }) =>
              importFlow.set({ progress: { label: paused ? 'Saving paused — you’re offline' : `Saving ${formatCount(offset + done)} of ${formatCount(total)}`, done: offset + done, total } }),
          }).unwrap();
          batchId = res.batchId;
          sum.batchId = res.batchId;
          sum.created += res.created;
          sum.skipped += res.skipped;
          sum.errors += res.errors;
          sum.failed += res.failed;
          sum.createdIds.push(...res.createdIds);
          sum.failedExternalIds.push(...res.failedExternalIds);
        } catch (e) {
          const info = importErrorMessage(e);
          if (info.upgrade) blocked = true;
          else message = `Couldn’t save the trades. ${info.message}`;
          sum.failed += group.length;
          sum.failedExternalIds.push(...group.map((r) => r.trade.externalId));
        }
        offset += group.length;
        if (blocked) break;
      }
      sum.batchId = sum.batchId || batchId || '';
      const failedIds = new Set(sum.failedExternalIds);
      const targetKeys = new Set(targets.map((t) => t.key));
      const rows = flow.rows.map((r) => (targetKeys.has(r.key) && !failedIds.has(r.trade.externalId) ? { ...r, saved: true } : r));
      const nothingSaved = sum.createdIds.length === 0 && sum.skipped === (before?.skipped ?? 0) && sum.failed === total;
      importFlow.set({
        rows,
        result: nothingSaved && !before ? null : sum,
        phase: sum.failed === 0 ? 'done' : 'review',
        progress: null,
        undoRows: null,
        error: message,
      });
      if (sum.batchId && flow.fileLabel) rememberBatchFile(sum.batchId, flow.fileLabel);
      if (sum.failed === 0) trackImportCompleted({ source: flow.detected ?? 'unknown', tradeCount: sum.created });
    },
    [save, ent.readOnly],
  );

  const undoImport = useCallback(async () => {
    const flow = importFlow.get();
    const ids = flow.result?.createdIds ?? [];
    if (ids.length === 0) return false;
    importFlow.set({ phase: 'saving', progress: { label: 'Undoing the import', done: 0, total: ids.length }, error: null });
    try {
      for (const part of chunk(ids, 200)) await bulkDelete({ tradeIds: part }).unwrap();
      dispatch(importApi.util.invalidateTags(['ImportBatches']));
      importFlow.set({
        phase: 'review',
        progress: null,
        result: null,
        rows: flow.rows.map((r) => (r.saved ? { ...r, saved: false } : r)),
      });
      toast(`Import undone · ${plural(ids.length, 'trade')} deleted`);
      return true;
    } catch (e) {
      importFlow.set({ phase: 'done', progress: null, error: `Couldn’t undo the import. ${readApiError(e, 'Try again.').message}` });
      return false;
    }
  }, [bulkDelete, dispatch]);

  /** Opens Trades for an import: its account and the span of its trades are set as the scope; `importBatch` narrows to exactly that import. */
  const openBatch = useCallback(
    (b: { batchId: string; accountId: string | null; from: string; to: string }) => {
      const dates = [b.from, b.to].filter(Boolean).map((d) => new Date(d).getTime()).filter((n) => !Number.isNaN(n));
      if (b.accountId) dispatch(setAccountFilter(b.accountId));
      if (dates.length > 0) {
        dispatch(setDateRangeFilter({ startDate: formatLocalDateOnly(new Date(Math.min(...dates))), endDate: formatLocalDateOnly(new Date(Math.max(...dates))), datePreset: 'custom' }));
      }
      navigate(`/app/tradelog${b.batchId ? `?importBatch=${encodeURIComponent(b.batchId)}` : ''}`);
    },
    [dispatch, navigate],
  );

  const viewImported = useCallback(() => {
    const flow = importFlow.get();
    const dates = flow.rows.filter((r) => r.saved).flatMap((r) => [r.trade.openDate, r.trade.closeDate]).filter(Boolean).sort();
    openBatch({ batchId: flow.result?.batchId ?? '', accountId: flow.accountId, from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' });
  }, [openBatch]);

  const viewBatch = useCallback((b: ImportBatch) => openBatch(b), [openBatch]);

  // One object per set of callbacks, so effects that depend on it do not re-subscribe on every render.
  return useMemo(
    () => ({ addFiles, reparse, cancelParse, edit, toggle, merge, move, switchDates, undoRows, saveRows, undoImport, viewImported, viewBatch }),
    [addFiles, reparse, cancelParse, edit, toggle, merge, move, switchDates, undoRows, saveRows, undoImport, viewImported, viewBatch],
  );
}
