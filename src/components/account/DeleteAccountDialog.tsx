import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { returnFocusByName } from '@/components/account/returnFocus';
import type { TradingAccount } from '@/types/trade';

interface DeleteAccountDialogProps {
  account: TradingAccount | null;
  /** Trades in the account; null when not known (the loader is capped). */
  tradeCount: number | null;
  busy: boolean;
  error?: string | null;
  /** Accessible name of the row's actions button, which gets focus back when the dialog closes. */
  returnFocusTo?: string;
  onCancel: () => void;
  onMarkInactive: () => void;
  onConfirm: () => void;
}

/** The delete cascades to every trade, so the dialog says how many, offers `Mark inactive instead`, and asks for the name when trades exist. */
export function DeleteAccountDialog({ account, tradeCount, busy, error, returnFocusTo, onCancel, onMarkInactive, onConfirm }: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState('');
  useEffect(() => setTyped(''), [account?.id]);
  const needsName = tradeCount === null || tradeCount > 0;
  const matches = !needsName || typed.trim().toLowerCase() === (account?.name ?? '').trim().toLowerCase();
  const trades = tradeCount === null ? 'all of its trades' : `its ${tradeCount.toLocaleString('en-US')} ${tradeCount === 1 ? 'trade' : 'trades'}`;

  return (
    <AlertDialog open={!!account} onOpenChange={(o) => !o && !busy && onCancel()}>
      <AlertDialogContent
        onCloseAutoFocus={(e) => returnFocusByName(returnFocusTo, e)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {account?.name}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently deletes the account and {trades}. It cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {account?.status !== 'inactive' && (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onMarkInactive} disabled={busy}>Mark inactive instead</Button>
          </div>
        )}
        {needsName && (
          <div className="space-y-1.5">
            <Label htmlFor="delete-account-name">Type {account?.name} to confirm</Label>
            <Input id="delete-account-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" disabled={busy} />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} autoFocus>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy || !matches}>{busy ? 'Deleting…' : 'Delete account'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
