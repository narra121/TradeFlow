import type { UsageRow } from '@/hooks/useEntitlements';
import {
  FREE_ACCOUNTS,
  FREE_AI_EXTRACTIONS,
  FREE_AI_REPORTS,
  FREE_BROKER_IMPORTS,
  FREE_CHAT_MESSAGES,
} from '@/components/billing/freeLimits';

interface WhatChangesProps {
  /** `trial` = what will change; `ended` = what changed. */
  mode: 'trial' | 'ended';
  /** Day the trial ends, already formatted (`20 Nov`). */
  moveDate?: string;
  accountCount: number;
  usage: UsageRow[];
}

/** Built from the user's own usage and the Free limits (SC §8.2): what they keep, what is limited, what is not included. */
export function WhatChanges({ mode, moveDate, accountCount, usage }: WhatChangesProps) {
  const future = mode === 'trial';
  const title = future ? `If you move to Free${moveDate ? ` on ${moveDate}` : ''}` : 'What changed on Free';
  const keep = 'all your trades, the journal, calendar, dashboard, goals and export';
  const imports = usage.find((u) => u.feature === 'broker_import')?.used ?? 0;
  const limited = [
    accountCount > FREE_ACCOUNTS ? `${FREE_ACCOUNTS} accounts (you have ${accountCount}; you choose which stay writable)` : `${FREE_ACCOUNTS} accounts`,
    `${FREE_BROKER_IMPORTS} broker imports a month${imports ? ` (you used ${imports})` : ''}`,
    `${FREE_AI_EXTRACTIONS} AI extractions`,
    `${FREE_AI_REPORTS} AI report`,
    `${FREE_CHAT_MESSAGES} chat messages`,
  ];
  return (
    <section aria-labelledby="what-changes-h" className="rounded-lg border border-border bg-card p-4">
      <h3 id="what-changes-h" className="text-sm font-semibold">{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-13 sm:grid-cols-[110px_minmax(0,1fr)]">
        <dt className="text-muted-foreground">{future ? 'You keep' : 'You kept'}</dt>
        <dd>{keep}</dd>
        <dt className="text-muted-foreground">Limited to</dt>
        <dd>{limited.join(' · ')}</dd>
        <dt className="text-muted-foreground">Not included</dt>
        <dd>Edge, Timing and Risk analytics · the weekly AI report</dd>
      </dl>
    </section>
  );
}
