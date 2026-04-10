import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { TradeLogView } from '@/components/views/TradeLogView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { GoalsView } from '@/components/views/GoalsView';
import { ProfileView } from '@/components/views/ProfileView';
import { SettingsView } from '@/components/views/SettingsView';
import { AccountsView } from '@/components/views/AccountsView';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';
import { ImportTradesModal } from '@/components/dashboard/ImportTradesModal';
import { useCreateTradeMutation, useBulkImportTradesMutation, useGetSavedOptionsQuery, useGetSubscriptionQuery } from '@/store/api';
import { useTradesSync } from '@/hooks/useTradesSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import type { Trade } from '@/types/trade';

export function AppPage() {
  const [createTrade] = useCreateTradeMutation();
  const [bulkImportTrades] = useBulkImportTradesMutation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fetch saved options on initial load (will be cached)
  useGetSavedOptionsQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch subscription status on initial load (will be cached)
  useGetSubscriptionQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  
  // Centralized trades sync with account selection
  useTradesSync();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isImportTradesOpen, setIsImportTradesOpen] = useState(false);

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
      // Map frontend Trade format to backend API format for bulk import
      const items = newTrades.map(trade => ({
        symbol: trade.symbol,
        side: trade.direction === 'LONG' ? 'BUY' : 'SELL', // Map direction to side
        quantity: trade.size, // Map size to quantity
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        openDate: trade.entryDate, // Map entryDate to openDate
        closeDate: trade.exitDate, // Map exitDate to closeDate
        outcome: trade.outcome,
        accountIds: trade.accountId ? [trade.accountId] : undefined, // Backend expects accountIds array
        brokenRuleIds: trade.brokenRuleIds,
        setupType: trade.strategy,
        tradingSession: trade.session,
        marketCondition: trade.marketCondition,
        newsEvents: trade.newsEvents,
        mistakes: trade.mistakes,
        lessons: trade.keyLesson ? [trade.keyLesson] : [],
        tradeNotes: trade.notes, // Map notes to tradeNotes
        tags: trade.tags,
        pnl: trade.pnl,
        riskRewardRatio: trade.riskRewardRatio
      }));

      // Use bulk import API
      await bulkImportTrades({ items } as any).unwrap();
      
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
