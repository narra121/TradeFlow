import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { SUPPORT_EMAIL } from '@/content/product-facts';
import { collectDiagnostics, supportMailto } from './diagnostics';

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Contact support: the support address as a mailto link with the subject and app version filled in. No promised response time. */
export function ContactSupportDialog({ open, onOpenChange }: ContactSupportDialogProps) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (open) setMessage('');
  }, [open]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast('Address copied');
    } catch {
      toast(`Write to ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Write to <a className="underline underline-offset-2" href={supportMailto('support', '', collectDiagnostics())}>{SUPPORT_EMAIL}</a>. The email includes your app version and the page you are on, never your trades.
          </DialogDescription>
        </DialogHeader>
        <Field label="What do you need help with?" hint="Optional. It is added to the email so you do not have to retype it.">
          {(a) => <Textarea {...a} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />}
        </Field>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={copyAddress}>Copy address</Button>
          <Button asChild>
            <a href={supportMailto('support', message, collectDiagnostics())} onClick={() => onOpenChange(false)}>Open email</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
