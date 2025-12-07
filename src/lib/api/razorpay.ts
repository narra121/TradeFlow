import apiClient from './api';

// One-time payment interfaces
export interface CreateOrderPayload {
  amount: number;
  currency?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  message: string;
  paymentId: string;
  orderId: string;
}

// Subscription interfaces
export interface CreatePlanPayload {
  name: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  currency?: string;
  description?: string;
}

export interface PlanResponse {
  planId: string;
  name: string;
  period: string;
  tier?: string;
  interval: number;
  amount: number;
  currency: string;
  description?: string;
  savings?: string;
  monthlyEquivalent?: number;
}

export interface CreateSubscriptionPayload {
  planId: string;
  totalCount?: number;
  quantity?: number;
  startAt?: number;
  customerNotify?: number;
  notes?: Record<string, string>;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  planId: string;
  status: string;
  shortUrl: string;
  authAttempts: number;
}

export interface ManageSubscriptionPayload {
  action?: 'pause' | 'resume';
  pauseAt?: string | number;
  resumeAt?: string | number;
  cancelAtCycleEnd?: boolean;
}

export interface SubscriptionDetails {
  userId: string;
  subscriptionId: string;
  planId: string;
  status: string;
  paidCount: number;
  remainingCount?: number;
  currentStart?: string;
  currentEnd?: string;
  chargeAt?: string;
  endedAt?: string;
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

export const razorpayApi = {
  // One-time payments (legacy)
  createOrder: async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
    const response: any = await apiClient.post('/payments/create-order', payload);
    return response as CreateOrderResponse;
  },

  verifyPayment: async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
    const response: any = await apiClient.post('/payments/verify', payload);
    return response as VerifyPaymentResponse;
  },

  // Subscription plans
  getPlans: async (): Promise<{ plans: PlanResponse[] }> => {
    const response: any = await apiClient.get('/subscriptions/plans');
    return response;
  },

  createPlan: async (payload: CreatePlanPayload): Promise<PlanResponse> => {
    const response: any = await apiClient.post('/subscriptions/plans', payload);
    return response as PlanResponse;
  },

  // Subscription management
  createSubscription: async (
    payload: CreateSubscriptionPayload
  ): Promise<CreateSubscriptionResponse> => {
    const response: any = await apiClient.post('/subscriptions', payload);
    return response as CreateSubscriptionResponse;
  },

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

  cancelSubscription: async (
    cancelAtCycleEnd = false
  ): Promise<{ message: string; subscriptionId: string }> => {
    const response: any = await apiClient.delete('/subscriptions', {
      data: { cancelAtCycleEnd },
    });
    return response;
  },
};

