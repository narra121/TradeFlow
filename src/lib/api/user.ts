export interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    preferences: {
      darkMode: boolean;
      currency: string;
      timezone: string;
      carryForwardGoalsRules?: boolean;
      notifications: {
        tradeReminders: boolean;
        weeklyReport: boolean;
        goalAlerts: boolean;
      };
    };
  };
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface UpdatePreferencesPayload {
  darkMode?: boolean;
  currency?: 'USD' | 'EUR' | 'GBP';
  timezone?: string;
  carryForwardGoalsRules?: boolean;
}

export interface UpdateNotificationsPayload {
  tradeReminders?: boolean;
  weeklyReport?: boolean;
  goalAlerts?: boolean;
}

export interface Subscription {
  userId: string;
  status: 'active' | 'inactive' | 'cancelled';
  plan: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
}

export interface UserCreateSubscriptionPayload {
  amount: number;
  billingCycle: 'monthly' | 'annual';
}
