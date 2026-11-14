import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useLogoutEverywhereMutation } from '@/store/api/authApi';
import { DRAFT_LOGOUT_SENTENCE } from '@/components/auth/useLogout';
import { hasTradeDrafts } from '@/lib/scope';
import { readApiError } from '@/lib/apiError';
import { LOGGED_OUT_EVERYWHERE_URL } from '@/components/auth/loggingOut';
import { isOAuthSession } from '@/lib/auth/storedSession';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutAllDialog({ open, onOpenChange }: Props) {
  const [logoutAll, { isLoading }] = useLogoutEverywhereMutation();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    // Read before signing out, which removes the flag. A Google session is already on its way to Cognito's logout page, which returns to this same URL.
    const leaving = isOAuthSession();
    try {
      await logoutAll().unwrap();
    } catch (err) {
      setError(readApiError(err, "Couldn't log you out of your other devices.").message);
      return;
    }
    if (!leaving) window.location.assign(LOGGED_OUT_EVERYWHERE_URL);
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
