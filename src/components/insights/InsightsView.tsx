import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AccountPicker } from '@/components/account/AccountPicker';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AiNote } from '@/components/shell/AiNote';
import { ScopeBarSlot, usePageChrome } from '@/components/shell/chrome';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useAppSelector } from '@/store/hooks';
import { useGenerateInsightMutation, useGetInsightSettingsQuery, useLazyListInsightsQuery, useListInsightsQuery } from '@/store/api/insightsApi';
import { useGetStatsQuery } from '@/store/api/statsApi';
import { plural } from '@/lib/evidence';
import { clampedLabel, isMixedCurrency, periodLabel, reportAsText, reportRange, tradesInMessage } from '@/lib/ai/insightFormat';
import { formatDateShort } from '@/lib/format';
import { readApiError } from '@/lib/apiError';
import { emitPlanSignal } from '@/lib/planErrors';
import { openTrialExpired } from '@/components/billing/readOnly';
import { trackAiInsightGenerated } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { Insight } from '@/types/insights';
import { NotesSwitch } from './NotesSwitch';
import { ReportBody } from './ReportBody';

const REPORT_PAGE = 50;
/** Closed trades a report needs (the server's NOT_ENOUGH_TRADES rule, JournalAWSSetup insights/metrics.ts MIN_TRADES). */
const MIN_REPORT_TRADES = 5;

type Problem = { kind: 'min'; message: string } | { kind: 'failed'; message: string } | { kind: 'api'; message: string } | { kind: 'mixed'; message: string };

export function InsightsView() {
  usePageChrome({
    tabs: [
      { id: 'reports', label: 'Reports', to: '/app/insights', active: true },
      { id: 'chat', label: 'Chat', to: '/app/chat', active: false },
    ],
  });
  const ent = useEntitlements();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts();
  const filters = useAppSelector((s) => s.trades.filters);
  const trade = useTradeParam();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useListInsightsQuery({ limit: REPORT_PAGE });
  const [loadPage, { isFetching: loadingMore }] = useLazyListInsightsQuery();
  const [older, setOlder] = useState<Insight[]>([]);
  // undefined: no older page loaded yet, so the cursor is the first page's.
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const [generate, { isLoading: generating }] = useGenerateInsightMutation();
  const { data: settings } = useGetInsightSettingsQuery();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [announce, setAnnounce] = useState('');
  const pending = useRef<{ abort: () => void } | null>(null);

  const insights = useMemo(() => {
    const first = data?.insights ?? [];
    const have = new Set(first.map((i) => i.id));
    return [...first, ...older.filter((i) => !have.has(i.id))];
  }, [data, older]);
  const nextCursor = olderCursor === undefined ? data?.nextCursor ?? null : olderCursor;
  const selectedId = params.get('id');
  // A report opened by its link shows its own account in the scope bar (once; browsing the list leaves the scope alone).
  const linkedReport = useRef(selectedId);
  useEffect(() => {
    const id = linkedReport.current;
    const r = id ? insights.find((i) => i.id === id) : undefined;
    // The account list can arrive after the reports: wait for it, or the one alignment is spent on nothing.
    if (!r || accounts.length === 0) return;
    linkedReport.current = null;
    if (r.accountId && r.accountId !== selectedAccountId && accounts.some((a) => a.id === r.accountId)) setSelectedAccountId(r.accountId);
  }, [insights, selectedAccountId, accounts, setSelectedAccountId]);
  const current = insights.find((i) => i.id === selectedId) ?? (isMobile ? null : insights[0] ?? null);
  const row = ent.usage.find((u) => u.feature === 'ai_insight');
  const remaining = row && row.limit !== null ? Math.max(0, row.limit - row.used) : null;
  const accountName = (id: string | null, currency?: string | null) =>
    id ? accounts.find((a) => a.id === id)?.name ?? 'Account' : currency && isMixedCurrency(accounts, null) ? `All ${currency} accounts` : 'All accounts';
  // Reports made before the weekly review carry no currency: an all-accounts one may add currencies together.
  const insightCurrency = (i: Insight) => i.currency ?? i.review?.currency ?? accounts.find((a) => a.id === i.accountId)?.currency;
  // "All time" has no real start and the API takes at most 366 days: longer scopes send their last 366 days, and the button says so.
  const range = useMemo(
    () => reportRange(filters.datePreset, filters.startDate, filters.endDate),
    [filters.datePreset, filters.startDate, filters.endDate],
  );
  const scopeLabel = range.clamped ? clampedLabel(range.to) : periodLabel(range.from, range.to);
  // A report adds its figures up, so it is made for one currency: choose an account first.
  const mixed = isMixedCurrency(accounts, selectedAccountId);
  // Trades in the report's range (all trades, open ones too): under the minimum the request cannot succeed.
  const { data: scopeStats } = useGetStatsQuery({ accountId: selectedAccountId ?? 'ALL', startDate: range.from, endDate: range.to });
  const scopeTrades = scopeStats?.totalTrades;
  const tooFew = typeof scopeTrades === 'number' && scopeTrades < MIN_REPORT_TRADES;
  const tooFewText = tooFew ? `A report needs at least ${MIN_REPORT_TRADES} closed trades; this scope has ${plural(scopeTrades!, 'trade')}.` : null;

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const page = await loadPage({ limit: REPORT_PAGE, cursor: nextCursor }).unwrap();
      setOlder((o) => [...o, ...page.insights]);
      setOlderCursor(page.nextCursor);
    } catch (e) {
      toast('Couldn’t load more reports.', { description: readApiError(e, 'Try again.').message });
    }
  };

  const run = async () => {
    setProblem(null);
    if (ent.readOnly) return openTrialExpired();
    if (mixed) return;
    if (row && row.limit !== null && row.used >= row.limit) {
      emitPlanSignal({ code: 'QUOTA_EXCEEDED', feature: 'ai_insight', limit: row.limit, resetsAt: ent.periodResetsAt, message: 'You have reached your plan limit.', kind: 'mutation' });
      return;
    }
    const req = generate({ accountId: selectedAccountId ?? undefined, from: range.from, to: range.to });
    pending.current = req;
    try {
      const created = await req.unwrap();
      setParams({ id: created.id }, { replace: true });
      setAnnounce('Report ready');
      trackAiInsightGenerated({ period: scopeLabel });
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      // A rejected request (400/422) says why and has nothing to retry; every other failure keeps Retry.
      const info = readApiError(e, 'Couldn’t generate the report.');
      if (info.status === 402) return;
      if (info.code === 'MIXED_CURRENCY') setProblem({ kind: 'mixed', message: `${info.message.replace(/[.!?]*$/, '.')} Nothing was charged.` });
      else if (info.code === 'NOT_ENOUGH_TRADES' || (info.status === 422 && tradesInMessage(info.message) !== null)) {
        const n = tradesInMessage(info.message);
        setProblem({ kind: 'min', message: `A report needs at least 5 closed trades in the period${n !== null ? ` — this scope has ${n}` : ''}.` });
      } else if (info.status === 400 || info.status === 422) setProblem({ kind: 'api', message: info.message });
      else setProblem({ kind: 'failed', message: info.message });
    } finally {
      pending.current = null;
    }
  };

  const cancel = () => pending.current?.abort();
  const generateLabel = remaining === 1 ? 'Generate report — uses your last report this month' : `Generate report for ${scopeLabel}`;
  const meter = row ? (row.limit === null ? `${row.used} reports this month` : `${row.used} of ${row.limit} reports this month`) : null;

  const controls = (
    <>
      {meter && <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{meter}</span>}
      <Button type="button" size="sm" variant="outline" onClick={run} disabled={generating || mixed || tooFew} title={tooFewText ?? undefined} className="whitespace-nowrap">
        {generating ? 'Generating…' : generateLabel}
      </Button>
    </>
  );

  const openTrades = (ids: string[]) => ids[0] && trade.openTrade(ids[0], { ids });
  const makeRule = (text: string) => navigate(`/app/goals?addRule=${encodeURIComponent(text)}`);
  const copy = async (insight: Insight) => {
    try {
      await navigator.clipboard.writeText(reportAsText(insight, `${periodLabel(insight.period.from, insight.period.to)} · ${accountName(insight.accountId, insight.currency)}`));
      toast('Summary copied');
    } catch {
      toast('Couldn’t copy. Select the text and copy it instead.');
    }
  };

  const pickAccount = (text: string) => (
    <div role="note" className="mb-4 space-y-2 border-l-2 border-warning pl-3">
      <p id="report-account" className="text-13 text-foreground-soft">{text}</p>
      <AccountPicker
        label="Account"
        labelledBy="report-account"
        accounts={accounts.filter((a) => a.status !== 'inactive')}
        value={null}
        onChange={(id) => {
          setProblem(null);
          setSelectedAccountId(id);
        }}
        className="max-w-xs"
      />
    </div>
  );
  const accountChoice = mixed && problem?.kind !== 'mixed' ? pickAccount('Reports are per currency — choose an account') : null;

  const list = (
    <nav aria-label="Reports" className="min-w-0">
      <h2 className="px-3 py-2 text-xs font-medium text-muted-foreground">Reports</h2>
      {isLoading ? (
        <div className="space-y-1 p-3"><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" /></div>
      ) : isError ? null : insights.length === 0 ? (
        <p className="px-3 pb-3 text-13 text-muted-foreground">No reports yet.</p>
      ) : (
        <ul>
          {insights.map((i) => {
            const on = current?.id === i.id;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setParams({ id: i.id }, { replace: true })}
                  aria-current={on ? 'true' : undefined}
                  className={cn('flex min-h-11 w-full flex-col items-start gap-0.5 border-l-2 px-3 py-1.5 text-left hover:bg-muted', on ? 'border-primary bg-muted' : 'border-transparent')}
                >
                  <span className="flex w-full items-baseline justify-between gap-2 text-13 font-medium">
                    <span className="truncate">{periodLabel(i.period.from, i.period.to)}</span>
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">{formatDateShort(i.createdAt)}</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{accountName(i.accountId, i.currency)} · {i.tradeCount} trades</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {nextCursor && (
        <div className="px-3 py-2">
          <Button type="button" size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</Button>
        </div>
      )}
    </nav>
  );

  const detail = isError ? (
    <ErrorState title="Couldn’t load your reports." error={error} onRetry={refetch} />
  ) : generating ? (
    <div className="space-y-4" aria-busy="true" role="status" aria-label="Generating report">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">Analysing {scopeLabel}…</p>
        <Button type="button" size="sm" variant="outline" onClick={cancel}>Cancel</Button>
      </div>
      <Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
    </div>
  ) : problem?.kind === 'mixed' ? (
    <div role="alert">{pickAccount(problem.message)}</div>
  ) : problem ? (
    <div role="alert" className="space-y-2">
      <p className="text-sm text-loss">{problem.message}</p>
      {problem.kind === 'failed' ? <Button type="button" size="sm" variant="outline" onClick={run}>Retry</Button> : <p className="text-xs text-muted-foreground">Change the account or period in the bar above.</p>}
    </div>
  ) : current ? (
    <ReportBody
      insight={current}
      title={`${periodLabel(current.period.from, current.period.to)} · ${accountName(current.accountId, current.currency)}`}
      currency={insightCurrency(current) ?? undefined}
      mixedCurrency={!current.currency && !current.review && isMixedCurrency(accounts, current.accountId)}
      useNotes={settings?.useNotes ?? false}
      onOpenTrades={openTrades}
      onMakeRule={makeRule}
      onCopy={() => void copy(current)}
      chat={<Button asChild size="sm" variant="outline"><Link to={`/app/chat?insight=${encodeURIComponent(current.id)}`}>Discuss in chat</Link></Button>}
    />
  ) : (
    <div className="max-w-prose space-y-2 py-6">
      <h2 className="text-sm font-semibold">Generate your first report</h2>
      <p className="text-13 text-muted-foreground">
        A report reads the closed trades in the account and period shown above and lists what made money, what lost it and the pattern behind each, with the trades to check. It needs at least 5 closed trades in the period.
      </p>
      <Button type="button" variant="outline" onClick={run} disabled={generating || mixed || tooFew}>{generateLabel}</Button>
      {tooFewText && <p className="text-13 text-muted-foreground">{tooFewText}</p>}
    </div>
  );

  return (
    <div>
      {/* A phone has no room for these in the bar; its report list carries the same button and meter. */}
      {!isMobile && <ScopeBarSlot side="right">{controls}</ScopeBarSlot>}
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
      {isMobile ? (
        <div className="space-y-3">
          {current || generating || problem ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setProblem(null); setParams({}, { replace: true }); }} className="-ml-2">
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Reports
              </Button>
              {detail}
            </>
          ) : (
            <>
              {accountChoice}
              <Button type="button" variant="outline" onClick={run} disabled={generating || mixed || tooFew} className="w-full">{generateLabel}</Button>
              {tooFewText && <p className="text-13 text-muted-foreground">{tooFewText}</p>}
              {meter && <p className="font-mono text-xs tabular-nums text-muted-foreground">{meter}</p>}
              {isError && <ErrorState title="Couldn’t load your reports." error={error} onRetry={refetch} />}
              {list}
              <NotesSwitch className="border-t border-border px-3 pt-3" />
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
          <div className="border-r border-border lg:pr-0">
            {list}
            <NotesSwitch className="mt-2 border-t border-border px-3 py-3" />
          </div>
          <div className="min-w-0 px-0 pt-3 lg:px-6 lg:pt-0">{accountChoice}{detail}</div>
        </div>
      )}
      <div className="mt-6 max-w-prose lg:ml-[17.5rem] lg:pl-6"><AiNote /></div>
    </div>
  );
}
