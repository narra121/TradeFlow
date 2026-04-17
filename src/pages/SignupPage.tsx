import { Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAppSelector } from '@/store/hooks';

export function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleAuthSuccess = () => {
    navigate('/app');
  };

  return <AuthPage initialView="signup" onLogin={handleAuthSuccess} />;
}
