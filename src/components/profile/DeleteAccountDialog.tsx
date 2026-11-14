import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useClearDeletedSessionMutation } from '@/store/api/authApi';
import { useDeleteUserAccountMutation } from '@/store/api/profileApi';
import { readApiError } from '@/lib/apiError';
import { emailMatches } from './helpers';
import type { ExportState } from './useDataExport';

interface Props {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  exportState: ExportState;
  onExport: () => void;
}

export function DeleteAccountDialog({ open, email, onOpenChange, exportState, onExport }: Props) {
  const [deleteUserAccount, { isLoading }] = useDeleteUserAccountMutation();
  const [clearLocal] = useClearDeletedSessionMutation();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (isLoading) return;
    if (!next) {
      setTyped('');
      setError(null);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!emailMatches(typed, email)) return;
    setError(null);
    try {
      await deleteUserAccount().unwrap();
    } catch (err) {
      setError(readApiError(err, "Couldn't delete your account. Nothing was removed.").message);
      return;
    }
    await clearLocal().unwrap().catch(() => undefined);
    window.location.assign('/goodbye');
  };

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your TradeQut account?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes your journal, screenshots, AI reports and billing profile, and cancels Pro. It cannot be undone. Backups keep data for up to 35 days before it is gone everywhere.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {exportState.status === 'ready' ? (
            <a href={exportState.url} download={exportState.fileName} className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download export ({exportState.size})
            </a>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onExport} disabled={exportState.status === 'preparing' || isLoading}>
              {exportState.status === 'preparing' && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {exportState.status === 'preparing' ? 'Preparing your export…' : 'Export my data first'}
            </Button>
          )}
          {exportState.status === 'error' && <span role="alert" className="text-xs text-error">{exportState.message}</span>}
        </div>

        <Field label={`Type ${email} to confirm`}>
          {(a) => (
            <Input
              {...a}
              value={typed}
              disabled={isLoading}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
            />
          )}
        </Field>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel autoFocus disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={confirm} disabled={!emailMatches(typed, email) || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading ? 'Deleting account' : 'Delete account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
