import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { setGoogleAuth } from '@/store/slices/authSlice';
import { Loader2 } from 'lucide-react';

const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN || '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDesc || errorParam);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    exchangeCodeForTokens(code);
  }, []);

  const exchangeCodeForTokens = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const res = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: COGNITO_CLIENT_ID,
          redirect_uri: redirectUri,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error_description || errData.error || 'Token exchange failed');
      }

      const data = await res.json();

      // Store tokens in localStorage before dispatching
      localStorage.setItem('idToken', data.id_token);
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      // Decode user info from id_token
      const payload = JSON.parse(atob(data.id_token.split('.')[1]));

      dispatch(setGoogleAuth({
        user: {
          id: payload.sub,
          name: payload.name || payload['cognito:username'] || '',
          email: payload.email || '',
        },
        token: data.id_token,
        refreshToken: data.refresh_token || null,
      }));

      navigate('/app', { replace: true });
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      setError(err.message || 'Failed to complete sign-in');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <p className="text-destructive text-lg">Sign-in failed</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-primary hover:underline text-sm"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}
