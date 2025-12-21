import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { AppPage } from "./pages/AppPage";
import NotFound from "./pages/NotFound";
import { tokenRefreshScheduler } from "./lib/tokenRefreshScheduler";

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

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [navigate, location.pathname]);

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
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/app/*" element={<AppPage />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.PROD ? "/TradeFlow" : ""}>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
