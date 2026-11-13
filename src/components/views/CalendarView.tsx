import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, addMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { METRIC_LABEL, zoneName } from '@/components/calendar/cellText';
import { DayPanel, WeekPanel, sortByTime } from '@/components/calendar/DayPanel';
import { PeriodSummary } from '@/components/calendar/PeriodSummary';
import { SidePaneLayout } from '@/components/calendar/SidePane';
import { WeekTimeline } from '@/components/calendar/WeekTimeline';
import { YearView, type YearMonth } from '@/components/calendar/YearView';
import { ScopeSlot } from '@/components/calendar/ScopeSlot';
import { usePeriodKeys } from '@/components/calendar/usePeriodKeys';
import { usePageChrome } from '@/components/shell/chrome';
import { useAccounts } from '@/hooks/useAccounts';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { useTradeParam } from '@/hooks/useTradeParam';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { isNotesUnavailable, useGetDayNotesQuery } from '@/store/api/journalApi';
import { buildMonth, summarizeDays, defaultMetric, gridRange, isoWeek, monthKey, parseMetric, parseMonth, tradeDayKey, type CalendarMetric } from '@/lib/calendar';
import { appToday, appTodayKey } from '@/lib/appTimeZone';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { formatMoney, parseLocalDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type View = 'month' | 'week' | 'year';
const METRICS: CalendarMetric[] = ['pnl', 'r', 'trades', 'win'];

export function CalendarView() {
  const [params, setParams] = useSearchParams();
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const trade = useTradeParam();
  const isMobile = useIsMobile();
  const { accounts } = useAccounts();
  const accountId = useAppSelector((s) => s.trades.filters.accountId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const view: View = params.get('view') === 'week' ? 'week' : params.get('view') === 'year' ? 'year' : 'month';
  const dayKey = params.get('day');
  const weekPaneKey = params.get('wk');
  const todayKey = appTodayKey();
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const setQuery = (patch: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(paramsRef.current);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace });
  };

  usePageChrome({
    ownPeriod: true,
    tabs: (['month', 'week', 'year'] as const).map((v) => ({
      id: v,
      label: v[0].toUpperCase() + v.slice(1),
      active: view === v,
      onSelect: () => {
        const next = new URLSearchParams(paramsRef.current);
        if (v === 'month') next.delete('view');
        else next.set('view', v);
        next.delete('day');
        next.delete('wk');
        setParams(next);
      },
    })),
  });

  const month = parseMonth(params.get('month'));
  const range = useMemo(() => gridRange(month), [month]);
  const monthQuery = useScopeTrades({ accountId, ...range }, { skip: view === 'year' });
  // The trades route needs both dates, so "every trade" is an open-ended range; only the newest one is needed.
  const everything = useScopeTrades({ accountId, startDate: '2000-01-01', endDate: '2099-12-31' }, { newestOnly: true });
  const newest = everything.trades[0];
  const newestMonth = newest ? parseMonth(monthKey(parseLocalDate(tradeDayKey(newest)))) : null;
  const trades = monthQuery.trades;

  const model = useMemo(() => buildMonth(trades, month, accountMap), [trades, month, accountMap]);
  const yearNum = month.getFullYear();
  const yearQuery = useScopeTrades({ accountId, startDate: `${yearNum}-01-01`, endDate: `${yearNum}-12-31` }, { skip: view !== 'year' });
  const yearMonths: YearMonth[] = useMemo(() => {
    if (view !== 'year') return [];
    return Array.from({ length: 12 }, (_, m) => {
      const date = new Date(yearNum, m, 1);
      return { key: monthKey(date), date, model: buildMonth(yearQuery.trades, date, accountMap) };
    });
  }, [view, yearQuery.trades, yearNum, accountMap]);
  const yearDays = useMemo(() => yearMonths.flatMap((m) => m.model.weeks.flatMap((w) => w.days).filter((d) => d.inMonth)), [yearMonths]);
  const yearSummary = useMemo(() => summarizeDays(yearDays), [yearDays]);

  const yearMixed = view === 'year' && yearMonths.some((m) => m.model.mixed);
  const metric = parseMetric(params.get('metric'), view === 'year' ? yearMixed : model.mixed);

  // With no `month` in the URL the page opens on the newest trade's month when the current month is empty.
  const monthParam = params.get('month');
  useEffect(() => {
    if (monthParam || everything.isLoading || !newestMonth) return;
    const hasCurrent = everything.trades.some((t) => tradeDayKey(t).startsWith(monthKey(new Date())));
    if (!hasCurrent) setQuery({ month: monthKey(newestMonth) }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam, everything.isLoading, newestMonth?.getTime()]);

  const scope = accountId && accountId !== 'ALL' ? accountId : 'ALL';
  const notesRange = useMemo(() => ({ from: range.startDate, to: range.endDate, scope }), [range, scope]);
  const notes = useGetDayNotesQuery(notesRange, { skip: view !== 'month' });
  const notesSupported = !isNotesUnavailable(notes.error) && !(notes.isError);
  const notesReady = notes.currentData !== undefined;
  const noteMap = useMemo(() => new Map((notes.currentData ?? []).map((n) => [n.date, n])), [notes.currentData]);
  const noteDays = useMemo(() => new Set((notes.currentData ?? []).filter((n) => n.plan || n.review).map((n) => n.date)), [notes.currentData]);

  const allDays = useMemo(() => model.weeks.flatMap((w) => w.days), [model]);
  const openDay = dayKey ? allDays.find((d) => d.key === dayKey) ?? null : null;
  const openWeekRow = weekPaneKey ? model.weeks.find((w) => w.days[0].key === weekPaneKey) ?? null : null;

  const goMonth = (d: Date, extra: Record<string, string | null> = {}) => setQuery({ month: monthKey(d), day: null, wk: null, ...extra }, true);
  const anchorParam = params.get('week');
  const anchor = anchorParam ? parseLocalDate(anchorParam) : monthKey(new Date()) === monthKey(month) ? new Date() : month;
  const anchorWeekIndex = Math.max(0, model.weeks.findIndex((w) => w.days.some((d) => d.key === formatLocalDateOnly(anchor))));
  const weekRow = model.weeks[anchorWeekIndex];
  const goWeek = (delta: number) => {
    const next = addDays(anchor, 7 * delta);
    setQuery({ week: formatLocalDateOnly(next), month: monthKey(next), day: null }, true);
  };
  const step = (dir: -1 | 1) => (view === 'week' ? goWeek(dir) : view === 'year' ? goMonth(addMonths(month, 12 * dir)) : goMonth(addMonths(month, dir)));
  usePeriodKeys(step);
  const title = view === 'year' ? String(yearNum) : view === 'week' && weekRow ? `${format(weekRow.days[0].date, 'd')} – ${format(weekRow.days[6].date, 'd MMM yyyy')}` : format(month, 'MMMM yyyy');
  const unit = view;

  const stepDay = (delta: -1 | 1) => {
    if (!openDay) return;
    const next = addDays(openDay.date, delta);
    setQuery({ day: formatLocalDateOnly(next), month: monthKey(next) }, true);
  };

  const openInTrades = () => {
    if (!openDay) return;
    dispatch(setDateRangeFilter({ startDate: openDay.key, endDate: openDay.key, datePreset: 'custom' }));
    navigate('/app/tradelog');
  };

  const returnFocus = (key: string | null) => {
    if (key) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-day="${key}"]`)?.focus());
  };
  const closePane = () => {
    const key = dayKey;
    setQuery({ day: null, wk: null }, true);
    returnFocus(key);
  };

  // PageUp / PageDown swap the grid; the cursor returns to the same day of the month once the new month has rendered.
  const focusDom = useRef<number | null>(null);
  const monthLoading = monthQuery.isLoading;
  useEffect(() => {
    if (focusDom.current === null || monthLoading || view !== 'month') return;
    const days = [...document.querySelectorAll<HTMLElement>('[data-day]')];
    const target = days[Math.min(focusDom.current, days.length) - 1];
    if (target) {
      target.focus();
      focusDom.current = null;
    }
  }, [monthLoading, view, params]);

  const paneOpen = trade.mode === 'closed' && view !== 'year' && (!!openDay || (view === 'month' && !!openWeekRow));
  useEffect(() => {
    if (paneOpen) headingRef.current?.focus({ preventScroll: true });
  }, [paneOpen, dayKey, weekPaneKey]);

  const weekSummary = useMemo(() => summarizeDays(weekRow?.days ?? []), [weekRow]);

  const noAccounts = accounts.length === 0;
  const loading = view === 'year' ? yearQuery.isLoading : monthQuery.isLoading;
  const error = view === 'year' ? yearQuery.isError : monthQuery.isError;
  const loadError = view === 'year' ? yearQuery.error : monthQuery.error;
  const refetch = view === 'year' ? yearQuery.refetch : monthQuery.refetch;

  return (
    <div>
      <ScopeSlot side="left" inline={isMobile}>
        <div className="flex items-center gap-1" role="group" aria-label="Calendar period">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={`Previous ${unit}`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
          <span className="min-w-32 text-center text-13 font-medium max-md:min-w-0 max-md:px-2" aria-live="polite">{title}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label={`Next ${unit}`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuery({ month: monthKey(appToday()), week: appTodayKey(), day: null, wk: null }, true)}>Today</Button>
        {newestMonth && monthKey(newestMonth) !== monthKey(month) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => goMonth(newestMonth, { week: newest ? tradeDayKey(newest) : null })}>Newest trade</Button>
        )}
      </ScopeSlot>
      {view !== 'week' && (
        <ScopeSlot side="right" inline={isMobile}>
          <label htmlFor="calendar-metric" className="text-xs text-muted-foreground">Colour by</label>
          <Select value={metric} onValueChange={(v) => setQuery({ metric: v === defaultMetric(view === 'year' ? yearMixed : model.mixed) ? null : v }, true)}>
            <SelectTrigger id="calendar-metric" className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{METRICS.map((m) => <SelectItem key={m} value={m}>{METRIC_LABEL[m]}</SelectItem>)}</SelectContent>
          </Select>
        </ScopeSlot>
      )}

      <SidePaneLayout
        open={paneOpen}
        label={openDay ? `Day ${format(openDay.date, 'd MMMM')}` : 'Week'}
        minMain={640}
        onClose={closePane}
        pane={
          openDay ? (
            <DayPanel
              ref={headingRef}
              day={openDay}
              accountMap={accountMap}
              scope={scope}
              note={noteMap.get(openDay.key)}
              notesRange={notesRange}
              notesSupported={notesSupported}
              notesReady={notesReady}
              onStepDay={stepDay}
              onClose={closePane}
              onOpenTrade={(id) => trade.openTrade(id, { ids: sortByTime(openDay.trades).map((t) => t.id) })}
              onAddTrade={() => trade.openNew({ date: openDay.key })}
              onOpenInTrades={openInTrades}
            />
          ) : openWeekRow ? (
            <WeekPanel
              ref={headingRef}
              week={openWeekRow}
              weekNumber={isoWeek(openWeekRow.days[0].date)}
              accountMap={accountMap}
              onClose={closePane}
              onOpenTrade={(id) => trade.openTrade(id, { ids: openWeekRow.days.flatMap((d) => sortByTime(d.trades)).map((t) => t.id) })}
              onOpenDay={(key) => setQuery({ day: key, wk: null })}
            />
          ) : null
        }
      >
        {error ? (
          <ErrorState title={view === 'year' ? 'Couldn’t load this year.' : 'Couldn’t load this month.'} description="Try again." error={loadError} onRetry={() => void refetch()} />
        ) : noAccounts ? (
          <EmptyState title="Add a trading account to start your calendar." description="Each trade belongs to an account. Trades appear here by the day they closed." action={<Button size="sm" onClick={() => navigate('/app/accounts?account=new')}>Add account</Button>} />
        ) : view === 'year' ? (
          <div className="space-y-3">
            {yearSummary.tradeCount > 0 && <PeriodSummary summary={yearSummary} days={yearDays} metric={metric} />}
            <YearView months={yearMonths} year={yearNum} metric={metric} loading={loading} capped={yearQuery.truncated} onOpenMonth={(key) => setQuery({ view: null, month: key })} onOpenDay={(key) => setQuery({ view: null, month: key.slice(0, 7), day: key })} />
            <Legend metric={metric} mixed={yearMixed} />
          </div>
        ) : loading ? (
          <div aria-busy="true" className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-[520px] w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {view === 'week' && weekRow ? (
              weekSummary.tradeCount > 0 ? <PeriodSummary summary={weekSummary} days={weekRow.days} metric={metric} /> : <p className="text-13 text-muted-foreground">No trades in this week.</p>
            ) : model.tradeCount === 0 ? (
              <p className="text-13 text-muted-foreground">
                No trades in {format(month, 'MMMM yyyy')}.{' '}
                {newestMonth && monthKey(newestMonth) !== monthKey(month) && (
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-13" onClick={() => goMonth(newestMonth)}>Go to the newest trade</Button>
                )}
              </p>
            ) : (
              <PeriodSummary summary={model} days={allDays} metric={metric} />
            )}

            {view === 'week' && weekRow ? (
              <WeekTimeline week={weekRow} accountMap={accountMap} openKey={dayKey} todayKey={todayKey} isMobile={isMobile} onOpenDay={(key) => setQuery({ day: key })} onOpenTrade={(id) => trade.openTrade(id, { ids: weekRow.days.flatMap((d) => sortByTime(d.trades)).map((t) => t.id) })} />
            ) : (
              <MonthGrid
                model={model}
                metric={metric}
                month={month}
                openKey={dayKey}
                openWeek={weekPaneKey}
                noteDays={noteDays}
                todayKey={todayKey}
                onOpenDay={(key) => setQuery({ day: key, wk: null })}
                onOpenWeek={(key) => setQuery({ wk: key, day: null })}
                onPageMonth={(d, dom) => { focusDom.current = dom; goMonth(addMonths(month, d)); }}
              />
            )}

            <Legend metric={metric} mixed={model.mixed} />

            {isMobile && view === 'month' && model.weeks.some((w) => w.count > 0) && (
              <ul className="space-y-1 text-13" aria-label="Weekly totals">
                {model.weeks.filter((w) => w.count > 0).map((w) => (
                  <li key={w.days[0].key}>
                    <button type="button" onClick={() => setQuery({ wk: w.days[0].key, day: null })} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-left">
                      <span>Week {isoWeek(w.days[0].date)}</span>
                      <span className="flex items-center gap-2 font-mono tabular-nums">
                        {w.byCurrency.map((c) => <span key={c.currency} className={c.net > 0 ? 'text-profit' : c.net < 0 ? 'text-loss' : 'text-foreground-soft'}>{formatMoney(c.net, c.currency, { sign: true })}</span>)}
                        <span className="text-xs text-muted-foreground">{w.count} · {w.wins}W {w.losses}L</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SidePaneLayout>
    </div>
  );
}

function Legend({ metric, mixed }: { metric: CalendarMetric; mixed: boolean }) {
  const tz = zoneName();
  const what: Record<CalendarMetric, string> = {
    pnl: 'Tint shows net P&L in three steps against the month’s largest day: green is a gain, red a loss.',
    r: 'Tint shows total R in three steps against the month’s largest day: green is positive, red negative. Days without a stop loss have no R.',
    trades: 'Tint shows the number of trades in three steps against the busiest day.',
    win: 'Tint shows win rate in three steps away from 50%: green above, red below.',
  };
  return (
    <div className={cn('space-y-1 text-xs text-muted-foreground')}>
      <p>{what[metric]}{mixed && metric === 'r' ? ' This scope mixes currencies, so R is the default.' : ''}</p>
      <p>
        <span className="font-semibold text-warning">!</span> a trade broke a rule. Days are by the time the trade closed. Times in {tz}.
      </p>
    </div>
  );
}
