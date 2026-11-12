import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { RequireAuth } from "./components/auth/RequireAuth";
import { HelmetProvider } from 'react-helmet-async';
import { decodeJwtPayload, isJwtExpired } from '@/lib/jwt';
import { AnalyticsRoot } from '@/components/analytics';
import { ChunkErrorBoundary, PageLoadingFallback, ReloadGuardReset, queryClient } from '@/appRoot/shared';
import { LandingPage, NotFound, PublicRoutes } from '@/PublicRoutes';

// App and auth pages (the public pages live in PublicRoutes.tsx)
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
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
      dispatch(clearAuth());
      navigate('/login', { replace: true, state: { from: location, reason: 'session-ended' } });
      
      // Reset flag after navigation
      setTimeout(() => {
        isHandlingUnauthorized.current = false;
      }, 1000);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [dispatch, navigate, location.pathname]);

  // Gate protected routes until token is confirmed valid or refreshed
  const [authReady, setAuthReady] = useState(() => {
    const token = localStorage.getItem('idToken');
    if (!token) return true;
    return !isJwtExpired(token);
  });

  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (!token) return;

    if (!decodeJwtPayload(token)) {
      dispatch(clearAuth());
      navigate('/login', { replace: true });
      return;
    }
    if (isJwtExpired(token)) {
      import('@/lib/api/tokenRefresh').then(({ refreshToken }) => {
        refreshToken()
          .then(() => {
            setAuthReady(true);
          })
          .catch(() => {
            dispatch(clearAuth());
            navigate('/login', { replace: true });
          });
      });
    }
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
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

export default App;
