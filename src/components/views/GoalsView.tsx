import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, Shield, Award, CheckCircle2, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  period: 'weekly' | 'monthly';
}

const defaultGoals: Goal[] = [
  {
    id: '1',
    title: 'Profit Target',
    description: 'Reach profit goal',
    target: 3000,
    current: 2637,
    unit: '$',
    icon: Target,
    color: 'text-primary',
    period: 'monthly',
  },
  {
    id: '2',
    title: 'Win Rate',
    description: 'Maintain win rate goal',
    target: 70,
    current: 66,
    unit: '%',
    icon: TrendingUp,
    color: 'text-success',
    period: 'monthly',
  },
  {
    id: '3',
    title: 'Max Drawdown',
    description: 'Keep drawdown under limit',
    target: 10,
    current: 12.5,
    unit: '%',
    icon: Shield,
    color: 'text-warning',
    period: 'weekly',
  },
  {
    id: '4',
    title: 'Trade Count',
    description: 'Execute quality trades',
    target: 30,
    current: 22,
    unit: ' trades',
    icon: Award,
    color: 'text-accent',
    period: 'weekly',
  },
];

const tradingRules = [
  { id: '1', rule: 'Never risk more than 1% per trade', completed: true },
  { id: '2', rule: 'Always set stop loss before entry', completed: true },
  { id: '3', rule: 'No trading during high-impact news', completed: false },
  { id: '4', rule: 'Wait for confirmation before entry', completed: true },
  { id: '5', rule: 'Review trades weekly', completed: false },
  { id: '6', rule: 'Stick to my trading plan', completed: true },
];

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>(defaultGoals);
  const [rules] = useState(tradingRules);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const filteredGoals = periodFilter === 'all' 
    ? goals 
    : goals.filter(g => g.period === periodFilter);

  const handleEditStart = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditValue(goal.target.toString());
  };

  const handleEditSave = (goalId: string) => {
    const newTarget = parseFloat(editValue);
    if (!isNaN(newTarget) && newTarget > 0) {
      setGoals(prev => prev.map(g => 
        g.id === goalId ? { ...g, target: newTarget } : g
      ));
    }
    setEditingGoalId(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingGoalId(null);
    setEditValue('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Goals & Rules</h1>
          <p className="text-muted-foreground mt-1">Track your trading objectives</p>
        </div>
        <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as typeof periodFilter)}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
            <TabsTrigger value="weekly" className="text-sm">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-sm">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal, index) => {
          const Icon = goal.icon;
          const isInverse = goal.id === '3'; // Drawdown - lower is better
          const progress = isInverse 
            ? Math.max(0, ((goal.target - goal.current + goal.target) / goal.target) * 50)
            : Math.min((goal.current / goal.target) * 100, 100);
          const isCompleted = isInverse 
            ? goal.current <= goal.target 
            : goal.current >= goal.target;
          const isEditing = editingGoalId === goal.id;

          return (
            <div 
              key={goal.id}
              className="glass-card p-5 animate-fade-in group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center",
                    isCompleted ? "bg-success/10" : "bg-secondary"
                  )}>
                    <Icon className={cn("w-5 h-5", isCompleted ? "text-success" : goal.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{goal.title}</h3>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium",
                        goal.period === 'weekly' 
                          ? "bg-accent/10 text-accent" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {goal.period}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isCompleted && (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEditStart(goal)}
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
                      isCompleted ? "text-success" : "text-foreground"
                    )}>
                      {goal.unit === '$' && goal.unit}{goal.current.toLocaleString()}{goal.unit !== '$' && goal.unit}
                    </span>
                    <span className="text-muted-foreground text-lg font-mono">
                      {' / '}
                    </span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        {goal.unit === '$' && <span className="text-muted-foreground text-lg font-mono">{goal.unit}</span>}
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 text-lg font-mono py-0 px-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(goal.id);
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                        />
                        {goal.unit !== '$' && <span className="text-muted-foreground text-lg font-mono">{goal.unit}</span>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditSave(goal.id)}
                        >
                          <Check className="w-3.5 h-3.5 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleEditCancel}
                        >
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-lg font-mono">
                        {goal.unit === '$' && goal.unit}{goal.target.toLocaleString()}{goal.unit !== '$' && goal.unit}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <span className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-success" : "text-muted-foreground"
                    )}>
                      {progress.toFixed(0)}%
                    </span>
                  )}
                </div>

                <Progress 
                  value={progress} 
                  className={cn(
                    "h-2",
                    isCompleted ? "[&>div]:bg-success" : ""
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trading Rules Checklist */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Trading Rules</h2>
          <span className="text-sm text-muted-foreground">
            {rules.filter(r => r.completed).length}/{rules.length} followed today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((item, index) => (
            <div 
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-colors animate-fade-in",
                item.completed 
                  ? "bg-success/5 border border-success/20" 
                  : "bg-secondary/30 border border-transparent"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                item.completed 
                  ? "bg-success text-success-foreground" 
                  : "bg-secondary border-2 border-muted-foreground/30"
              )}>
                {item.completed && <CheckCircle2 className="w-4 h-4" />}
              </div>
              <span className={cn(
                "text-sm",
                item.completed ? "text-foreground" : "text-muted-foreground"
              )}>
                {item.rule}
              </span>
            </div>
          ))}
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
