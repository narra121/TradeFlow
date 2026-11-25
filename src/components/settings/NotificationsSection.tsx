import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Row, SaveStatus, SectionHeading } from '@/components/settings/primitives';
import { useSaveState } from '@/components/settings/useSaveState';
import { usePreferences } from '@/components/settings/usePreferences';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useUpdateNotificationsMutation } from '@/store/api/userApi';

/** Account emails are always on and stated as such. The weekly report is part of Pro; the getting-started emails can be switched off on every plan (E-066, D.15). */
export function NotificationsSection() {
  const { prefs, isLoading } = usePreferences();
  const ent = useEntitlements();
  const [update] = useUpdateNotificationsMutation();
  const status = useSaveState();
  const [local, setLocal] = useState<boolean | null>(null);
  const [localTips, setLocalTips] = useState<boolean | null>(null);
  if (isLoading || ent.isLoading) return <Skeleton className="h-32" />;

  const weekly = local ?? prefs?.notifications?.weeklyReport ?? true;
  const canUse = ent.isPro;
  // `tradeReminders` is the flag the backend's daily mail job reads before it sends a getting-started mail (JournalAWSSetup src/handlers/lifecycle-emails/app.ts).
  const tips = localTips ?? prefs?.notifications?.tradeReminders ?? true;

  return (
    <section aria-labelledby="notif-h">
      <SectionHeading id="notif-h" title="Notifications" />
      <Row label="Account emails" helper="Receipts, password codes, payment problems and trial reminders are always on.">
        <p className="pt-1.5 text-sm text-muted-foreground">Always on</p>
      </Row>
      <Row label="Weekly report" helper={canUse ? 'A summary of your week by email.' : 'The weekly report is part of Pro.'} htmlFor="wr">
        <Switch
          id="wr"
          checked={canUse && weekly}
          disabled={!canUse}
          onCheckedChange={(v) => {
            setLocal(v);
            void status.run(() => update({ weeklyReport: v }).unwrap(), () => setLocal(!v));
          }}
        />
      </Row>
      <Row label="Getting-started emails" helper="A few how-to emails in your first week." htmlFor="gs">
        <Switch
          id="gs"
          checked={tips}
          onCheckedChange={(v) => {
            setLocalTips(v);
            void status.run(() => update({ tradeReminders: v }).unwrap(), () => setLocalTips(!v));
          }}
        />
      </Row>
      <SaveStatus state={status.state} reason={status.reason} />
    </section>
  );
}
