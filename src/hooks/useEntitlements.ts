import { useMemo } from 'react';
import { useGetEntitlementsQuery } from '@/store/api/billingApi';
import type { Entitlements, GatedFeature, PlanName, QuotaFeature } from '@/types/entitlements';

/** Billing facts the server adds to `entitlements` (BE-E5); each is absent until the record carries it. */
export interface BillingFacts {
  status?: 'free' | 'trialing' | 'active' | 'past_due' | 'canceling';
  interval?: 'month' | 'year';
  /** Major units (79 = $79). */
  amount?: number;
  currency?: string;
  renewsAt?: string;
  endsAt?: string;
  trialEndedAt?: string;
  legacyPrice?: boolean;
}

export interface UsageRow {
  feature: QuotaFeature;
  used: number;
  limit: number | null;
  /** 0..1, or null when unlimited. */
  ratio: number | null;
}

export interface EntitlementsView {
  isLoading: boolean;
  isError: boolean;
  plan: PlanName | null;
  /** Pro features are on (Pro or trialing). */
  isPro: boolean;
  isTrial: boolean;
  /** Whole days left in the trial, 0 on the last day. */
  trialDaysLeft: number | null;
  trialEndsAt?: string;
  periodResetsAt?: string;
  currency: 'USD' | 'INR';
  usage: UsageRow[];
  can: (feature: GatedFeature) => boolean;
  /** The quota closest to its limit, for the plan card. */
  tightest: UsageRow | null;
  status?: string;
  interval?: BillingFacts['interval'];
  amount?: number;
  /** ISO code the subscription is billed in; `currency` above is the billing currency for prices. */
  amountCurrency?: string;
  renewsAt?: string;
  endsAt?: string;
  trialEndedAt?: string;
  legacyPrice?: boolean;
  entitlements?: Entitlements;
  writableAccountIds: string[] | null;
  refetch: () => void;
}

export const QUOTA_LABEL: Record<QuotaFeature, string> = {
  ai_extract: 'AI extractions',
  broker_import: 'Broker imports',
  ai_insight: 'AI reports',
  ai_chat: 'AI chat messages',
};

export function daysLeft(iso: string | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

/** One definition of "is Pro" for every screen: the server's entitlements, never the legacy subscription. */
export function useEntitlements(): EntitlementsView {
  const { data, isLoading, isError, refetch } = useGetEntitlementsQuery();

  return useMemo<EntitlementsView>(() => {
    const e = data?.entitlements;
    const facts: BillingFacts = (e as (Entitlements & BillingFacts) | undefined) ?? {};
    const usage: UsageRow[] = e
      ? (Object.keys(QUOTA_LABEL) as QuotaFeature[]).map((feature) => {
          const used = data?.usage?.[feature] ?? 0;
          const limit = e.limits[feature];
          return { feature, used, limit, ratio: limit === null || limit === undefined || limit === 0 ? null : Math.min(1, used / limit) };
        })
      : [];
    const tightest = usage.filter((u) => u.ratio !== null).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0] ?? null;
    return {
      isLoading,
      isError,
      plan: e?.plan ?? null,
      isPro: e?.plan === 'pro' || e?.plan === 'trial',
      isTrial: e?.plan === 'trial',
      trialDaysLeft: e?.plan === 'trial' ? daysLeft(e.trialEndsAt) : null,
      trialEndsAt: e?.trialEndsAt,
      periodResetsAt: data?.periodResetsAt,
      currency: data?.billingCurrency === 'INR' ? 'INR' : 'USD',
      usage,
      can: (feature) => !!e?.features?.[feature],
      tightest,
      status: e?.status,
      interval: facts.interval,
      amount: facts.amount,
      amountCurrency: facts.currency,
      renewsAt: facts.renewsAt,
      endsAt: facts.endsAt,
      trialEndedAt: facts.trialEndedAt,
      legacyPrice: facts.legacyPrice,
      entitlements: e,
      writableAccountIds: data?.writableAccountIds ?? null,
      refetch: () => void refetch(),
    };
  }, [data, isLoading, isError, refetch]);
}
