import { formatDay } from '@/components/billing/planState';
import { PLAN_LIMITS } from '@/content/product-facts';
import type { PlanSignal } from '@/lib/planErrors';

/** What the limit counts, plural, and the plan-table row that states what Pro gives for it. */
const QUOTA_FEATURES: Record<string, { noun: string; row: string }> = {
  ai_extract: { noun: 'AI extractions', row: 'AI extraction' },
  ai_insight: { noun: 'AI reports', row: 'AI reports' },
  ai_chat: { noun: 'AI chat messages', row: 'AI Chat' },
  broker_import: { noun: 'broker imports', row: 'Broker file imports' },
};

/** Gated features: the name as a sentence start and the question it answers. */
const PLAN_FEATURES: Record<string, { name: string; answers: string }> = {
  advanced_analytics: { name: 'Advanced analytics', answers: 'See results by setup, session, mistake cost and time of day.' },
  tax_report: { name: 'The tax report', answers: 'See charges and tax P&L in one report.' },
  auto_sync: { name: 'Automatic broker sync', answers: 'Pull trades from your broker without files.' },
};

function proIncludes(row: string): string {
  const text = PLAN_LIMITS.find((r) => r.feature.startsWith(row))?.pro;
  return text ? `Pro includes ${text.charAt(0).toLowerCase()}${text.slice(1)}.` : '';
}

/**
 * Copy per feature from the 402 payload: what was used, when it resets, what Pro gives (E-070, D.5).
 * `proEnded`: the user is read-only because a Pro plan ended (entitlements `proEndedAt`), not a trial.
 */
export function describePlanSignal(signal: PlanSignal, { proEnded = false }: { proEnded?: boolean } = {}): { title: string; body: string } {
  if (signal.code === 'TRIAL_EXPIRED') {
    return { title: proEnded ? 'Your Pro plan has ended' : 'Your free trial has ended', body: 'Your trades are safe, and you can still view and export them. Upgrade to Pro to add, edit or delete.' };
  }
  if (signal.code === 'PLAN_REQUIRED') {
    const f = signal.feature ? PLAN_FEATURES[signal.feature] : undefined;
    if (f) return { title: `${f.name} is part of Pro`, body: f.answers };
    return { title: 'This is part of Pro', body: signal.message };
  }
  const q = signal.feature ? QUOTA_FEATURES[signal.feature] : undefined;
  if (!q || signal.limit === undefined) return { title: 'You reached your monthly limit', body: signal.message };
  const reset = signal.resetsAt ? `Resets ${formatDay(signal.resetsAt, false)}. ` : '';
  return { title: `You have used ${signal.limit} of ${signal.limit} ${q.noun} this month`, body: `${reset}${proIncludes(q.row)}`.trim() };
}
