import { Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { SEO } from '@/components/SEO';
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

  return (
    <>
      <SEO title="Login - TradeQut" description="Sign in to your TradeQut trading journal." path="/login" noindex />
      <AuthPage initialView="login" onLogin={handleAuthSuccess} />
    </>
  );
}
