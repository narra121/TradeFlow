import { cn } from '@/lib/utils';
import { TradingRule } from '@/lib/api/goalsRules';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all text-sm",
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
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {rule.rule}
            </span>
          </button>
        );
      })}
      
      {rules.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          No trading rules defined. Add rules in Goals & Rules page.
        </div>
      )}
    </div>
  );
}
