import { Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AnalyticsRoot } from '@/components/analytics';
import { ChunkErrorBoundary, PageLoadingFallback, ReloadGuardReset } from '@/appRoot/shared';
import { LandingPage, NotFound, PublicRoutes } from '@/PublicRoutes';

/** A link from a public page into the signed-in app: the app entry (store, auth) loads with a full navigation. */
function LeaveToApp() {
  const { pathname, search, hash } = useLocation();
  window.location.replace(`${pathname}${search}${hash}`);
  return <PageLoadingFallback />;
}

/**
 * Entry for visitors who open a public page while signed out (main.tsx): no store, no RTK Query, no auth code.
 * Anything that needs them (log in, sign up, the app) leaves through `LeaveToApp`.
 */
export default function PublicApp() {
  return (
    <TooltipProvider>
      <Sonner duration={5000} closeButton />
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnalyticsRoot />
          <ChunkErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <ReloadGuardReset />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LeaveToApp />} />
                <Route path="/signup" element={<LeaveToApp />} />
                <Route path="/auth/*" element={<LeaveToApp />} />
                <Route path="/app/*" element={<LeaveToApp />} />
                {PublicRoutes}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ChunkErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
    </TooltipProvider>
  );
}
