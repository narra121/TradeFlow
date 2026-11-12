// Mirrors JournalAWSSetup src/app/types.ts and PLAN-BACKEND §4.I.1 (GET /me/entitlements, 402 bodies).

export type QuotaFeature = 'ai_extract' | 'ai_insight' | 'ai_chat' | 'broker_import';
export type GatedFeature = 'advanced_analytics' | 'tax_report' | 'unlimited_accounts' | 'auto_sync';
export type PlanName = 'free' | 'trial' | 'pro';

export interface Entitlements {
  plan: PlanName;
  status: string;
  /** ISO; present while trialing */
  trialEndsAt?: string;
  /** monthly allowance; null = unlimited */
  limits: Record<QuotaFeature, number | null>;
  features: Record<GatedFeature, boolean>;
}

export interface EntitlementsResponse {
  entitlements: Entitlements;
  usage: Record<QuotaFeature, number>;
  /** ISO; when the monthly counters reset */
  periodResetsAt: string;
  billingCurrency?: string;
  /** null = every account is writable */
  writableAccountIds?: string[] | null;
}

export type BillingInterval = 'month' | 'year';

export interface CheckoutRequest {
  interval: BillingInterval;
}

export interface BillingUrlResponse {
  url: string;
}
