import { Navigate, useLocation } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAppSelector } from '@/store/hooks';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const hasToken = !isAuthenticated && !!localStorage.getItem('idToken');

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <SEO title="TradeQut" description="TradeQut trading journal application." path="/app" noindex />
      {children}
    </>
  );
}
