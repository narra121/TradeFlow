import { Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { SEO } from '@/components/SEO';
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

  return (
    <>
      <SEO title="Sign Up for TradeQut - Free Trading Journal" description="Create your free TradeQut account." path="/signup" />
      <AuthPage initialView="signup" onLogin={handleAuthSuccess} />
    </>
  );
}
