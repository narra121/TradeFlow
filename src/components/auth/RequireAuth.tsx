import { Navigate, useLocation } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { useAppSelector } from '@/store/hooks';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to the login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <SEO title="TradeQut" description="TradeQut trading journal application." path="/app" noindex />
      {children}
    </>
  );
}
