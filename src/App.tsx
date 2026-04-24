import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect, useRef, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { RequireAuth } from "./components/auth/RequireAuth";
import { HelmetProvider } from 'react-helmet-async';

// Lazy-loaded page components
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then(m => ({ default: m.GuidePage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

// Error boundary that catches chunk load failures after a new deploy
// and auto-reloads the page once to fetch the updated index.html.
const RELOAD_KEY = 'chunk-reload';

function isChunkError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk')
  );
}

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; isChunk: boolean }> {
  state = { hasError: false, isChunk: false };

  static getDerivedStateFromError(error: Error) {
    if (isChunkError(error)) {
      // Only auto-reload once to avoid infinite loops
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        // Cache-busting reload: append timestamp to force fresh fetch
        const url = new URL(window.location.href);
        url.searchParams.set('_cb', Date.now().toString());
        window.location.replace(url.toString());
        return { hasError: true, isChunk: true };
      }
      return { hasError: true, isChunk: true };
    }
    // Non-chunk errors: catch to prevent white screen, but show generic error
    return { hasError: true, isChunk: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChunkErrorBoundary caught:', error, info);
    import('./lib/errorReporter').then(({ reportReactError }) => {
      reportReactError(error, info);
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
          <p className="text-muted-foreground">
            {this.state.isChunk ? 'A new version is available.' : 'An unexpected error occurred. Error logs have been sent \u2014 we\u2019ll provide a fix soon.'}
          </p>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              sessionStorage.removeItem(RELOAD_KEY);
              const url = new URL(window.location.href);
              url.searchParams.set('_cb', Date.now().toString());
              window.location.replace(url.toString());
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Clear the reload guard on successful app load so future deploys still auto-reload
sessionStorage.removeItem(RELOAD_KEY);

// Strip the cache-buster param from the URL bar without reloading
if (window.location.search.includes('_cb=')) {
  const url = new URL(window.location.href);
  url.searchParams.delete('_cb');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

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
      navigate('/login', { replace: true });
      
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
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
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
    } catch {
      dispatch(clearAuth());
      navigate('/login', { replace: true });
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
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/refund" element={<RefundPolicyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/guide" element={<GuidePage />} />
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
      <Sonner position="top-right" duration={5000} closeButton />
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
