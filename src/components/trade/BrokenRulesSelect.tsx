import { cn } from '@/lib/utils';
import { TradingRule } from '@/lib/api/goalsRules';
import { AlertTriangle, Shield, ExternalLink } from 'lucide-react';

interface BrokenRulesSelectProps {
  rules: TradingRule[];
  selectedRuleIds: string[];
  onChange: (ruleIds: string[]) => void;
}

export function BrokenRulesSelect({ rules, selectedRuleIds, onChange }: BrokenRulesSelectProps) {
  const toggleRule = (ruleId: string) => {
    if (selectedRuleIds.includes(ruleId)) {
      onChange(selectedRuleIds.filter(id => id !== ruleId));
    } else {
      onChange([...selectedRuleIds, ruleId]);
    }
  };

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-5 px-3 rounded-lg border border-dashed border-border bg-secondary/20">
        <Shield className="w-5 h-5 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          No trading rules defined yet
        </p>
        <p className="text-xs text-muted-foreground/70 mb-3">
          Create rules to track which ones you break per trade
        </p>
        <a
          href="/app/goals"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Go to Goals & Rules
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => {
        const isSelected = selectedRuleIds.includes(rule.ruleId);

        return (
          <button
            key={rule.ruleId}
            type="button"
            onClick={() => toggleRule(rule.ruleId)}
            className={cn(
              "w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg text-left transition-all text-xs sm:text-sm",
              isSelected
                ? "bg-destructive/10 border border-destructive/30"
                : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
              isSelected
                ? "bg-destructive text-destructive-foreground"
                : "bg-secondary border border-muted-foreground/30"
            )}>
              {isSelected && <AlertTriangle className="w-3 h-3" />}
            </div>
            <span className={cn(
              "break-words min-w-0",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {rule.rule}
            </span>
          </button>
        );
      })}
    </div>
  );
}
