import { useCallback, useRef } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { LoggedOutView } from '@/components/auth/LoggedOutView';
import { useAuthArrival } from '@/components/auth/useAuthArrival';
import { useAppSelector } from '@/store/hooks';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { destination } = useAuthArrival();
  // Only a visit that starts logged in is redirected; a login made on this page is routed by `onLogin`.
  const startedLoggedIn = useRef(useAppSelector((state) => state.auth.isAuthenticated)).current;

  const handleAuthSuccess = useCallback(() => {
    navigate(destination, { replace: true });
  }, [navigate, destination]);

  if (startedLoggedIn) return <Navigate to={destination} replace />;

  if (params.get('view') === 'logged-out' || params.get('reason') === 'logged-out-everywhere') {
    return <LoggedOutView everywhere={params.get('scope') === 'all' || params.get('reason') === 'logged-out-everywhere'} />;
  }

  return <AuthPage initialView="login" onLogin={handleAuthSuccess} />;
}
