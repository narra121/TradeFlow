import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { RequireAuth } from "./components/auth/RequireAuth";
import { HelmetProvider } from 'react-helmet-async';
import { discardSession, getIdToken, onSessionEnded } from '@/lib/auth/authService';
import { hasStoredSession, readStoredClaims } from '@/lib/auth/storedSession';
import { AnalyticsRoot } from '@/components/analytics';
import { ChunkErrorBoundary, PageLoadingFallback, ReloadGuardReset } from '@/appRoot/shared';
import { LandingPage, NotFound, PublicRoutes } from '@/PublicRoutes';
import { useHashScroll } from '@/components/public/useHashScroll';

// App and auth pages (the public pages live in PublicRoutes.tsx)
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  // The public pages also call it through PublicLayout; this covers login, signup and the app.
  useHashScroll();
  const dispatch = useAppDispatch();
  const isHandlingUnauthorized = useRef(false);

  useEffect(() => {
    // Listen for unauthorized events from API interceptor
    const handleUnauthorized = () => {
      // Prevent multiple simultaneous unauthorized handlers
      if (isHandlingUnauthorized.current) {
        return;
      }
      
      // Don't navigate if already on login page
      if (location.pathname === '/login') {
        return;
      }
      
      isHandlingUnauthorized.current = true;
      // Clear what is stored too, or a reload would start the full app on the same unusable session.
      void discardSession();
      dispatch(clearAuth());
      navigate('/login', { replace: true, state: { from: location, reason: 'session-ended' } });
      
      // Reset flag after navigation
      setTimeout(() => {
        isHandlingUnauthorized.current = false;
      }, 1000);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    // Amplify reports a sign-out in another tab and a refresh Cognito refused the same way.
    const stopListening = onSessionEnded(handleUnauthorized);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
      stopListening();
    };
  }, [dispatch, navigate, location.pathname]);

  // Gate protected routes until the stored session is confirmed valid or renewed (an unexpired ID token needs no wait).
  const [authReady, setAuthReady] = useState(() => {
    if (!hasStoredSession()) return true;
    const exp = readStoredClaims()?.exp;
    return typeof exp === 'number' && exp * 1000 > Date.now();
  });

  useEffect(() => {
    if (!hasStoredSession() || authReady) return;
    const endSession = () => {
      void discardSession();
      dispatch(clearAuth());
      navigate('/login', { replace: true });
    };
    // No token means Amplify has no usable session (malformed, or refused by Cognito). An error is a failed refresh, e.g.
    // offline: the session stays and the next request retries.
    getIdToken()
      .then((token) => (token ? setAuthReady(true) : endSession()))
      .catch(() => setAuthReady(true));
  }, []);

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Authenticated users on public/app routes: show loading until auth is confirmed,
  // then render the correct route. This prevents FOUC (flash of landing page).
  if (!authReady && isAuthenticated) {
    return <PageLoadingFallback />;
  }

  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoadingFallback />}>
      <ReloadGuardReset />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/app/*" element={
          <RequireAuth>
            <AppPage />
          </RequireAuth>
        } />
        {PublicRoutes}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ChunkErrorBoundary>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner duration={5000} closeButton />
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnalyticsRoot />
        <AppRoutes />
      </BrowserRouter>
    </HelmetProvider>
  </TooltipProvider>
);

export default App;
