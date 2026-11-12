import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NAME_MAX_LENGTH, useProfile, validateName } from '@/hooks/useProfile';
import { readApiError } from '@/lib/apiError';
import { SectionHeading, SettingRow } from './layout';

const SAVED_VISIBLE_MS = 5000;

export function ProfileSection() {
  const { name: saved, email, method, isLoading, isError, refetch, saveName, isSaving } = useProfile();
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setDraft(saved), [saved]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (isLoading) return <Skeleton className="h-40" aria-label="Loading your profile" />;
  if (isError) return <ErrorState title="Couldn't load your profile" description="Check your connection and try again." onRetry={refetch} />;

  const dirty = draft.trim() !== saved;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateName(draft);
    if (problem) return setError(problem);
    setError(null);
    try {
      await saveName(draft);
      setJustSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustSaved(false), SAVED_VISIBLE_MS);
    } catch (err) {
      setJustSaved(false);
      setError(readApiError(err, "Couldn't save your name. Check your connection and try again.").message);
    }
  };

  return (
    <section aria-labelledby="profile-heading">
      <SectionHeading id="profile-heading" title="Profile" />
      <SettingRow label="Name" labelFor="profile-name" helper="Shown in the user menu and in emails we send you." helperId="profile-name-help">
        <form onSubmit={submit} noValidate className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="profile-name"
              value={draft}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="name"
              aria-describedby={error ? 'profile-name-error profile-name-help' : 'profile-name-help'}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
                setJustSaved(false);
              }}
              className="max-w-xs"
            />
            <Button type="submit" variant="outline" disabled={!dirty || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSaving ? 'Saving' : 'Save'}
            </Button>
            {justSaved && (
              <span role="status" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-profit" aria-hidden="true" />
                Saved
              </span>
            )}
          </div>
          {error && <p id="profile-name-error" role="alert" className="text-xs text-error">{error}</p>}
        </form>
      </SettingRow>
      <SettingRow label="Email" helper="Your email is your log-in name. Changing it is not available yet.">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="pt-1.5 text-sm" data-testid="profile-email">{email}</p>
          <p className="text-xs text-muted-foreground">{method === 'google' ? 'Signs in with Google' : 'Signs in with email and password'}</p>
        </div>
      </SettingRow>
    </section>
  );
}
