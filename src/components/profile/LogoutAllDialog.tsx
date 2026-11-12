import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLogoutMutation } from '@/store/api/authApi';
import { useLogoutAllDevicesMutation } from '@/store/api/profileApi';
import { DRAFT_LOGOUT_SENTENCE } from '@/components/auth/useLogout';
import { hasTradeDrafts } from '@/lib/scope';
import { LOGGED_OUT_EVERYWHERE_URL } from './helpers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutAllDialog({ open, onOpenChange }: Props) {
  const [logoutAll, { isLoading }] = useLogoutAllDevicesMutation();
  const [clearLocal] = useLogoutMutation();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      await logoutAll().unwrap();
    } catch {
      setError("Couldn't log you out of your other devices. Check your connection and try again.");
      return;
    }
    await clearLocal().unwrap().catch(() => undefined);
    window.location.assign(LOGGED_OUT_EVERYWHERE_URL);
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!isLoading) { setError(null); onOpenChange(next); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out everywhere?</AlertDialogTitle>
          <AlertDialogDescription>You will need to log in again on every device, including this one.{hasTradeDrafts() ? ` ${DRAFT_LOGOUT_SENTENCE}` : ''}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={confirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading ? 'Logging out' : 'Log out everywhere'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
