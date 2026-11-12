import { useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAuthArrival } from '@/components/auth/useAuthArrival';
import { useAppSelector } from '@/store/hooks';

export function SignupPage() {
  const navigate = useNavigate();
  const { destination } = useAuthArrival();
  const startedLoggedIn = useRef(useAppSelector((state) => state.auth.isAuthenticated)).current;

  const handleAuthSuccess = useCallback(() => {
    navigate(destination, { replace: true });
  }, [navigate, destination]);

  if (startedLoggedIn) return <Navigate to={destination} replace />;

  return <AuthPage initialView="signup" onLogin={handleAuthSuccess} />;
}
