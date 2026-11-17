import { keepReadOnly } from '@/components/billing/keepReadOnly';

interface WhatChangesProps {
  /** `trial` = what will change when the trial ends; `ended` = what read-only means now. */
  mode: 'trial' | 'ended';
  /** Day the trial ends, already formatted (`20 Nov`). */
  moveDate?: string;
}

/** What a user keeps and loses without Pro (SC §8.2): every read stays, every write needs Pro. */
export function WhatChanges({ mode, moveDate }: WhatChangesProps) {
  const future = mode === 'trial';
  const title = future ? `When your trial ends${moveDate ? ` on ${moveDate}` : ''}` : 'Your journal is read-only';
  return (
    <section aria-labelledby="what-changes-h" className="rounded-lg border border-border bg-card p-4">
      <h3 id="what-changes-h" className="text-sm font-semibold">{keepReadOnly(title)}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-13 sm:grid-cols-[110px_minmax(0,1fr)]">
        <dt className="text-muted-foreground">{future ? 'You keep' : 'You still can'}</dt>
        <dd>View every trade, the journal, calendar, dashboard, analytics, AI reports and chats, export your data and delete your account</dd>
        <dt className="text-muted-foreground">{future ? 'You lose' : 'You cannot'}</dt>
        <dd>Add, edit or delete trades, accounts, notes, goals and rules · import · new AI reports and chat messages</dd>
        <dt className="text-muted-foreground">With Pro</dt>
        <dd>Everything works again at once; nothing is lost in between</dd>
      </dl>
    </section>
  );
}
