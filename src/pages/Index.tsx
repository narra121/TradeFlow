import { useState, useMemo } from 'react';
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
import { AuthPage } from '@/components/auth/AuthPage';
import { mockTrades, calculatePortfolioStats } from '@/data/mockTrades';
import { Trade } from '@/types/trade';
import { useAccounts } from '@/hooks/useAccounts';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isImportTradesOpen, setIsImportTradesOpen] = useState(false);
  
  const { selectedAccountId } = useAccounts();

  // Filter trades by selected account
  const filteredTrades = useMemo(() => {
    if (!selectedAccountId) return trades;
    return trades.filter(t => t.accountIds?.includes(selectedAccountId));
  }, [trades, selectedAccountId]);

  const stats = useMemo(() => calculatePortfolioStats(filteredTrades), [filteredTrades]);

  const handleAddTrade = (newTrade: Omit<Trade, 'id'>) => {
    const trade: Trade = {
      ...newTrade,
      id: Date.now().toString(),
    };
    setTrades(prev => [trade, ...prev]);
  };

  const handleImportTrades = (newTrades: Omit<Trade, 'id'>[]) => {
    const tradesWithIds: Trade[] = newTrades.map((trade, index) => ({
      ...trade,
      id: `${Date.now()}-${index}`,
    }));
    setTrades(prev => [...tradesWithIds, ...prev]);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView trades={filteredTrades} stats={stats} onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
      case 'accounts':
        return <AccountsView />;
      case 'tradelog':
        return <TradeLogView trades={filteredTrades} onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
      case 'analytics':
        return <AnalyticsView trades={filteredTrades} stats={stats} />;
      case 'goals':
        return <GoalsView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView trades={filteredTrades} stats={stats} onAddTrade={() => setIsAddTradeOpen(true)} onImportTrades={() => setIsImportTradesOpen(true)} />;
    }
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background bg-glow">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        "ml-[240px] p-8"
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
};

export default Index;