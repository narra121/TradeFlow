import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { SUPPORT_EMAIL } from '@/content/product-facts';
import { collectDiagnostics, KIND_LABEL, MAX_MESSAGE, openMail, supportMailto, type MessageKind } from './diagnostics';
import { sendFeedback } from './sendFeedback';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KINDS: MessageKind[] = ['problem', 'idea', 'other'];

/** Send feedback: Problem · Idea · Other, the text, and the page and browser details (never trade data). */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [kind, setKind] = useState<MessageKind>('idea');
  const [message, setMessage] = useState('');
  const [include, setInclude] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailFallback, setMailFallback] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage('');
      setError(null);
      setMailFallback(false);
      setBusy(false);
    }
  }, [open]);

  const diag = () => (include ? collectDiagnostics() : null);
  const tooLong = message.length > MAX_MESSAGE;
  const canSend = message.trim().length > 0 && !tooLong && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const outcome = await sendFeedback(kind, message, diag());
    setBusy(false);
    if (outcome === 'sent') {
      onOpenChange(false);
      toast('Feedback sent. Thank you');
    } else if (outcome === 'unavailable') {
      setMailFallback(true);
      openMail(supportMailto(kind, message, diag()));
    } else {
      setError('Couldn’t send your feedback. Check your connection and try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>Tell us what is broken, or what would make TradeQut better.</DialogDescription>
          </DialogHeader>
          <SegmentedControl label="Type of feedback" value={kind} onChange={(v) => setKind(v as MessageKind)} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
          <Field label="Your message" error={tooLong ? `Keep it under ${MAX_MESSAGE.toLocaleString()} characters.` : undefined} required>
            {(a) => <Textarea {...a} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />}
          </Field>
          <p className="text-right font-mono text-xs tabular-nums text-muted-foreground">{message.length.toLocaleString()} / {MAX_MESSAGE.toLocaleString()}</p>
          <label className="flex items-center gap-2 text-13">
            <Checkbox checked={include} onCheckedChange={(v) => setInclude(v === true)} />
            Include page and browser details
          </label>
          {error && <p role="alert" className="text-sm text-loss">{error}</p>}
          {mailFallback && (
            <p role="status" className="text-xs text-muted-foreground">
              Feedback is sent by email for now. Your email app should have opened addressed to {SUPPORT_EMAIL}; if not,{' '}
              <a className="underline" href={supportMailto(kind, message, diag())}>open the email</a>.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSend}>{busy ? 'Sending…' : 'Send feedback'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
