import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Row, SaveStatus, SectionHeading } from '@/components/settings/primitives';
import { useSaveState } from '@/components/settings/useSaveState';
import { usePreferences } from '@/components/settings/usePreferences';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useUpdateNotificationsMutation } from '@/store/api/userApi';

/** Account emails are always on and stated as such; the only switch is the weekly report, which is part of Pro (E-066, D.15). */
export function NotificationsSection() {
  const { prefs, isLoading } = usePreferences();
  const ent = useEntitlements();
  const [update] = useUpdateNotificationsMutation();
  const status = useSaveState();
  const [local, setLocal] = useState<boolean | null>(null);
  if (isLoading || ent.isLoading) return <Skeleton className="h-32" />;

  const weekly = local ?? prefs?.notifications?.weeklyReport ?? true;
  const canUse = ent.isPro;

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
      <SaveStatus state={status.state} />
    </section>
  );
}
