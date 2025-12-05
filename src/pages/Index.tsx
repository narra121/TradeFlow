import { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { TradesView } from '@/components/views/TradesView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { CalendarView } from '@/components/views/CalendarView';
import { GoalsView } from '@/components/views/GoalsView';
import { SettingsView } from '@/components/views/SettingsView';
import { AddTradeModal } from '@/components/dashboard/AddTradeModal';
import { AuthPage } from '@/components/auth/AuthPage';
import { mockTrades, calculatePortfolioStats } from '@/data/mockTrades';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);

  const stats = useMemo(() => calculatePortfolioStats(trades), [trades]);

  const handleAddTrade = (newTrade: Omit<Trade, 'id'>) => {
    const trade: Trade = {
      ...newTrade,
      id: Date.now().toString(),
    };
    setTrades(prev => [trade, ...prev]);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView trades={trades} stats={stats} onAddTrade={() => setIsAddTradeOpen(true)} />;
      case 'trades':
        return <TradesView trades={trades} onAddTrade={() => setIsAddTradeOpen(true)} />;
      case 'analytics':
        return <AnalyticsView trades={trades} stats={stats} />;
      case 'calendar':
        return <CalendarView trades={trades} />;
      case 'goals':
        return <GoalsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView trades={trades} stats={stats} onAddTrade={() => setIsAddTradeOpen(true)} />;
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
    </div>
  );
};

export default Index;