import { useCallback, useEffect, useState } from 'react';
import { getIdToken } from '@/lib/auth/authService';
import { decodeClaims, readStoredIdToken } from '@/lib/auth/storedSession';
import { useGetProfileQuery, useUpdateProfileMutation } from '@/store/api/userApi';

export type SignInMethod = 'google' | 'password';

export const NAME_MAX_LENGTH = 60;

/** Google users carry an `identities` claim or a `Google_` Cognito username. */
export function signInMethodFromToken(idToken: string | null | undefined): SignInMethod {
  const payload = decodeClaims(idToken);
  const identities = payload?.identities;
  if (identities?.some((i) => i.providerName?.toLowerCase() === 'google')) return 'google';
  return String(payload?.['cognito:username'] ?? '').toLowerCase().startsWith('google_') ? 'google' : 'password';
}

export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'Enter the name you want us to use.';
  if (name.length > NAME_MAX_LENGTH) return `Use ${NAME_MAX_LENGTH} characters or fewer.`;
  return null;
}

/**
 * The signed-in user's name, email and sign-in method. `hasName` is false until a name is saved, so onboarding
 * can ask "What should we call you?" and store the answer through `saveName`.
 */
export function useProfile() {
  const { data, isLoading, isError, error, refetch } = useGetProfileQuery();
  const [update, { isLoading: isSaving }] = useUpdateProfileMutation();

  // updateProfile invalidates the profile, and that refetch runs with the old ID token and returns the old name,
  // so the saved name is held locally until the server's copy differs from the one it replaced.
  const [saved, setSaved] = useState<{ name: string; replaced: string } | null>(null);
  const serverName = (data?.name ?? '').trim();
  useEffect(() => {
    if (saved && serverName !== saved.replaced) setSaved(null);
  }, [saved, serverName]);
  const name = saved?.name ?? serverName;
  const email = data?.email ?? '';
  const method = signInMethodFromToken(readStoredIdToken());

  const saveName = useCallback(
    async (next: string) => {
      const problem = validateName(next);
      if (problem) throw new Error(problem);
      await update({ name: next.trim() }).unwrap();
      setSaved({ name: next.trim(), replaced: serverName });
      // GET /user/profile reads `name` from the ID token claims (get-user-profile/app.ts), so the token must be reissued first.
      // The name is already saved: a failed reissue or refetch must not report the save as failed (`saved` keeps showing it).
      try {
        await getIdToken({ forceRefresh: true });
        await refetch();
      } catch {
        // the next profile load reads the new token
      }
    },
    [update, refetch, serverName],
  );

  return { name, email, method, hasName: name.length > 0, isLoading, isError, error, refetch, saveName, isSaving };
}
