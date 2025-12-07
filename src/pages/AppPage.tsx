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
import { createTrade } from '@/store/slices/tradesSlice';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types/trade';

export function AppPage() {
  const dispatch = useAppDispatch();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isImportTradesOpen, setIsImportTradesOpen] = useState(false);

  const handleAddTrade = async (newTrade: Omit<Trade, 'id'>) => {
    await dispatch(createTrade(newTrade as unknown as any)).unwrap();
    setIsAddTradeOpen(false);
  };

  const handleImportTrades = async (newTrades: Omit<Trade, 'id'>[]) => {
    for (const trade of newTrades) {
      await dispatch(createTrade(trade as unknown as any)).unwrap();
    }
    setIsImportTradesOpen(false);
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
