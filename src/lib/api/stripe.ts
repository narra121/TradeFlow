import apiClient from './api';

// Plan/Price interfaces
export interface PlanResponse {
  planId: string; // Stripe Price ID
  name: string;
  period: string; // 'monthly' | 'yearly'
  tier?: string;
  interval: number;
  amount: number;
  currency: string;
  description?: string;
  savings?: string;
  monthlyEquivalent?: number;
}

// Checkout session interfaces
export interface CreateCheckoutPayload {
  planId: string; // Stripe Price ID
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
  status: string;
}

// Subscription management interfaces
export interface ManageSubscriptionPayload {
  action?: 'pause' | 'resume';
  pauseAt?: string | number;
  resumeAt?: string | number;
  cancelAtCycleEnd?: boolean;
}

export interface SubscriptionDetails {
  userId: string;
  subscriptionId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  planId: string;
  status: string;
  paidCount: number;
  remainingCount?: number;
  currentStart?: string;
  currentEnd?: string;
  chargeAt?: string;
  endedAt?: string;
  cancelAt?: string;
  trialEnd?: string;
  trialStarted?: string;
  createdAt: string;
  updatedAt: string;
}

export const stripeApi = {
  // Subscription plans
  getPlans: async (currency?: string): Promise<{ plans: PlanResponse[] }> => {
    const query = currency ? `?currency=${currency}` : '';
    const response: any = await apiClient.get(`/subscriptions/plans${query}`);
    return response;
  },

  // Checkout session
  createCheckoutSession: async (
    payload: CreateCheckoutPayload
  ): Promise<CreateCheckoutResponse> => {
    const response: any = await apiClient.post('/subscriptions', payload);
    return response as CreateCheckoutResponse;
  },

  // Subscription management
  getSubscription: async (): Promise<SubscriptionDetails> => {
    const response: any = await apiClient.get('/subscriptions');
    return response as SubscriptionDetails;
  },

  pauseSubscription: async (pauseAt?: string | number): Promise<{ message: string }> => {
    const response: any = await apiClient.put('/subscriptions', {
      action: 'pause',
      pauseAt,
    });
    return response;
  },

  resumeSubscription: async (resumeAt?: string | number): Promise<{ message: string }> => {
    const response: any = await apiClient.put('/subscriptions', {
      action: 'resume',
      resumeAt,
    });
    return response;
  },
};
