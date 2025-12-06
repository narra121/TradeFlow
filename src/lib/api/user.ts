import apiClient from './api';

export interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    preferences: {
      darkMode: boolean;
      currency: string;
      timezone: string;
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

export interface CreateSubscriptionPayload {
  amount: number;
  billingCycle: 'monthly' | 'annual';
}

export interface SavedOptions {
  userId: string;
  symbols: string[];
  strategies: string[];
  sessions: string[];
  marketConditions: string[];
  newsEvents: string[];
  mistakes: string[];
  lessons: string[];
  timeframes: string[];
}

export interface AddOptionPayload {
  value: string;
}

export const userApi = {
  // GET /v1/user/profile
  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get('/user/profile');
  },

  // PUT /v1/user/profile
  updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    return apiClient.put('/user/profile', payload);
  },

  // PUT /v1/user/preferences
  updatePreferences: async (payload: UpdatePreferencesPayload): Promise<UserProfile> => {
    return apiClient.put('/user/preferences', payload);
  },

  // PUT /v1/user/notifications
  updateNotifications: async (payload: UpdateNotificationsPayload): Promise<UserProfile> => {
    return apiClient.put('/user/notifications', payload);
  },
};

export const subscriptionsApi = {
  // GET /v1/subscriptions
  getSubscription: async (): Promise<{ subscription: Subscription }> => {
    return apiClient.get('/subscriptions');
  },

  // POST /v1/subscriptions
  createSubscription: async (payload: CreateSubscriptionPayload): Promise<{ subscription: Subscription; paymentUrl: string }> => {
    return apiClient.post('/subscriptions', payload);
  },

  // DELETE /v1/subscriptions
  cancelSubscription: async (): Promise<void> => {
    return apiClient.delete('/subscriptions');
  },
};

export const optionsApi = {
  // GET /v1/options
  getOptions: async (): Promise<SavedOptions> => {
    return apiClient.get('/options');
  },

  // POST /v1/options/:category
  addOption: async (category: string, payload: AddOptionPayload): Promise<SavedOptions> => {
    return apiClient.post(`/options/${category}`, payload);
  },
};

export const exportApi = {
  // GET /v1/export/trades
  exportTrades: async (format: 'csv' | 'json', accountId?: string): Promise<Blob> => {
    const response: any = await apiClient.get('/export/trades', {
      params: { format, accountId },
      responseType: 'blob',
    });
    return response as Blob;
  },
};
