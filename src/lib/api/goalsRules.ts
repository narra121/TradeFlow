import apiClient from './api';

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
}

export interface UpdateRulePayload {
  rule: string;
}

export const goalsApi = {
  // GET /v1/goals
  getGoals: async (): Promise<{ goals: Goal[] }> => {
    return apiClient.get('/goals');
  },

  // PUT /v1/goals/:id
  updateGoal: async (id: string, payload: UpdateGoalPayload): Promise<{ goal: Goal }> => {
    return apiClient.put(`/goals/${id}`, payload);
  },
};

export const rulesApi = {
  // GET /v1/rules
  getRules: async (): Promise<{ rules: TradingRule[] }> => {
    return apiClient.get('/rules');
  },

  // POST /v1/rules
  createRule: async (payload: CreateRulePayload): Promise<{ rule: TradingRule }> => {
    return apiClient.post('/rules', payload);
  },

  // PUT /v1/rules/:id
  updateRule: async (id: string, payload: UpdateRulePayload): Promise<{ rule: TradingRule }> => {
    return apiClient.put(`/rules/${id}`, payload);
  },

  // PATCH /v1/rules/:id/toggle
  toggleRule: async (id: string): Promise<{ rule: TradingRule }> => {
    return apiClient.patch(`/rules/${id}/toggle`);
  },

  // DELETE /v1/rules/:id
  deleteRule: async (id: string): Promise<void> => {
    return apiClient.delete(`/rules/${id}`);
  },
};

// Combined API for fetching both rules and goals in one request
export const goalsRulesApi = {
  // GET /v1/rules-goals
  getRulesAndGoals: async (): Promise<{ 
    rules: TradingRule[]; 
    goals: Goal[];
    meta: {
      rulesCount: number;
      goalsCount: number;
    };
  }> => {
    return apiClient.get('/rules-goals');
  },
};
