import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useProfile } from '@/hooks/useProfile';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { LogoutAllDialog } from './LogoutAllDialog';
import { SectionHeading, SettingRow } from './layout';

export function SecuritySection() {
  const { email, method, isLoading, isError, refetch } = useProfile();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-40" aria-label="Loading sign-in settings" />;
  if (isError) return <ErrorState title="Couldn't load your sign-in settings" description="Check your connection and try again." onRetry={refetch} />;

  return (
    <section aria-labelledby="security-heading">
      <SectionHeading id="security-heading" title="Sign-in & security" />
      <SettingRow label="Sign-in method">
        <p className="pt-1.5 text-sm">{method === 'google' ? 'Google' : 'Email and password'}</p>
      </SettingRow>
      <SettingRow label="Password" helper={method === 'password' ? 'We email a code to confirm it is you.' : undefined}>
        {method === 'google' ? (
          <p className="pt-1.5 text-sm text-muted-foreground">You sign in with Google. Your password is managed by Google.</p>
        ) : (
          <Button type="button" variant="outline" onClick={() => setPasswordOpen(true)} disabled={!email}>Change password</Button>
        )}
      </SettingRow>
      <SettingRow label="Sessions" helper="Log out everywhere, including this device. Use this if you lost a device or signed in on a shared one.">
        <Button type="button" variant="outline" onClick={() => setLogoutOpen(true)}>Log out of all devices</Button>
      </SettingRow>

      <ChangePasswordDialog open={passwordOpen} email={email} onOpenChange={setPasswordOpen} />
      <LogoutAllDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </section>
  );
}
