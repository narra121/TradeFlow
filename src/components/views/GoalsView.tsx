import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AdSlot } from '@/components/ads/AdSlot';
import { Target, TrendingUp, Shield, Award, CheckCircle2, Pencil, X, Check, Plus, Trash2, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Trophy, Info, Settings } from 'lucide-react';
import { RefreshButton } from '@/components/ui/refresh-button';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useGetRulesAndGoalsQuery, useGetGoalsProgressQuery, useUpdateGoalMutation, useCreateGoalMutation, useCreateRuleMutation, useUpdateRuleMutation, useDeleteRuleMutation, useToggleRuleMutation, useGetProfileQuery } from '@/store/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatLocalDateOnly } from '@/lib/dateUtils';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { subWeeks } from 'date-fns/subWeeks';
import { subMonths } from 'date-fns/subMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { addMonths } from 'date-fns/addMonths';
import { format } from 'date-fns/format';
import { isSameWeek } from 'date-fns/isSameWeek';
import { isSameMonth } from 'date-fns/isSameMonth';
import { endOfDay } from 'date-fns/endOfDay';
import { AccountFilter } from '@/components/account/AccountFilter';
import { useAccounts } from '@/hooks/useAccounts';

import { GoalCardSkeleton, RulesListSkeleton } from '@/components/ui/loading-skeleton';

interface GoalType {
  id: string;
  title: string;
  description: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  isInverse?: boolean; // true for goals where lower is better (e.g., drawdown)
}

// 4 goal types that apply to both weekly and monthly
const goalTypes: GoalType[] = [
  {
    id: 'profit',
    title: 'Profit Target',
    description: 'Reach profit goal',
    unit: '$',
    icon: Target,
    color: 'text-primary',
  },
  {
    id: 'winRate',
    title: 'Win Rate',
    description: 'Maintain win rate goal',
    unit: '%',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    id: 'maxDrawdown',
    title: 'Max Drawdown',
    description: 'Keep drawdown under limit',
    unit: '%',
    icon: Shield,
    color: 'text-warning',
    isInverse: true,
  },
  {
    id: 'maxTrades',
    title: 'Max Trades',
    description: 'Stay under trade limit',
    unit: ' trades',
    icon: Award,
    color: 'text-accent',
    isInverse: true,
  },
];

export function GoalsView() {

  const { data: profile } = useGetProfileQuery();
  const carryForwardEnabled = profile?.preferences?.carryForwardGoalsRules ?? true;

  // State declarations
  const [periodFilter, setPeriodFilter] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [debouncedDate, setDebouncedDate] = useState<Date>(new Date());
  const [editingGoalKey, setEditingGoalKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingGoalKey, setSavingGoalKey] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleValue, setEditRuleValue] = useState<string>('');
  const [newRuleValue, setNewRuleValue] = useState<string>('');
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [isAddingRuleLoading, setIsAddingRuleLoading] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Debounce date changes - short delay to batch rapid clicks without feeling sluggish
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDate(selectedDate);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Calculate period date range based on debounced date and period filter
  const periodRange = useMemo(() => {
    if (periodFilter === 'weekly') {
      return {
        start: startOfWeek(debouncedDate, { weekStartsOn: 1 }),
        end: endOfDay(endOfWeek(debouncedDate, { weekStartsOn: 1 }))
      };
    } else {
      return {
        start: startOfMonth(debouncedDate),
        end: endOfDay(endOfMonth(debouncedDate))
      };
    }
  }, [debouncedDate, periodFilter]);

  // Check if viewing current period
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (periodFilter === 'weekly') {
      return isSameWeek(selectedDate, now, { weekStartsOn: 1 });
    } else {
      return isSameMonth(selectedDate, now);
    }
  }, [selectedDate, periodFilter]);

  // Compute periodKey from debounced date and period filter
  const periodKey = useMemo(() => {
    if (periodFilter === 'weekly') {
      const monday = startOfWeek(debouncedDate, { weekStartsOn: 1 });
      return `week#${format(monday, 'yyyy-MM-dd')}`;
    } else {
      return `month#${format(startOfMonth(debouncedDate), 'yyyy-MM')}`;
    }
  }, [debouncedDate, periodFilter]);

  // Format period label based on selected date (not debounced) for immediate UI feedback
  const periodLabel = useMemo(() => {
    const displayRange = periodFilter === 'weekly'
      ? {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfDay(endOfWeek(selectedDate, { weekStartsOn: 1 }))
        }
      : {
          start: startOfMonth(selectedDate),
          end: endOfDay(endOfMonth(selectedDate))
        };

    if (periodFilter === 'weekly') {
      return `${format(displayRange.start, 'MMM d')} - ${format(displayRange.end, 'MMM d, yyyy')}`;
    } else {
      return format(displayRange.start, 'MMMM yyyy');
    }
  }, [selectedDate, periodFilter]);

  const { selectedAccountId, accounts } = useAccounts();

  const { data: rulesGoalsData, isLoading: rulesGoalsLoading, isFetching: rulesGoalsFetching, refetch } = useGetRulesAndGoalsQuery({
    periodKey,
    currentPeriod: isCurrentPeriod,
  });

  const { data: progressData, isLoading: progressLoading, isFetching: progressFetching, refetch: refetchProgress } = useGetGoalsProgressQuery({
    accountId: selectedAccountId || 'ALL',
    startDate: formatLocalDateOnly(periodRange.start),
    endDate: formatLocalDateOnly(periodRange.end),
    period: periodFilter,
    periodKey,
    currentPeriod: isCurrentPeriod,
  });
  
  const [updateGoal] = useUpdateGoalMutation();
  const [createGoal] = useCreateGoalMutation();
  const [createRule] = useCreateRuleMutation();
  const [updateRule] = useUpdateRuleMutation();
  const [deleteRule] = useDeleteRuleMutation();
  const [toggleRule] = useToggleRuleMutation();

  const handleRefresh = useCallback(() => { refetch(); refetchProgress(); }, [refetch, refetchProgress]);
  const loading = rulesGoalsLoading || rulesGoalsFetching;
  
  const reduxRules = rulesGoalsData?.rules || [];

  // Default rules shown when no rules exist for the period
  const DEFAULT_RULES = [
    'Never risk more than 1% per trade',
    'Always set stop loss before entry',
    'No trading during high-impact news',
    'Wait for confirmation before entry',
    'Review trades weekly',
    'Stick to my trading plan',
  ];
  const defaultRuleObjects = DEFAULT_RULES.map((rule, i) => ({
    ruleId: `default-${i}`,
    rule,
    completed: false,
    isActive: true,
  }));

  const backendRules = progressData?.rules ?? reduxRules ?? [];
  const rules = backendRules.length > 0 ? backendRules : defaultRuleObjects;
  const isUsingDefaultRules = backendRules.length === 0;
  
  // Navigate to previous period
  const goToPreviousPeriod = () => {
    if (periodFilter === 'weekly') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };
  
  // Navigate to next period
  const goToNextPeriod = () => {
    if (periodFilter === 'weekly') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };
  
  // Go to current period
  const goToCurrentPeriod = () => {
    setSelectedDate(new Date());
  };
  
  const brokenRuleCounts = progressData?.ruleCompliance?.brokenRulesCounts ?? {};

  // Fall back to rulesGoalsData goals when progress API is unavailable
  const allGoals = rulesGoalsData?.goals || [];
  const accountGoals = progressData?.goals
    ?? allGoals.filter((g: any) =>
      g.period === periodFilter &&
      (selectedAccountId ? g.accountId === selectedAccountId : true)
    );

  // Default targets per goal type and period
  const defaultTargets: Record<string, Record<string, number>> = {
    weekly:  { profit: 500, winRate: 65, maxDrawdown: 3, maxTrades: 8 },
    monthly: { profit: 2000, winRate: 70, maxDrawdown: 10, maxTrades: 30 },
  };

  // Always provide progress — default to zeros so cards always render
  const zeroProgress = {
    profit: { current: 0, target: defaultTargets[periodFilter].profit, progress: 0, achieved: false },
    winRate: { current: 0, target: defaultTargets[periodFilter].winRate, progress: 0, achieved: false },
    maxDrawdown: { current: 0, target: defaultTargets[periodFilter].maxDrawdown, progress: 0, achieved: false },
    tradeCount: { current: 0, target: defaultTargets[periodFilter].maxTrades, progress: 0, achieved: false },
  };
  const goalProgress = progressData?.goalProgress ?? zeroProgress;

  // Get goal data for a specific goal type — fall back to a synthetic goal with defaults
  const getGoalForType = (goalType: string) => {
    const real = accountGoals.find(g => g.goalType === goalType);
    if (real) return real;
    // Synthetic goal so the card always renders with default target
    return {
      goalId: '',
      goalType,
      period: periodFilter,
      target: defaultTargets[periodFilter][goalType] ?? 0,
    };
  };

  const handleEditStart = (goalId: string, currentTarget: number) => {
    setEditingGoalKey(goalId);
    setEditValue(currentTarget.toString());
  };

  const handleEditSave = async (goalKey: string, period: 'weekly' | 'monthly', goalType: string) => {
    const newTarget = parseFloat(editValue);
    if (!isNaN(newTarget) && newTarget > 0) {
      // Find the real goal — if goalKey matches a goalId, it's a backend goal
      const realGoal = accountGoals.find((g: any) => g.goalId === goalKey);
      if (realGoal?.goalId) {
        setSavingGoalKey(goalKey);
        try {
          await updateGoal({ id: realGoal.goalId, payload: { target: newTarget } }).unwrap();
        } catch (error) {
          // Toast middleware handles error display
        }
        setSavingGoalKey(null);
      } else {
        // Synthetic goal — create it on the backend
        setSavingGoalKey(goalKey);
        try {
          await createGoal({
            accountId: selectedAccountId || undefined,
            goalType,
            period,
            target: newTarget,
            periodKey,
          }).unwrap();
        } catch (error) {
          // Toast middleware handles error display
        }
        setSavingGoalKey(null);
      }
    }
    setEditingGoalKey(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingGoalKey(null);
    setEditValue('');
  };

  // Rule editing handlers
  const handleRuleEditStart = (ruleId: string, ruleText: string) => {
    setEditingRuleId(ruleId);
    setEditRuleValue(ruleText);
  };

  const handleRuleEditSave = async (ruleId: string) => {
    if (editRuleValue.trim()) {
      setSavingRuleId(ruleId);
      try {
        await updateRule({ id: ruleId, payload: { rule: editRuleValue } }).unwrap();
      } catch (error) {
        // Toast middleware handles error display
      }
      setSavingRuleId(null);
    }
    setEditingRuleId(null);
    setEditRuleValue('');
  };

  const handleRuleEditCancel = () => {
    setEditingRuleId(null);
    setEditRuleValue('');
  };

  const handleAddRule = async () => {
    if (newRuleValue.trim()) {
      setIsAddingRuleLoading(true);
      try {
        await createRule({ rule: newRuleValue, periodKey }).unwrap();
        setNewRuleValue('');
        setIsAddingRule(false);
      } catch (error) {
        // Toast middleware handles error display
      } finally {
        setIsAddingRuleLoading(false);
      }
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setDeletingRuleId(ruleId);
    try {
      await deleteRule(ruleId).unwrap();
    } catch (error: any) {
      const errorCode = error?.data?.errorCode || error?.errorCode;
      if (errorCode === 'RULE_IN_USE') {
        toast.error('This rule is broken in one or more trades. You can edit it but not delete it.');
      }
      // Toast middleware handles other errors
    }
    setDeletingRuleId(null);
  };

  const handleToggleRule = async (ruleId: string) => {
    setTogglingRuleId(ruleId);
    try {
      await toggleRule(ruleId).unwrap();
    } catch (error) {
      // Toast middleware handles error display
    }
    setTogglingRuleId(null);
  };

  // Render a single goal card
  const renderGoalCard = (goalType: GoalType, period: 'weekly' | 'monthly', index: number) => {
    const goal = getGoalForType(goalType.id);
    if (!goal) return null;
    const hasBackendGoal = !!goal.goalId;
    
    // Get current value from goalProgress based on goal type
    const getCurrentValue = () => {
      switch (goalType.id) {
        case 'profit': return goalProgress.profit?.current ?? 0;
        case 'winRate': return goalProgress.winRate?.current ?? 0;
        case 'maxDrawdown': return goalProgress.maxDrawdown?.current ?? 0;
        case 'maxTrades': return goalProgress.tradeCount?.current ?? 0;
        default: return 0;
      }
    };
    
    const current = getCurrentValue();
    // Use target from goalProgress (backend-computed) if available, otherwise from goal
    const getTarget = () => {
      switch (goalType.id) {
        case 'profit': return goalProgress.profit?.target || goal.target;
        case 'winRate': return goalProgress.winRate?.target || goal.target;
        case 'maxDrawdown': return goalProgress.maxDrawdown?.target || goal.target;
        case 'maxTrades': return goalProgress.tradeCount?.target || goal.target;
        default: return goal.target;
      }
    };
    const target = getTarget();

    const Icon = goalType.icon;
    const key = goal.goalId || `${goalType.id}-${period}`;
    const isInverse = goalType.isInverse;
    
    // For inverse goals: lower is better, show how much "room" is left
    // For normal goals: higher is better, show progress toward target
    const progress = isInverse 
      ? Math.min((current / target) * 100, 100)
      : Math.min((current / target) * 100, 100);
    
    // For inverse: success if current <= target (stayed under limit)
    // For inverse: warning/danger if current > target (exceeded limit)
    const isCompleted = isInverse 
      ? current <= target 
      : current >= target;
    
    // For inverse goals, exceeding the target is bad
    const isExceeded = isInverse && current > target;
    
    const isEditing = editingGoalKey === key;

    return (
      <div 
        key={key}
        className="glass-card p-4 sm:p-5 animate-fade-in group"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn(
              "w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0",
              isExceeded ? "bg-destructive/10" : isCompleted ? "bg-success/10" : "bg-secondary"
            )}>
              <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", isExceeded ? "text-destructive" : isCompleted ? "text-success" : goalType.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">{goalType.title}</h3>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium",
                  period === 'weekly' 
                    ? "bg-accent/10 text-accent" 
                    : "bg-primary/10 text-primary"
                )}>
                  {period}
                </span>
                {isInverse && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium bg-warning/10 text-warning">
                    Limit
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{goalType.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isExceeded && (
              <div className="w-7 h-7 flex items-center justify-center">
                <X className="w-5 h-5 text-destructive" />
              </div>
            )}
            {isCompleted && !isExceeded && (
              <div className="w-7 h-7 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            )}
            {isCurrentPeriod && !isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => handleEditStart(key, target)}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
            <div className="flex items-baseline gap-1 flex-wrap min-w-0">
              <span className={cn(
                "text-xl sm:text-2xl font-bold font-mono",
                isExceeded ? "text-destructive" : isCompleted ? "text-success" : "text-foreground"
              )}>
                {goalType.unit === '$' && goalType.unit}{current.toLocaleString()}{goalType.unit !== '$' && goalType.unit}
              </span>
              <span className="text-muted-foreground text-base sm:text-lg font-mono">
                {' / '}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  {goalType.unit === '$' && <span className="text-muted-foreground text-lg font-mono">{goalType.unit}</span>}
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 h-7 text-lg font-mono py-0 px-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(key, period, goalType.id);
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                  />
                  {goalType.unit !== '$' && <span className="text-muted-foreground text-lg font-mono">{goalType.unit}</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEditSave(key, period, goalType.id)}
                    disabled={savingGoalKey === key}
                  >
                    {savingGoalKey === key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-success" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleEditCancel}
                    disabled={savingGoalKey === key}
                  >
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground text-lg font-mono">
                  {goalType.unit === '$' && goalType.unit}{target.toLocaleString()}{goalType.unit !== '$' && goalType.unit}
                </span>
              )}
            </div>
            {!isEditing && (
              <span className={cn(
                "text-sm font-medium",
                isExceeded ? "text-destructive" : isCompleted ? "text-success" : "text-muted-foreground"
              )}>
                {isInverse ? (
                  isExceeded ? 'Exceeded!' : `${((target - current) / target * 100).toFixed(0)}% left`
                ) : (
                  isCompleted ? 'Complete!' : `${Math.max(0, 100 - progress).toFixed(0)}% left`
                )}
              </span>
            )}
          </div>

          <Progress 
            value={progress} 
            className={cn(
              "h-2",
              isExceeded ? "[&>div]:bg-destructive" : isCompleted ? "[&>div]:bg-success" : isInverse ? "[&>div]:bg-warning" : ""
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Goals & Rules</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Set targets, track rules, and stay disciplined</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <RefreshButton onRefresh={handleRefresh} isFetching={rulesGoalsFetching || progressFetching} />
            <AccountFilter showLabel={false} />
            <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as 'weekly' | 'monthly')}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Period Navigation */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousPeriod}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground min-w-[180px] text-center">
              {periodLabel}
            </span>
            {!isCurrentPeriod && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={goToCurrentPeriod}
              >
                Today
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPeriod}
            disabled={isCurrentPeriod}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Past period read-only banner */}
      {!isCurrentPeriod && !loading && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" />
          <span>Viewing a past period — goals and rules are read-only</span>
        </div>
      )}

      {/* Carry-forward disabled indicator */}
      {carryForwardEnabled === false && isCurrentPeriod && !loading && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-sm text-muted-foreground">
          <Settings className="w-4 h-4 shrink-0 text-accent" />
          <span>Each period starts fresh with defaults.</span>
          <Link to="/app/settings" className="text-accent hover:underline ml-1">Change in Settings</Link>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GoalCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200", progressFetching && "opacity-50")}>
          {goalTypes.map((goalType, typeIndex) => (
            renderGoalCard(goalType, periodFilter, typeIndex)
          ))}
        </div>
      )}

      {/* Trading Rules Checklist */}
      {loading ? (
        <RulesListSkeleton />
      ) : (
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Trading Rules</h2>
          <div className="flex items-center gap-2 sm:gap-3">
            {rules.length > 0 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {rules.length - Object.keys(brokenRuleCounts).filter(ruleId => brokenRuleCounts[ruleId] > 0).length}/{rules.length} followed
              </span>
            )}
            {isCurrentPeriod && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsAddingRule(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Rule</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {isUsingDefaultRules && (
          <p className="text-xs text-muted-foreground mb-2">Showing default rules. Add or edit rules to customize for this period.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((item, index) => {
            const ruleId = (item as any).id || (item as any).ruleId;
            const isEditingThis = editingRuleId === ruleId;
            const brokenCount = brokenRuleCounts[ruleId] || 0;
            
            return (
              <div 
                key={ruleId}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl transition-colors animate-fade-in group",
                  brokenCount > 0
                    ? "bg-destructive/5 border border-destructive/20"
                    : "bg-success/5 border border-success/20"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  brokenCount > 0
                    ? "bg-destructive/10"
                    : "bg-success/10"
                )}>
                  {brokenCount > 0 ? (
                    <X className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                </div>
                
                {isEditingThis ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editRuleValue}
                      onChange={(e) => setEditRuleValue(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRuleEditSave(ruleId);
                        if (e.key === 'Escape') handleRuleEditCancel();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleRuleEditSave(ruleId)}
                      disabled={savingRuleId === ruleId}
                    >
                      {savingRuleId === ruleId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-success" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleRuleEditCancel}
                      disabled={savingRuleId === ruleId}
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <span className={cn(
                        "text-sm",
                        item.completed ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {item.rule}
                      </span>
                      {brokenCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {brokenCount}× {periodFilter === 'weekly' ? 'this week' : 'this month'}
                        </span>
                      )}
                    </div>
                    {isCurrentPeriod && !isUsingDefaultRules && (
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRuleEditStart(ruleId, item.rule)}
                          disabled={deletingRuleId === ruleId}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-7 w-7", brokenCount > 0 && "opacity-50 cursor-not-allowed")}
                          onClick={() => handleDeleteRule(ruleId)}
                          disabled={deletingRuleId === ruleId || brokenCount > 0}
                          title={brokenCount > 0 ? 'Cannot delete — this rule is broken in trades' : undefined}
                        >
                          {deletingRuleId === ruleId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Add New Rule Input */}
          {isAddingRule && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-primary/30 animate-fade-in">
              <div className="w-6 h-6 rounded-full bg-secondary border-2 border-dashed border-muted-foreground/30 shrink-0" />
              <Input
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                placeholder="Enter new rule..."
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddRule();
                  if (e.key === 'Escape') {
                    setIsAddingRule(false);
                    setNewRuleValue('');
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleAddRule}
                disabled={isAddingRuleLoading}
              >
                {isAddingRuleLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-success" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setIsAddingRule(false);
                  setNewRuleValue('');
                }}
                disabled={isAddingRuleLoading}
              >
                <X className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Motivational Quote */}
      <div className="glass-card p-4 sm:p-6 bg-gradient-card border-primary/20">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="text-3xl sm:text-4xl shrink-0">"</div>
          <div className="min-w-0">
            <p className="text-sm sm:text-lg text-foreground italic">
              The goal of a successful trader is to make the best trades. Money is secondary.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">— Alexander Elder</p>
          </div>
        </div>
      </div>

      <AdSlot placementId="goals-below-quote" className="mt-6" />
    </div>
  );
}
