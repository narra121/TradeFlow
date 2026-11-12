import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PASSWORD_RULES, unmetRules } from '@/components/auth/passwordRules';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/store/api/authApi';

import { passwordErrorMessage } from './helpers';

type Step = 'send' | 'code' | 'done';

interface Props {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
}

/** Cognito code flow: email a code, then set the new password with it. */
export function ChangePasswordDialog({ open, email, onOpenChange }: Props) {
  const [forgot, { isLoading: sending }] = useForgotPasswordMutation();
  const [reset, { isLoading: saving }] = useResetPasswordMutation();
  const [step, setStep] = useState<Step>('send');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setStep('send');
      setCode('');
      setPassword('');
      setError(null);
      setCodeError(undefined);
      setPasswordError(undefined);
    }
  };

  const sendCode = async () => {
    setError(null);
    try {
      await forgot({ email }).unwrap();
      setStep('code');
    } catch (err) {
      setError(passwordErrorMessage(err));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const badCode = code.length === 6 ? undefined : 'Enter the 6-digit code from your email.';
    const missing = unmetRules(password);
    const badPassword = missing.length ? `Add: ${missing.map((r) => r.label.toLowerCase()).join(', ')}.` : undefined;
    setCodeError(badCode);
    setPasswordError(badPassword);
    setError(null);
    if (badCode || badPassword) return;
    try {
      await reset({ email, code, newPassword: password }).unwrap();
      setPassword('');
      setCode('');
      setStep('done');
    } catch (err) {
      setError(passwordErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            {step === 'send' && `We email a code to ${email} to confirm it is you.`}
            {step === 'code' && `Enter the code we sent to ${email} and choose a new password.`}
            {step === 'done' && 'Password changed. Other devices stay signed in.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'send' && (
          <>
            {error && <p role="alert" className="text-sm text-error">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button type="button" onClick={sendCode} disabled={sending || !email}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {sending ? 'Sending code' : 'Send code'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'code' && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Code from your email" error={codeError} required>
              {(a) => (
                <Input
                  {...a}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    setCodeError(undefined);
                  }}
                />
              )}
            </Field>
            <Field label="New password" error={passwordError} required>
              {(a) => (
                <Input
                  {...a}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(undefined);
                  }}
                />
              )}
            </Field>
            <ul aria-label="Password requirements" className="space-y-0.5 text-xs">
              {PASSWORD_RULES.map((r) => {
                const met = r.test(password);
                return (
                  <li key={r.id} className={met ? 'text-profit' : 'text-muted-foreground'}>
                    {r.label}
                    <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
                  </li>
                );
              })}
            </ul>
            {error && <p role="alert" className="text-sm text-error">{error}</p>}
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="link" className="px-0" onClick={sendCode} disabled={sending}>Send a new code</Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {saving ? 'Changing password' : 'Change password'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}

        {step === 'done' && (
          <DialogFooter>
            <Button type="button" onClick={() => close(false)} autoFocus>Done</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
