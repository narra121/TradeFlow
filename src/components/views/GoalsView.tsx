import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, Shield, Award, CheckCircle2, Pencil, X, Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchGoals, 
  updateGoal as updateGoalAction,
  fetchRules,
  createRule as createRuleAction,
  updateRule as updateRuleAction,
  deleteRule as deleteRuleAction,
  toggleRule as toggleRuleAction
} from '@/store/slices/goalsRulesSlice';
import type { Goal as APIGoal, TradingRule as APITradingRule } from '@/lib/api/goalsRules';

interface GoalType {
  id: string;
  title: string;
  description: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  isInverse?: boolean; // true for goals where lower is better (e.g., drawdown)
}

interface GoalData {
  goalTypeId: string;
  period: 'weekly' | 'monthly';
  target: number;
  current: number;
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
    id: 'winrate',
    title: 'Win Rate',
    description: 'Maintain win rate goal',
    unit: '%',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    id: 'drawdown',
    title: 'Max Drawdown',
    description: 'Keep drawdown under limit',
    unit: '%',
    icon: Shield,
    color: 'text-warning',
    isInverse: true,
  },
  {
    id: 'trades',
    title: 'Max Trades',
    description: 'Stay under trade limit',
    unit: ' trades',
    icon: Award,
    color: 'text-accent',
    isInverse: true,
  },
];

// Default values for each goal type per period
const defaultGoalData: GoalData[] = [
  // Weekly goals
  { goalTypeId: 'profit', period: 'weekly', target: 500, current: 387 },
  { goalTypeId: 'winrate', period: 'weekly', target: 65, current: 68 },
  { goalTypeId: 'drawdown', period: 'weekly', target: 3, current: 2.1 },
  { goalTypeId: 'trades', period: 'weekly', target: 8, current: 5 },
  // Monthly goals
  { goalTypeId: 'profit', period: 'monthly', target: 2000, current: 1637 },
  { goalTypeId: 'winrate', period: 'monthly', target: 70, current: 66 },
  { goalTypeId: 'drawdown', period: 'monthly', target: 10, current: 7.5 },
  { goalTypeId: 'trades', period: 'monthly', target: 30, current: 22 },
];

export function GoalsView() {
  const dispatch = useAppDispatch();
  const { rules: reduxRules = [], loading } = useAppSelector((state) => state.goalsRules);
  
  // Use defaultGoalData as the data source (would come from Redux in production)
  const [goalData, setGoalData] = useState<GoalData[]>(defaultGoalData);
  const rules = reduxRules || [];
  
  useEffect(() => {
    dispatch(fetchGoals());
    dispatch(fetchRules());
  }, [dispatch]);
  
  const [periodFilter, setPeriodFilter] = useState<'weekly' | 'monthly'>('weekly');
  const [editingGoalKey, setEditingGoalKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingGoalKey, setSavingGoalKey] = useState<string | null>(null);

  // Rules state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleValue, setEditRuleValue] = useState<string>('');
  const [newRuleValue, setNewRuleValue] = useState<string>('');
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [isAddingRuleLoading, setIsAddingRuleLoading] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  // Get goal data for a specific goal type and period
  const getGoalData = (goalTypeId: string, period: 'weekly' | 'monthly') => {
    return goalData.find(g => g.goalTypeId === goalTypeId && g.period === period);
  };


  const handleEditStart = (goalTypeId: string, period: 'weekly' | 'monthly', currentTarget: number) => {
    const key = `${goalTypeId}-${period}`;
    setEditingGoalKey(key);
    setEditValue(currentTarget.toString());
  };

  const handleEditSave = async (goalTypeId: string, period: 'weekly' | 'monthly') => {
    const key = `${goalTypeId}-${period}`;
    const newTarget = parseFloat(editValue);
    if (!isNaN(newTarget) && newTarget > 0) {
      setSavingGoalKey(key);
      // Update local state (would dispatch to Redux in production)
      setGoalData(prev => prev.map(g => 
        g.goalTypeId === goalTypeId && g.period === period 
          ? { ...g, target: newTarget }
          : g
      ));
      setSavingGoalKey(null);
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
      await dispatch(updateRuleAction({ id: ruleId, payload: { rule: editRuleValue } })).unwrap();
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
      await dispatch(createRuleAction({ rule: newRuleValue })).unwrap();
      setNewRuleValue('');
      setIsAddingRule(false);
      setIsAddingRuleLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setDeletingRuleId(ruleId);
    await dispatch(deleteRuleAction(ruleId)).unwrap();
    setDeletingRuleId(null);
  };

  const handleToggleRule = async (ruleId: string) => {
    setTogglingRuleId(ruleId);
    await dispatch(toggleRuleAction(ruleId)).unwrap();
    setTogglingRuleId(null);
  };

  // Render a single goal card
  const renderGoalCard = (goalType: GoalType, period: 'weekly' | 'monthly', index: number) => {
    const data = getGoalData(goalType.id, period);
    if (!data) return null;

    const Icon = goalType.icon;
    const key = `${goalType.id}-${period}`;
    const isInverse = goalType.isInverse;
    
    // For inverse goals: lower is better, show how much "room" is left
    // For normal goals: higher is better, show progress toward target
    const progress = isInverse 
      ? Math.min((data.current / data.target) * 100, 100)
      : Math.min((data.current / data.target) * 100, 100);
    
    // For inverse: success if current <= target (stayed under limit)
    // For inverse: warning/danger if current > target (exceeded limit)
    const isCompleted = isInverse 
      ? data.current <= data.target 
      : data.current >= data.target;
    
    // For inverse goals, exceeding the target is bad
    const isExceeded = isInverse && data.current > data.target;
    
    const isEditing = editingGoalKey === key;

    return (
      <div 
        key={key}
        className="glass-card p-5 animate-fade-in group"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              isExceeded ? "bg-destructive/10" : isCompleted ? "bg-success/10" : "bg-secondary"
            )}>
              <Icon className={cn("w-5 h-5", isExceeded ? "text-destructive" : isCompleted ? "text-success" : goalType.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{goalType.title}</h3>
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
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleEditStart(goalType.id, period, data.target)}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-bold font-mono",
                isExceeded ? "text-destructive" : isCompleted ? "text-success" : "text-foreground"
              )}>
                {goalType.unit === '$' && goalType.unit}{data.current.toLocaleString()}{goalType.unit !== '$' && goalType.unit}
              </span>
              <span className="text-muted-foreground text-lg font-mono">
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
                      if (e.key === 'Enter') handleEditSave(goalType.id, period);
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                  />
                  {goalType.unit !== '$' && <span className="text-muted-foreground text-lg font-mono">{goalType.unit}</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEditSave(goalType.id, period)}
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
                  {goalType.unit === '$' && goalType.unit}{data.target.toLocaleString()}{goalType.unit !== '$' && goalType.unit}
                </span>
              )}
            </div>
            {!isEditing && (
              <span className={cn(
                "text-sm font-medium",
                isExceeded ? "text-destructive" : isCompleted ? "text-success" : "text-muted-foreground"
              )}>
                {isInverse ? (
                  isExceeded ? 'Exceeded!' : `${((data.target - data.current) / data.target * 100).toFixed(0)}% left`
                ) : (
                  `${progress.toFixed(0)}%`
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Goals & Rules</h1>
          <p className="text-muted-foreground mt-1">Track your trading objectives</p>
        </div>
        <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as 'weekly' | 'monthly')}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="weekly" className="text-sm">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalTypes.map((goalType, typeIndex) => (
          renderGoalCard(goalType, periodFilter, typeIndex)
        ))}
      </div>
      {/* Trading Rules Checklist */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Trading Rules</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {rules.filter(r => r.completed).length}/{rules.length} followed today
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAddingRule(true)}
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((item, index) => {
            const ruleId = (item as any).id || (item as any).ruleId;
            const isEditingThis = editingRuleId === ruleId;
            
            return (
              <div 
                key={ruleId}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl transition-colors animate-fade-in group",
                  item.completed 
                    ? "bg-success/5 border border-success/20" 
                    : "bg-secondary/30 border border-transparent"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleRule(ruleId)}
                  disabled={togglingRuleId === ruleId}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    item.completed 
                      ? "bg-success text-success-foreground" 
                      : "bg-secondary border-2 border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {togglingRuleId === ruleId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    item.completed && <CheckCircle2 className="w-4 h-4" />
                  )}
                </button>
                
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
                    <span className={cn(
                      "text-sm flex-1",
                      item.completed ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {item.rule}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        className="h-7 w-7"
                        onClick={() => handleDeleteRule(ruleId)}
                        disabled={deletingRuleId === ruleId}
                      >
                        {deletingRuleId === ruleId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>
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

      {/* Motivational Quote */}
      <div className="glass-card p-6 bg-gradient-card border-primary/20">
        <div className="flex items-start gap-4">
          <div className="text-4xl">"</div>
          <div>
            <p className="text-lg text-foreground italic">
              The goal of a successful trader is to make the best trades. Money is secondary.
            </p>
            <p className="text-sm text-muted-foreground mt-2">— Alexander Elder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
