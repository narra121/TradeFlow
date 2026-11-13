// `GET /subscriptions/plans` (public): what Stripe actually charges for each plan.
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
