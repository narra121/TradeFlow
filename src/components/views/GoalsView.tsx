import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AccountPicker } from '@/components/account/AccountPicker';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel } from '@/components/ui/panel';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalsPanel, type Track } from '@/components/goals/GoalsPanel';
import { RulesPanel, type RuleRow } from '@/components/goals/RulesPanel';
import { useGoalHistory } from '@/components/goals/useGoalHistory';
import { DEFAULT_TARGETS, GOAL_ORDER, STARTER_RULES, isCurrentPeriod, periodLabel, periodNoun, periodOf, previousPeriods, shiftPeriod, tradingDays, type GoalPeriod, type GoalType } from '@/components/goals/goalMath';
import { breaksByRule, compliance, normaliseRule, ruleHistory, ruleTextById, tradesInPeriod } from '@/components/goals/ruleMath';
import { ScopeSlot } from '@/components/calendar/ScopeSlot';
import { usePeriodKeys } from '@/components/calendar/usePeriodKeys';
import { usePageChrome } from '@/components/shell/chrome';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnline } from '@/hooks/useOnline';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAccounts } from '@/hooks/useAccounts';
import { useScopeTrades } from '@/hooks/useScopeTrades';
import { drawdownBasis } from '@/components/stats/useScopeCapital';
import {
  useCreateGoalMutation,
  useCreateRuleMutation,
  useDeleteRuleMutation,
  useGetGoalsProgressQuery,
  useGetRulesAndGoalsQuery,
  useGetRulesQuery,
  useUpdateGoalMutation,
  useUpdateRuleMutation,
} from '@/store/api/goalsRulesApi';
import { useAppDispatch } from '@/store/hooks';
import { setDateRangeFilter } from '@/store/slices/tradesSlice';
import { readApiError } from '@/lib/apiError';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { appToday } from '@/lib/appTimeZone';
import { parseLocalDate } from '@/lib/format';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function GoalsView() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { accounts, isLoading: accountsLoading, selectedAccount, setSelectedAccountId } = useAccounts();
  const isMobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();

  // `Make this a rule` in an AI report arrives as `?addRule=<text>`: open the add row with the text selected, then drop the
  // parameter in place so Back still returns to the report.
  const addRuleParam = params.get('addRule');
  useEffect(() => {
    if (addRuleParam === null) return;
    setPrefill(addRuleParam);
    setAdding(true);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('addRule');
      return next;
    }, { replace: true });
  }, [addRuleParam, setParams]);

  // The period unit and the anchor date are the only period state; key, range and the current flag derive from them.
  const periodType: GoalPeriod = params.get('period') === 'month' ? 'monthly' : 'weekly';
  const anchorParam = params.get('on');
  // Memoised: a fresh `new Date()` on every render would recompute everything below that depends on the period.
  const anchor = useMemo(() => (anchorParam && ISO_DATE.test(anchorParam) ? parseLocalDate(anchorParam) : appToday()), [anchorParam]);
  const ref = useMemo(() => periodOf(periodType, anchor), [periodType, anchor.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = isCurrentPeriod(ref);
  const noun = periodNoun(periodType);
  const siblingRef = useMemo(() => periodOf(periodType === 'weekly' ? 'monthly' : 'weekly', ref.start), [periodType, ref]);

  const setPeriod = (next: { period?: GoalPeriod; on?: Date | null }, replace = true) => {
    const p = new URLSearchParams(params);
    if (next.period === 'monthly') p.set('period', 'month');
    else if (next.period) p.delete('period');
    if (next.on === null) p.delete('on');
    else if (next.on) p.set('on', formatLocalDateOnly(next.on));
    setParams(p, { replace });
  };
  const step = (delta: -1 | 1) => {
    const next = shiftPeriod(ref, delta);
    if (delta > 0 && isCurrentPeriod(ref)) return;
    setPeriod({ on: isCurrentPeriod(next) ? null : next.start });
  };
  usePeriodKeys(step);

  usePageChrome({ ownPeriod: true });

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts]);
  const currencies = useMemo(() => [...new Set((selectedAccount ? [selectedAccount] : activeAccounts).map((a) => a.currency || 'USD'))], [selectedAccount, activeAccounts]);
  const currency = currencies.length === 1 ? currencies[0] : undefined;
  const needAccount = !selectedAccount && currencies.length > 1;
  const scopeId = selectedAccount ? selectedAccount.id : 'ALL';
  const basis = useMemo(() => drawdownBasis(selectedAccount ? [selectedAccount] : activeAccounts), [selectedAccount, activeAccounts]);
  const totalCapital = useMemo(() => (selectedAccount ? selectedAccount.initialBalance || 0 : activeAccounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0)), [selectedAccount, activeAccounts]);

  const rulesGoals = useGetRulesAndGoalsQuery({ periodKey: ref.key, currentPeriod: live });
  const progress = useGetGoalsProgressQuery(
    { accountId: scopeId, startDate: ref.startDate, endDate: ref.endDate, period: ref.period, periodKey: ref.key, currentPeriod: live, totalCapital },
    { skip: accountsLoading || needAccount || accounts.length === 0 },
  );
  const sibling = useGetRulesAndGoalsQuery({ periodKey: siblingRef.key, currentPeriod: false });
  const allRulesQuery = useGetRulesQuery();
  const windowStart = previousPeriods(ref)[0].startDate;
  const trades = useScopeTrades({ accountId: scopeId, startDate: windowStart, endDate: ref.endDate }, { skip: accountsLoading || accounts.length === 0 });
  const history = useGoalHistory({ accountId: scopeId, totalCapital, current: ref, enabled: !needAccount && !!progress.currentData });

  const [updateGoal] = useUpdateGoalMutation();
  const [createGoal] = useCreateGoalMutation();
  const [createRule] = useCreateRuleMutation();
  const [updateRule] = useUpdateRuleMutation();
  const [deleteRule] = useDeleteRuleMutation();

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  // `currentData`: while another account or period loads, `data` still holds the last one's goals and rules.
  const gp = progress.currentData?.goalProgress;
  const records = rulesGoals.currentData?.goals;

  /**
   * The record a goal type edits. An account's own goal overrides the default (accountId null) for that account; for all
   * accounts the default counts only while no account has a goal of the type, otherwise the figure is the sum of those
   * account goals and has no record of its own. Read from the period's records: the progress response's `goals` carry
   * summed targets in the all-accounts scope.
   */
  const recordFor = useCallback(
    (type: GoalType) => {
      const ofType = (records ?? []).filter((g) => g.goalType === type && g.period === periodType);
      if (selectedAccount) return { own: ofType.find((g) => g.accountId === selectedAccount.id), derived: false };
      const derived = ofType.some((g) => g.accountId);
      return { own: derived ? undefined : ofType.find((g) => !g.accountId), derived };
    },
    [records, periodType, selectedAccount],
  );

  const tracks: Track[] = useMemo(() => {
    if (!gp) return [];
    return GOAL_ORDER.map((type: GoalType) => {
      const prog = type === 'maxTrades' ? gp.tradeCount : gp[type];
      const { own, derived } = recordFor(type);
      return {
        type,
        current: prog?.current ?? 0,
        // The server's target already applies the account-over-default rule.
        target: prog?.target > 0 ? prog.target : own?.target ?? DEFAULT_TARGETS[periodType][type],
        isDefault: !own && !derived,
        derived,
        tradeCount: gp.tradeCount?.current ?? 0,
        unavailable: type === 'maxDrawdown' && basis === 'balance' ? 'Set a starting balance on the account to track drawdown.' : undefined,
      };
    });
  }, [gp, recordFor, periodType, basis]);

  const saveGoal = async (type: GoalType, value: number) => {
    const { own } = recordFor(type);
    if (own?.goalId) await updateGoal({ id: own.goalId, payload: { target: value } }).unwrap();
    else await createGoal({ accountId: selectedAccount?.id, goalType: type, period: periodType, target: value, periodKey: ref.key }).unwrap();
  };

  const allRules = useMemo(() => allRulesQuery.data ?? [], [allRulesQuery.data]);
  const idText = useMemo(() => ruleTextById(allRules), [allRules]);
  const periodRules = useMemo(() => rulesGoals.currentData?.rules ?? [], [rulesGoals.currentData]);
  const periodTrades = useMemo(() => tradesInPeriod(trades.trades, ref), [trades.trades, ref]);
  const stats = useMemo(() => breaksByRule(periodTrades, idText, accountMap), [periodTrades, idText, accountMap]);

  const ruleRows: RuleRow[] = useMemo(
    () =>
      periodRules.map((r) => {
        const key = normaliseRule(r.rule);
        return {
          id: r.ruleId,
          text: r.rule,
          key,
          stat: stats.get(key),
          idle: periodTrades.length === 0,
          history: ruleHistory(key, ref, allRules, trades.trades, idText).map((h) => ({ label: periodLabel(h.period), cell: h.cell })),
        };
      }),
    [periodRules, stats, ref, allRules, trades.trades, idText, periodTrades.length],
  );

  const comp = useMemo(() => compliance(periodTrades, new Set(ruleRows.map((r) => r.key)), idText), [periodTrades, ruleRows, idText]);
  const pullable = useMemo(() => {
    const own = new Set(ruleRows.map((r) => r.key));
    const seen = new Set<string>();
    return (sibling.currentData?.rules ?? []).filter((r) => {
      const k = normaliseRule(r.rule);
      if (own.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [sibling.currentData, ruleRows]);

  const openTrades = (row: RuleRow) => {
    dispatch(setDateRangeFilter({ startDate: ref.startDate, endDate: ref.endDate, datePreset: 'custom' }));
    const ids = [...idText].filter(([, text]) => text === row.key).map(([id]) => id);
    navigate(`/app/tradelog?broken=${encodeURIComponent(ids.join(','))}`);
  };

  const days = tradingDays(ref);
  const rulesLoading = rulesGoals.isLoading || (rulesGoals.isFetching && !rulesGoals.currentData);
  const loading = rulesLoading || progress.isLoading || (progress.isFetching && !progress.currentData) || accountsLoading;
  const failed = rulesGoals.isError || progress.isError || allRulesQuery.isError;
  const failure = progress.error ?? rulesGoals.error ?? allRulesQuery.error;
  const online = useOnline();
  const planReadOnly = useEntitlements().readOnly;
  const readOnly = !live || !online || planReadOnly;

  const retry = () => {
    void rulesGoals.refetch();
    if (!needAccount) void progress.refetch();
    void allRulesQuery.refetch();
  };

  const context = live ? (
    <span className="text-13 text-muted-foreground">
      {selectedAccount ? `${selectedAccount.name} · ` : ''}
      {days.left === 0 ? 'Last trading day' : `${days.left} trading ${days.left === 1 ? 'day' : 'days'} left`}
    </span>
  ) : undefined;

  const goalsBody = () => {
    if (accounts.length === 0) {
      return <EmptyState title="Add a trading account to set goals." description="Goals are tracked per account, from its trades." action={<Button size="sm" onClick={() => navigate('/app/accounts?account=new')}>Add account</Button>} />;
    }
    if (needAccount) {
      return (
        <Panel title="Goals" padded>
          <p className="text-13 text-foreground-soft">Goals are tracked per account. Your accounts use different currencies, so choose one.</p>
          <div className="mt-3 max-w-xs space-y-1.5">
            <label id="goals-account" className="text-xs font-medium text-foreground-soft">Account</label>
            <AccountPicker label="Account" labelledBy="goals-account" accounts={activeAccounts} value={null} onChange={setSelectedAccountId} />
          </div>
        </Panel>
      );
    }
    if (loading) return <Skeleton className="h-64 w-full" aria-busy="true" />;
    if (failed || !gp) return <ErrorState title="Couldn’t load your goals." description="Try again." error={failure} onRetry={retry} />;
    return (
      <div className="space-y-2">
        <GoalsPanel tracks={tracks} period={ref} live={live} readOnly={readOnly} currency={currency} context={context} history={history.strips} historyLoading={history.loading} onSave={saveGoal} />
        {tracks.every((t) => t.tradeCount === 0) && <p className="text-13 text-muted-foreground">No trades yet this {noun}.</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ScopeSlot side="left" inline={isMobile}>
        <SegmentedControl<GoalPeriod>
          label="Period unit"
          size="sm"
          value={periodType}
          onChange={(v) => setPeriod({ period: v, on: null })}
          options={[{ value: 'weekly', label: 'Week' }, { value: 'monthly', label: 'Month' }]}
        />
        <div className="flex items-center gap-1" role="group" aria-label="Goals period">
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={`Previous ${noun}`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
          <span className="min-w-36 text-center text-13 font-medium max-md:min-w-0 max-md:px-2" aria-live="polite">{periodLabel(ref)}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => step(1)} disabled={live} aria-label={`Next ${noun}`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
        {/* Only a past period needs the way back; a disabled button on the current one costs a whole row on phones. */}
        {!live && <Button type="button" variant="outline" size="sm" onClick={() => setPeriod({ on: null })}>This {noun}</Button>}
      </ScopeSlot>
      {live && online && (
        <ScopeSlot side="right" inline={isMobile}>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Add rule
          </Button>
        </ScopeSlot>
      )}

      {!live && <p role="status" className="text-13 text-muted-foreground">Past period — read-only.</p>}

      {goalsBody()}

      {rulesLoading || allRulesQuery.isLoading ? (
        <Skeleton className="h-48 w-full" aria-busy="true" />
      ) : rulesGoals.isError ? (
        <ErrorState title="Couldn’t load your rules." description="Try again." error={rulesGoals.error} onRetry={retry} />
      ) : (
        <RulesPanel
          rows={ruleRows}
          period={periodType}
          readOnly={readOnly}
          complianceText={comp ? `Followed on ${comp.followed} of ${comp.total} ${comp.total === 1 ? 'trade' : 'trades'} this ${noun} (${comp.pct}%)` : undefined}
          starters={STARTER_RULES}
          pullable={pullable.map((r) => ({ text: r.rule }))}
          siblingLabel={periodType === 'weekly' ? 'monthly' : 'weekly'}
          adding={adding}
          addInitial={prefill}
          onCloseAdd={() => { setAdding(false); setPrefill(undefined); }}
          onAdd={async (text) => void (await createRule({ rule: text, periodKey: ref.key }).unwrap())}
          onEdit={async (id, text) => void (await updateRule({ id, payload: { rule: text } }).unwrap())}
          onDelete={async (id) => {
            try {
              await deleteRule(id).unwrap();
              return {};
            } catch (e) {
              if (readApiError(e).code === 'RULE_IN_USE') return { inUse: true };
              throw e;
            }
          }}
          onCopy={async (text) => void (await createRule({ rule: text, periodKey: ref.key }).unwrap())}
          onOpenTrades={openTrades}
        />
      )}
    </div>
  );
}
