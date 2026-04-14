import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';

const DashboardView = lazy(() => import('@/components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const TradeLogView = lazy(() => import('@/components/views/TradeLogView').then(m => ({ default: m.TradeLogView })));
const AnalyticsView = lazy(() => import('@/components/views/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const GoalsView = lazy(() => import('@/components/views/GoalsView').then(m => ({ default: m.GoalsView })));
const ProfileView = lazy(() => import('@/components/views/ProfileView').then(m => ({ default: m.ProfileView })));
const SettingsView = lazy(() => import('@/components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const AccountsView = lazy(() => import('@/components/views/AccountsView').then(m => ({ default: m.AccountsView })));
import { ImportTradesModal } from '@/components/dashboard/ImportTradesModal';
import { useCreateTradeMutation, useBulkImportTradesMutation, useGetSavedOptionsQuery, useGetSubscriptionQuery } from '@/store/api';
import type { CreateTradePayload } from '@/lib/api';
import { useTradesSync } from '@/hooks/useTradesSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import type { Trade } from '@/types/trade';
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner';
import { api } from '@/store/api/baseApi';
import { useAppDispatch } from '@/store/hooks';
import { getSubscriptionBannerReason } from '@/lib/subscriptionUtils';

export function AppPage() {
  const [createTrade] = useCreateTradeMutation();
  const [bulkImportTrades] = useBulkImportTradesMutation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fetch saved options on initial load (will be cached; global refetch is already disabled)
  useGetSavedOptionsQuery();

  // Fetch subscription status on initial load (will be cached)
  const { data: subscription } = useGetSubscriptionQuery();
  
  // Centralized trades sync with account selection
  useTradesSync();
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isImportTradesOpen, setIsImportTradesOpen] = useState(false);

  const bannerReason = getSubscriptionBannerReason(subscription);

  useEffect(() => {
    const handler = () => {
      dispatch(api.util.invalidateTags(['Subscription']));
    };
    window.addEventListener('subscription-required', handler);
    return () => window.removeEventListener('subscription-required', handler);
  }, [dispatch]);

  // Auto-collapse sidebar on tablet-sized screens (768-1024px)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 768 && width <= 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when switching away from mobile
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);
  
  // Derive active view from URL
  const activeView = location.pathname.split('/')[2] || 'dashboard';

  const handleAddTrade = async (newTrade: Omit<Trade, 'id'>) => {
    // Pass directly as CreateTradePayload — tradesApi.createTrade handles the mapping
    await createTrade(newTrade as any).unwrap();
  };

  const handleImportTrades = async (newTrades: Omit<Trade, 'id'>[]) => {
    try {
      // Pass frontend Trade objects directly — bulkImportTrades mutation handles
      // the frontend→backend field mapping (size→quantity, direction→side, etc.)
      await bulkImportTrades({ items: newTrades as CreateTradePayload[] }).unwrap();
      
      // Close dialog only after successful save
      setIsImportTradesOpen(false);
      
      return { success: true };
    } catch (error) {
      // Don't close dialog on error - let user retry or fix issues
      console.error('Failed to import trades:', error);
      return { success: false, error };
    }
  };



  return (
    <div className="min-h-screen bg-background bg-glow">
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => navigate(`/app/${view}`)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      <main className={cn(
        "transition-all duration-300 min-h-screen",
        // Padding: smaller on mobile, full on desktop
        "p-4 md:p-8",
        // Margin: none on mobile (sidebar overlays), collapsed on tablet, dynamic on desktop
        isMobile
          ? "ml-0"
          : sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
      )}>
        {bannerReason && (
          <SubscriptionBanner
            reason={bannerReason}
            trialEnd={subscription?.trialEnd}
            onSubscribe={() => navigate('/app/profile')}
            onDismiss={() => {}}
          />
        )}
        {/* Mobile hamburger button */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="mb-4 p-2 rounded-lg hover:bg-accent text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div className="max-w-7xl mx-auto animate-fade-in">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
            <Routes>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />} />
              <Route path="accounts" element={<AccountsView />} />
              <Route path="tradelog" element={<TradeLogView onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />} />
              <Route path="analytics" element={<AnalyticsView />} />
              <Route path="goals" element={<GoalsView />} />
              <Route path="profile" element={<ProfileView />} />
              <Route path="settings" element={<SettingsView />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <AddTradeModal 
        open={isAddTradeOpen} 
        onOpenChange={setIsAddTradeOpen}
        onAddTrade={handleAddTrade}
      />

      <ImportTradesModal
        open={isImportTradesOpen}
        onOpenChange={setIsImportTradesOpen}
        onImportTrades={handleImportTrades}
      />
    </div>
  );
}
