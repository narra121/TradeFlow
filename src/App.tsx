import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { tokenRefreshScheduler } from "./lib/tokenRefreshScheduler";
import { RequireAuth } from "./components/auth/RequireAuth";

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

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    if (isChunkError(error)) {
      // Only auto-reload once to avoid infinite loops
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return { hasError: true };
      }
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChunkErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
          <p className="text-muted-foreground">A new version is available.</p>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              sessionStorage.removeItem(RELOAD_KEY);
              window.location.reload();
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
      tokenRefreshScheduler.stop();
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

  // Separate effect to start scheduler only once on mount
  useEffect(() => {
    const token = localStorage.getItem('idToken');
    if (token && !tokenRefreshScheduler.isRunning()) {
      console.log('[App] Starting token refresh scheduler on mount');
      tokenRefreshScheduler.start();
    }
    
    // Cleanup on unmount
    return () => {
      tokenRefreshScheduler.stop();
    };
  }, []); // Empty dependency array - run only once on mount

  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
