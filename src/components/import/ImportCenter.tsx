import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { AccountPicker } from '@/components/account/AccountPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGetImportSourcesQuery } from '@/store/api/importApi';
import { importFlow, useImportFlow } from '@/lib/importFlowStore';
import { appTimeZone } from '@/lib/appTimeZone';
import { PAGE_SIZE, sourceLabel } from '@/lib/import/labels';
import { canMerge, filterRows, firstProblemKey, parseTruncation, summarise } from '@/lib/import/rows';
import { SCREENSHOT_SOURCE, type ImportSourceId } from '@/types/import';
import { ColumnMapping } from './ColumnMapping';
import { DropZone } from './DropZone';
import { MobileReview } from './MobileReview';
import { PastImports } from './PastImports';
import { ResultRow } from './ResultRow';
import { ReviewGrid } from './ReviewGrid';
import { SourceGuide } from './SourceGuide';
import { SourcePreview } from './SourcePreview';
import { StatusChips } from './StatusChips';
import { useImportActions } from './useImportActions';
import { formatCount } from '@/lib/format';

const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

export function ImportCenter() {
  const flow = useImportFlow();
  const actions = useImportActions();
  const isMobile = useIsMobile();
  const ent = useEntitlements();
  const { accounts, selectedAccountId } = useAccounts();
  const { data: sources = [] } = useGetImportSourcesQuery();
  const [urlParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const [focusRow, setFocusRow] = useState<string | null>(null);
  const [jump, setJump] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [draftAccount, setDraftAccount] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<ImportSourceId | 'auto'>('auto');
  const [showWarnings, setShowWarnings] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const addInput = useRef<HTMLInputElement>(null);

  const writable = useMemo(() => {
    const ids = ent.writableAccountIds;
    return accounts.filter((a) => a.status === 'active' && (!ids || ids.includes(a.id)));
  }, [accounts, ent.writableAccountIds]);
  // Active accounts the plan made read-only stay listed, with the reason, so a missing account is explained.
  const accountOptions = useMemo(
    () => [...writable, ...accounts.filter((a) => a.status === 'active' && !writable.includes(a)).map((a) => ({ ...a, disabledReason: 'Read-only on Free' }))],
    [accounts, writable],
  );
  // The plan can arrive after the accounts: a default taken while every account still looked writable is dropped
  // once it turns out read-only. A review in progress keeps its account, because its duplicates were checked there.
  const kept = flow.accountId && (flow.rows.length > 0 || writable.some((a) => a.id === flow.accountId)) ? flow.accountId : null;
  const accountId = kept ?? (selectedAccountId && writable.some((a) => a.id === selectedAccountId) ? selectedAccountId : writable[0]?.id) ?? null;
  const account = accounts.find((a) => a.id === accountId);
  const accountName = (id?: string | null) => accounts.find((a) => a.id === id)?.name ?? 'the selected account';

  useEffect(() => {
    if (flow.accountId !== accountId && accountId) importFlow.set({ accountId, ...(flow.error?.startsWith('Choose the account') ? { error: null } : {}) });
  }, [flow.accountId, flow.error, accountId]);

  useEffect(() => {
    const wanted = urlParams.get('source');
    if (wanted && flow.phase === 'idle' && sources.some((s) => s.id === wanted)) importFlow.set({ source: wanted as ImportSourceId });
    // preselect once from ?source=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.length]);

  // Files dropped on another page (F-127) are read once the account is known.
  useEffect(() => {
    if (flow.queued.length === 0 || !accountId || flow.accountId !== accountId || flow.phase === 'parsing' || flow.phase === 'saving') return;
    const files = flow.queued;
    importFlow.set({ queued: [] });
    void actions.addFiles(files, { append: flow.rows.length > 0 });
  }, [flow.queued, flow.accountId, flow.phase, flow.rows.length, accountId, actions]);

  const busy = flow.phase === 'parsing' || flow.phase === 'saving';
  const hasRows = flow.rows.length > 0;
  const showReview = (hasRows || flow.columns || flow.phase === 'review' || flow.phase === 'done') && flow.phase !== 'idle';

  // Paste screenshots anywhere on the page (D: paste is a first-class path).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0 || busy) return;
      e.preventDefault();
      void actions.addFiles(files, { append: hasRows });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [actions, busy, hasRows]);

  // `/` searches the review.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && t && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable && search.current) {
        e.preventDefault();
        search.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (flow.result) setLastAction(null);
  }, [flow.result]);

  const summary = useMemo(() => summarise(flow.rows), [flow.rows]);
  const serverCut = useMemo(() => flow.warnings.map(parseTruncation).find(Boolean) ?? null, [flow.warnings]);
  const otherWarnings = useMemo(() => flow.warnings.filter((w) => !parseTruncation(w)), [flow.warnings]);
  const visible = useMemo(() => filterRows(flow.rows, flow.filter, flow.query), [flow.rows, flow.filter, flow.query]);
  useEffect(() => setPage(1), [flow.filter, flow.query]);

  const detectedName = useMemo(() => {
    if (flow.detected === SCREENSHOT_SOURCE) return 'AI screenshot reading';
    const s = sources.find((x) => x.id === flow.detected);
    return s ? sourceLabel(s, sources) : null;
  }, [flow.detected, sources]);

  const picked = flow.rows.filter((r) => selection.has(r.key));
  const mergeable = canMerge(picked.filter((r) => !r.saved));
  const previewBatch = flow.detected === SCREENSHOT_SOURCE ? (flow.rows.find((r) => r.key === focusRow)?.batch ?? flow.rows[0]?.batch ?? 0) : null;
  const anyMoved = flow.rows.some((r) => r.accountId && r.accountId !== accountId);
  const readOnly = flow.phase === 'saving' || flow.phase === 'done';

  const onSelect = (key: string, e: { shiftKey: boolean }) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastPicked) {
        const a = visible.findIndex((r) => r.key === lastPicked);
        const b = visible.findIndex((r) => r.key === key);
        if (a >= 0 && b >= 0) visible.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((r) => next.add(r.key));
      } else if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setLastPicked(key);
  };

  const act = (label: string, fn: () => void) => {
    fn();
    setLastAction(label);
    setSelection(new Set());
  };

  const blockedReason =
    summary.fix > 0 ? `Fix or exclude ${plural(summary.fix, 'row')}` : summary.ready === 0 ? (summary.saved > 0 ? null : 'Tick at least one row') : null;
  const importLabel = `Import ${plural(summary.ready, 'trade')}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && flow.phase === 'review' && !blockedReason && summary.ready > 0) {
      e.preventDefault();
      void actions.saveRows();
    }
  };

  const startAgain = () => {
    importFlow.reset();
    setSelection(new Set());
    setPage(1);
    setLastAction(null);
  };

  // ───────────── before a file
  const setup = (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,16rem)] sm:items-end">
      <div className="space-y-1.5">
        <label id="imp-account" className="text-xs font-medium text-foreground-soft">
          Account <span aria-hidden="true" className="text-loss">*</span>
        </label>
        <AccountPicker
          label="Account"
          labelledBy="imp-account"
          accounts={accountOptions}
          value={accountId}
          onChange={(v) => importFlow.set({ accountId: v })}
          disabled={busy || hasRows}
          placeholder={writable.length === 0 ? 'No account yet' : 'Choose an account'}
        />
      </div>
      <div className="space-y-1.5">
        <label id="imp-source" className="text-xs font-medium text-foreground-soft">Source</label>
        <Select value={flow.source} onValueChange={(v) => importFlow.set({ source: v as ImportSourceId | 'auto' })} disabled={busy || hasRows}>
          <SelectTrigger aria-labelledby="imp-source" className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            {sources.map((s) => <SelectItem key={s.id} value={s.id}>{sourceLabel(s, sources)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (!showReview) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" onKeyDown={onKeyDown}>
        {writable.length === 0 && accounts.length > 0 ? (
          <p role="status" className="text-sm text-muted-foreground">Every account is read-only on your plan. Choose accounts to keep on the Accounts page, then import.</p>
        ) : null}
        {setup}
        {flow.phase === 'parsing' ? (
          <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-5">
            <div>
              <p className="text-sm font-medium">{flow.progress?.label ?? 'Reading the file'}…</p>
              <p className="mt-0.5 text-xs text-muted-foreground">This can take up to a minute for screenshots.</p>
            </div>
            <Button type="button" variant="outline" onClick={actions.cancelParse}>Cancel</Button>
          </div>
        ) : (
          <DropZone disabled={!accountId} onFiles={(f) => void actions.addFiles(f)} />
        )}
        {flow.error && (
          <p role="alert" className="text-sm text-loss">
            {flow.error}{' '}
            {flow.rawFile && <button type="button" className="underline" onClick={() => void actions.reparse()}>Retry</button>}
          </p>
        )}
        {!accountId && writable.length > 0 && <p className="text-xs text-muted-foreground">Choose the account first: duplicates are checked per account.</p>}
        <SourceGuide sources={sources} value={flow.source} onChange={(id) => importFlow.set({ source: id })} />
        <p className="text-xs text-muted-foreground">Automatic broker sync is planned for Pro. It is not available yet.</p>
        {accounts.length > 0 && <PastImports accounts={accounts} sources={sources} onView={actions.viewBatch} />}
      </div>
    );
  }

  // ───────────── review / saving / done
  const reviewBody = flow.columns ? (
    <ColumnMapping
      headers={flow.columns.headers}
      suggested={flow.columns.suggested}
      busy={flow.phase === 'parsing'}
      onApply={(m) => void actions.reparse(m)}
      onCancel={startAgain}
    />
  ) : (
    <>
      {hasRows && (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusChips value={flow.filter} onChange={(v) => importFlow.set({ filter: v })} summary={summary} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input ref={search} aria-label="Search symbol (press / to focus)" placeholder="Search symbol" value={flow.query} onChange={(e) => importFlow.set({ query: e.target.value })} className="h-8 w-48 pl-7 text-13" />
        </div>
      </div>
      )}

      {(selection.size > 0 || lastAction) && (
        <div role="status" className="flex flex-wrap items-center gap-2 text-13">
          {selection.size > 0 ? (
            <>
              <span className="text-foreground-soft">{plural(selection.size, 'row')} selected</span>
              <Button type="button" size="sm" variant="outline" onClick={() => act(`Excluded ${plural(selection.size, 'row')}`, () => actions.toggle([...selection], false))} disabled={readOnly}>Exclude</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => act(`Included ${plural(selection.size, 'row')}`, () => actions.toggle([...selection], true))} disabled={readOnly}>Include</Button>
              <Button type="button" size="sm" variant="outline" disabled={readOnly || !mergeable} title={mergeable ? undefined : 'Merge needs two or more rows with the same symbol and direction'} onClick={() => act(`Merged ${plural(selection.size, 'row')} into one`, () => actions.merge([...selection]))}>Merge</Button>
              <AccountPicker
                size="sm"
                className="w-40"
                label="Move selected rows to account"
                placeholder="Move to account…"
                accounts={accountOptions}
                value={null}
                onChange={(id) => act(`Moved ${plural(selection.size, 'row')} to ${accountName(id)}`, () => actions.move([...selection], id === accountId ? undefined : id))}
                disabled={readOnly}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelection(new Set())}>Clear</Button>
            </>
          ) : (
            <>
              <span className="text-foreground-soft">{lastAction}</span>
              {flow.undoRows && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { actions.undoRows(); setLastAction(null); }}>Undo</Button>
              )}
            </>
          )}
        </div>
      )}

      {hasRows ? (
        <div className={flow.detected === SCREENSHOT_SOURCE && !isMobile ? 'grid gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]' : undefined}>
          {isMobile ? (
            <MobileReview
              rows={visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
              currency={account?.currency}
              readOnly={readOnly}
              onInclude={(k, inc) => actions.toggle([k], inc)}
              onEdit={actions.edit}
            />
          ) : (
            <ReviewGrid
              rows={visible}
              total={visible.length}
              page={page}
              onPage={setPage}
              currency={account?.currency}
              selection={selection}
              onSelect={onSelect}
              onToggleSelectAll={(c) => actions.toggle(visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.key), c)}
              onInclude={(k, inc) => actions.toggle([k], inc)}
              onEdit={actions.edit}
              onFocusRow={(r) => setFocusRow(r.key)}
              showSource={flow.detected === SCREENSHOT_SOURCE || anyMoved}
              readOnly={readOnly}
              focusKey={jump}
            />
          )}
          {flow.detected === SCREENSHOT_SOURCE && !isMobile && <SourcePreview screenshots={flow.screenshots} batch={previewBatch} />}
        </div>
      ) : (
        <div role="alert" className="max-w-2xl space-y-2 py-4">
          <h2 className="text-sm font-semibold">
            {flow.source !== 'auto' && flow.rawFile ? `This file could not be read as ${sources.find((x) => x.id === flow.source) ? sourceLabel(sources.find((x) => x.id === flow.source)!, sources) : 'the chosen source'}` : 'No trades were found in this file'}
          </h2>
          <p className="text-13 text-foreground-soft">{flow.warnings[0] ?? 'The file has no trade rows the importer can read.'}</p>
          <div className="flex flex-wrap items-center gap-2">
            {flow.rawFile && flow.source !== 'auto' && (
              <Button type="button" size="sm" onClick={() => { importFlow.set({ source: 'auto' }); void actions.reparse(); }}>Detect automatically</Button>
            )}
            {flow.rawFile && flow.source !== 'generic_csv' && (
              <Button type="button" size="sm" variant="outline" onClick={() => { importFlow.set({ source: 'generic_csv' }); void actions.reparse(); }}>Map columns</Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={startAgain}>Choose another file</Button>
          </div>
        </div>
      )}
      {isMobile && visible.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="font-mono tabular-nums">{page} / {Math.ceil(visible.length / PAGE_SIZE)}</span>
          <Button type="button" size="sm" variant="outline" disabled={page * PAGE_SIZE >= visible.length} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-3" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 text-sm">
          <span className="font-medium">{flow.fileLabel}</span>
          {detectedName && <span className="text-muted-foreground"> · {detectedName}</span>}
          <span className="text-muted-foreground"> → </span>
          <span>{account?.name ?? 'No account'}{account ? ` (${account.currency})` : ''}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy || flow.phase === 'done' || !!flow.columns} onClick={() => addInput.current?.click()}>Add files</Button>
          <Button type="button" variant="outline" size="sm" disabled={busy || flow.phase === 'done'} aria-expanded={changing} onClick={() => { setChanging((c) => !c); setDraftAccount(accountId); setDraftSource(flow.source); }}>Change</Button>
          <Button type="button" variant="ghost" size="sm" disabled={flow.phase === 'saving'} onClick={() => (flow.phase === 'done' ? startAgain() : setConfirmDiscard(true))}>{flow.phase === 'done' ? 'Close' : 'Discard'}</Button>
          <input
            ref={addInput}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="Add files to this import"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length > 0) void actions.addFiles(files, { append: true });
            }}
          />
        </div>
      </div>

      {changing && (
        <div className="grid gap-3 border-y border-border py-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,14rem)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label id="chg-account" className="text-xs font-medium text-foreground-soft">Account</label>
            <AccountPicker label="Account" labelledBy="chg-account" accounts={accountOptions} value={draftAccount} onChange={setDraftAccount} />
          </div>
          {flow.detected !== SCREENSHOT_SOURCE && (
            <div className="space-y-1.5">
              <label id="chg-source" className="text-xs font-medium text-foreground-soft">Source</label>
              <Select value={draftSource} onValueChange={(v) => setDraftSource(v as ImportSourceId | 'auto')}>
                <SelectTrigger aria-labelledby="chg-source" className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{sourceLabel(s, sources)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                importFlow.set({ accountId: draftAccount, source: draftSource });
                setChanging(false);
                if (flow.detected !== SCREENSHOT_SOURCE && flow.rawFile) void actions.reparse(flow.mapping?.values);
              }}
            >
              {flow.detected === SCREENSHOT_SOURCE ? 'Apply' : 'Re-check'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setChanging(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {flow.phase === 'parsing' && (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <p className="text-sm">{flow.progress?.label}…</p>
          <Button type="button" size="sm" variant="outline" onClick={actions.cancelParse}>Cancel</Button>
        </div>
      )}

      {flow.error && <p role="alert" className="text-sm text-loss">{flow.error}</p>}

      {!flow.columns && (
        <div className="space-y-1">
          <p className="text-13 text-foreground-soft" aria-live="polite">
            {plural(summary.all, 'row')} parsed
            {flow.skipped > 0 && <> · {plural(flow.skipped, 'row')} skipped by the parser (open positions or unreadable lines)</>}
            {flow.unreadLines.length > 0 && (
              <>
                {' · '}
                <button type="button" className="inline-flex items-center gap-0.5 underline underline-offset-2" aria-expanded={showSkipped} onClick={() => setShowSkipped((v) => !v)}>
                  {plural(flow.unreadLines.length, 'line')} not read <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </>
            )}
            {otherWarnings.length > 0 && (
              <>
                {' · '}
                <button type="button" className="inline-flex items-center gap-0.5 underline underline-offset-2" aria-expanded={showWarnings} onClick={() => setShowWarnings((v) => !v)}>
                  {plural(otherWarnings.length, 'warning')} <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </button>
              </>
            )}
            {flow.mapping?.remembered && <> · Using your saved column mapping</>}
            {flow.detected === 'generic_csv' && <> · Times read in {appTimeZone()}</>}
          </p>
          {showSkipped && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {flow.unreadLines.map((l) => (
                <li key={l.line}>
                  Line {l.line}: <span className="font-mono">{l.raw}</span> — {l.reason}
                </li>
              ))}
            </ul>
          )}
          {showWarnings && <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">{otherWarnings.map((w, i) => <li key={`${i}-${w}`}>{w}</li>)}</ul>}
          {(flow.truncated > 0 || serverCut) && (
            <p role="status" className="text-xs text-warning">
              This file has {formatCount(serverCut?.total ?? summary.all + flow.truncated)} trades. The first {formatCount(serverCut?.shown ?? summary.all)} are shown. Split the file by date to import the rest.
            </p>
          )}
        </div>
      )}

      {reviewBody}

      {!flow.columns && hasRows && (
        flow.result ? (
          <ResultRow
            result={flow.result}
            accountName={account?.name ?? 'your account'}
            busy={flow.phase === 'saving'}
            error={null}
            onView={actions.viewImported}
            onAnother={startAgain}
            onUndo={() => void actions.undoImport()}
            onRetry={() => void actions.saveRows({ retry: true })}
          />
        ) : (
          <div className="sticky bottom-14 z-bar -mx-3 md:bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-3 py-3 md:-mx-6 md:px-6">
            <p className="text-sm" role="status" aria-live="polite">
              {flow.phase === 'saving' ? (
                flow.progress?.label
              ) : (
                <>
                  <span className="font-medium">{formatCount(summary.ready)}</span> of {formatCount(summary.all)} will be imported · Net <Money value={summary.net} currency={account?.currency} />
                  {summary.fix > 0 && <> · <button type="button" className="text-loss underline underline-offset-2" onClick={() => { importFlow.set({ filter: 'fix' }); setJump(firstProblemKey(flow.rows)); }}>{formatCount(summary.fix)} need a fix</button></>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              {blockedReason && flow.phase === 'review' && <span className="text-xs text-muted-foreground">{blockedReason}</span>}
              <Button type="button" onClick={() => void actions.saveRows()} disabled={flow.phase !== 'review' || !!blockedReason || summary.ready === 0 || !accountId} aria-describedby={blockedReason ? undefined : undefined}>
                {flow.phase === 'saving' ? 'Importing…' : importLabel}
              </Button>
            </div>
          </div>
        )
      )}
      {flow.result && flow.error && <p role="alert" className="text-xs text-loss">{flow.error}</p>}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this import?</AlertDialogTitle>
            <AlertDialogDescription>{plural(summary.all, 'reviewed trade')} will be removed. Nothing has been saved to your journal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Keep reviewing</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => { setConfirmDiscard(false); startAgain(); }}>Discard import</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
