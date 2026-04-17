import { Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAppSelector } from '@/store/hooks';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Already logged in — redirect to app immediately
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleAuthSuccess = () => {
    navigate('/app');
  };

  return <AuthPage initialView="login" onLogin={handleAuthSuccess} />;
}
