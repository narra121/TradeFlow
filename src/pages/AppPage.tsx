import { useState } from 'react';
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
import { useAppDispatch } from '@/store/hooks';
import { createTrade, bulkImportTrades, fetchTrades } from '@/store/slices/tradesSlice';
import { useTradesSync } from '@/hooks/useTradesSync';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types/trade';

export function AppPage() {
  const dispatch = useAppDispatch();
  
  // Centralized trades sync with account selection
  useTradesSync();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isImportTradesOpen, setIsImportTradesOpen] = useState(false);

  const handleAddTrade = async (newTrade: Omit<Trade, 'id'>) => {
    // Map frontend Trade format to backend API format
    const payload = {
      symbol: newTrade.symbol,
      side: newTrade.direction === 'LONG' ? 'BUY' as const : 'SELL' as const,
      quantity: newTrade.size,
      entryPrice: newTrade.entryPrice,
      exitPrice: newTrade.exitPrice,
      stopLoss: newTrade.stopLoss,
      takeProfit: newTrade.takeProfit,
      openDate: newTrade.entryDate,
      closeDate: newTrade.exitDate,
      outcome: newTrade.outcome,
      accountIds: newTrade.accountIds,
      brokenRuleIds: newTrade.brokenRuleIds,
      setupType: newTrade.strategy,
      tradingSession: newTrade.session,
      marketCondition: newTrade.marketCondition,
      newsEvents: newTrade.newsEvents,
      mistakes: newTrade.mistakes,
      lessons: newTrade.keyLesson ? [newTrade.keyLesson] : [],
      tags: newTrade.tags,
      images: newTrade.images?.map(img => ({
        url: img.url,
        timeframe: img.timeframe,
        description: img.description
      }))
    };
    await dispatch(createTrade(payload as any)).unwrap();
    setIsAddTradeOpen(false);
  };

  const handleImportTrades = async (newTrades: Omit<Trade, 'id'>[]) => {
    try {
      // Map frontend Trade format to backend API format for bulk import
      const items = newTrades.map(trade => ({
        symbol: trade.symbol,
        side: trade.direction === 'LONG' ? 'BUY' as const : 'SELL' as const,
        quantity: trade.size,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        openDate: trade.entryDate,
        closeDate: trade.exitDate,
        outcome: trade.outcome,
        accountIds: trade.accountIds,
        brokenRuleIds: trade.brokenRuleIds,
        setupType: trade.strategy,
        tradingSession: trade.session,
        marketCondition: trade.marketCondition,
        newsEvents: trade.newsEvents,
        mistakes: trade.mistakes,
        lessons: trade.keyLesson ? [trade.keyLesson] : [],
        tags: trade.tags
      }));

      // Use bulk import API
      await dispatch(bulkImportTrades({ items })).unwrap();
      
      // Refresh the trades list
      await dispatch(fetchTrades()).unwrap();
      
      // Close dialog only after successful save
      setIsImportTradesOpen(false);
      
      return { success: true };
    } catch (error) {
      // Don't close dialog on error - let user retry or fix issues
      console.error('Failed to import trades:', error);
      return { success: false, error };
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
      case 'accounts':
        return <AccountsView />;
      case 'tradelog':
        return <TradeLogView onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'goals':
        return <GoalsView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-background bg-glow">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <main className={cn(
        "transition-all duration-300 min-h-screen p-8",
        sidebarCollapsed ? "ml-[72px]" : "ml-[240px]"
      )}>
        <div className="max-w-7xl mx-auto animate-fade-in">
          {renderView()}
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
