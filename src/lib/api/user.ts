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
  subscriptionId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  planId?: string;
  status: 'created' | 'trial' | 'active' | 'paused' | 'past_due' | 'cancellation_requested' | 'cancelled' | 'completed';
  paidCount?: number;
  remainingCount?: number;
  currentStart?: string;
  currentEnd?: string;
  chargeAt?: string;
  endedAt?: string;
  cancelAt?: string;
  trialEnd?: string;
  trialStarted?: string;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateSubscriptionPayload {
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}
