import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, Shield, Award, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  deadline?: string;
}

const defaultGoals: Goal[] = [
  {
    id: '1',
    title: 'Monthly Profit Target',
    description: 'Reach $3,000 in monthly profits',
    target: 3000,
    current: 2637,
    unit: '$',
    icon: Target,
    color: 'text-primary',
    deadline: 'Dec 31, 2024',
  },
  {
    id: '2',
    title: 'Win Rate Goal',
    description: 'Maintain 70% or higher win rate',
    target: 70,
    current: 66,
    unit: '%',
    icon: TrendingUp,
    color: 'text-success',
  },
  {
    id: '3',
    title: 'Risk Management',
    description: 'Keep max drawdown under 10%',
    target: 10,
    current: 12.5,
    unit: '%',
    icon: Shield,
    color: 'text-warning',
  },
  {
    id: '4',
    title: 'Trade Count',
    description: 'Execute 30 quality trades this month',
    target: 30,
    current: 22,
    unit: ' trades',
    icon: Award,
    color: 'text-accent',
    deadline: 'Dec 31, 2024',
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
  const [goals] = useState<Goal[]>(defaultGoals);
  const [rules] = useState(tradingRules);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Goals & Rules</h1>
          <p className="text-muted-foreground mt-1">Track your trading objectives</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-5 h-5" />
          Add Goal
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal, index) => {
          const Icon = goal.icon;
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          const isCompleted = goal.current >= goal.target;
          const isInverse = goal.id === '3'; // Drawdown goal - lower is better

          return (
            <div 
              key={goal.id}
              className="glass-card p-5 animate-fade-in"
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
                    <h3 className="font-semibold text-foreground">{goal.title}</h3>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
                {isCompleted && (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className={cn(
                      "text-2xl font-bold font-mono",
                      isCompleted ? "text-success" : "text-foreground"
                    )}>
                      {goal.unit === '$' && goal.unit}{goal.current.toLocaleString()}{goal.unit !== '$' && goal.unit}
                    </span>
                    <span className="text-muted-foreground text-lg font-mono">
                      {' / '}{goal.unit === '$' && goal.unit}{goal.target.toLocaleString()}{goal.unit !== '$' && goal.unit}
                    </span>
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-success" : "text-muted-foreground"
                  )}>
                    {progress.toFixed(0)}%
                  </span>
                </div>

                <Progress 
                  value={progress} 
                  className={cn(
                    "h-2",
                    isCompleted ? "[&>div]:bg-success" : ""
                  )}
                />

                {goal.deadline && (
                  <p className="text-xs text-muted-foreground">
                    Deadline: {goal.deadline}
                  </p>
                )}
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
