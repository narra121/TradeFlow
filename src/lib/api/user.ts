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
  subscriptionId: string;
  planId: string;
  status: 'created' | 'authenticated' | 'active' | 'paused' | 'pending' | 'halted' | 'cancellation_requested' | 'cancelled' | 'completed';
  paidCount: number;
  remainingCount?: number;
  totalCount?: number;
  authAttempts?: number;
  quantity?: number;
  paymentLink?: string;
  shortUrl?: string;
  currentStart?: string;
  currentEnd?: string;
  chargeAt?: string;
  startAt?: string;
  endAt?: string;
  cancelAt?: string;
  createdAt: string;
  updatedAt: string;
  razorpayDetails?: {
    status: string;
    paidCount: number;
    remainingCount?: number;
    currentStart?: number;
    currentEnd?: number;
    chargeAt?: number;
    endedAt?: number;
  };
}

export interface UserCreateSubscriptionPayload {
  planId: string;
  totalCount?: number;
  quantity?: number;
  customerNotify?: number;
}
