import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LOGGED_OUT_URL, setLoggingOut } from '@/components/auth/loggingOut';
import { hasTradeDrafts } from '@/lib/scope';
import { useLogoutMutation } from '@/store/api';

export { LOGGED_OUT_URL };

export const DRAFT_LOGOUT_SENTENCE = "You have a trade that isn't saved yet. Logging out removes it from this browser.";

/**
 * `Log out` for the user menu and the command palette: clears the session and lands on the signed-out view. With an unsaved trade
 * draft in this tab it asks once first; render `dialog` next to the control that calls `requestLogout`.
 */
export function useLogout(): { requestLogout: () => void; dialog: JSX.Element } {
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const [asking, setAsking] = useState(false);
  const keepEditing = useRef<HTMLButtonElement>(null);

  const logOutNow = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout().unwrap();
      navigate(LOGGED_OUT_URL, { replace: true });
    } catch {
      // toastMiddleware reports the failure
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  const requestLogout = useCallback(() => {
    if (hasTradeDrafts()) setAsking(true);
    else void logOutNow();
  }, [logOutNow]);

  const dialog = (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          // The menu that started the log out returns focus to its trigger as it closes; take it back for the safe choice.
          window.setTimeout(() => keepEditing.current?.focus(), 0);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Log out and discard your unsaved trade?</AlertDialogTitle>
          <AlertDialogDescription>{DRAFT_LOGOUT_SENTENCE}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={keepEditing}>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={() => void logOutNow()}>Log out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestLogout, dialog };
}
