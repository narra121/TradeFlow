export interface Goal {
  userId: string;
  goalId: string;
  accountId: string;
  goalType: 'profit' | 'winRate' | 'maxDrawdown' | 'maxTrades';
  period: 'weekly' | 'monthly';
  target: number;
  title: string;
  description: string;
  unit: string;
  icon: string;
  color: string;
  isInverse?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TradingRule {
  userId: string;
  ruleId: string;
  rule: string;
  completed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateGoalPayload {
  target?: number;
  title?: string;
  description?: string;
  accountId?: string;
  period?: 'weekly' | 'monthly';
}

export interface CreateRulePayload {
  rule: string;
  periodKey?: string;
}

export interface UpdateRulePayload {
  rule: string;
}

export interface CreateGoalPayload {
  accountId?: string;
  goalType: string;
  period: 'weekly' | 'monthly';
  target: number;
  periodKey?: string;
}
