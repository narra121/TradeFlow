import { Trade, DailyStats, PortfolioStats } from '@/types/trade';

export const mockTrades: Trade[] = [
  {
    id: '1',
    symbol: 'EUR/USD',
    direction: 'LONG',
    entryPrice: 1.0850,
    exitPrice: 1.0920,
    stopLoss: 1.0800,
    takeProfit: 1.0950,
    size: 1.0,
    entryDate: new Date('2024-12-04T09:30:00'),
    exitDate: new Date('2024-12-04T14:45:00'),
    status: 'CLOSED',
    pnl: 700,
    pnlPercent: 1.4,
    riskRewardRatio: 2.0,
    notes: 'Strong bullish momentum after ECB announcement. Price broke key resistance at 1.0840.',
    setup: 'Breakout above resistance with volume confirmation',
    strategy: 'Breakout',
    emotions: 'Confident entry, followed plan',
    tags: ['breakout', 'news-driven', 'trend-following'],
  },
  {
    id: '2',
    symbol: 'GBP/USD',
    direction: 'SHORT',
    entryPrice: 1.2680,
    exitPrice: 1.2590,
    stopLoss: 1.2730,
    takeProfit: 1.2550,
    size: 0.5,
    entryDate: new Date('2024-12-03T11:15:00'),
    exitDate: new Date('2024-12-03T16:30:00'),
    status: 'CLOSED',
    pnl: 450,
    pnlPercent: 0.9,
    riskRewardRatio: 2.6,
    notes: 'Double top formation confirmed. Clean rejection from 1.2700 zone.',
    setup: 'Double top reversal pattern',
    strategy: 'Reversal',
    emotions: 'Slight hesitation on entry, but managed well',
    tags: ['reversal', 'pattern', 'gbp'],
  },
  {
    id: '3',
    symbol: 'USD/JPY',
    direction: 'LONG',
    entryPrice: 149.50,
    exitPrice: 149.20,
    stopLoss: 149.00,
    takeProfit: 150.50,
    size: 0.75,
    entryDate: new Date('2024-12-02T08:00:00'),
    exitDate: new Date('2024-12-02T12:00:00'),
    status: 'CLOSED',
    pnl: -225,
    pnlPercent: -0.45,
    riskRewardRatio: 2.0,
    notes: 'Stopped out before move. Entry was premature, should have waited for confirmation.',
    setup: 'Support bounce',
    strategy: 'Support/Resistance',
    emotions: 'FOMO entry, learned lesson',
    tags: ['loss', 'fomo', 'jpy'],
  },
  {
    id: '4',
    symbol: 'XAU/USD',
    direction: 'LONG',
    entryPrice: 2020.50,
    exitPrice: 2055.00,
    stopLoss: 2005.00,
    takeProfit: 2060.00,
    size: 0.25,
    entryDate: new Date('2024-12-01T10:00:00'),
    exitDate: new Date('2024-12-02T09:00:00'),
    status: 'CLOSED',
    pnl: 862.50,
    pnlPercent: 1.72,
    riskRewardRatio: 2.5,
    notes: 'Gold rally on dollar weakness. Held overnight, great patience.',
    setup: 'Trend continuation on daily support',
    strategy: 'Trend Following',
    emotions: 'Patient, disciplined execution',
    tags: ['gold', 'trend', 'overnight'],
  },
  {
    id: '5',
    symbol: 'EUR/GBP',
    direction: 'SHORT',
    entryPrice: 0.8580,
    stopLoss: 0.8620,
    takeProfit: 0.8500,
    size: 0.5,
    entryDate: new Date('2024-12-05T07:30:00'),
    status: 'OPEN',
    riskRewardRatio: 2.0,
    notes: 'Descending triangle breakdown expected. Risk: 40 pips, Target: 80 pips.',
    setup: 'Descending triangle',
    strategy: 'Breakout',
    tags: ['pattern', 'active'],
  },
  {
    id: '6',
    symbol: 'NAS100',
    direction: 'LONG',
    entryPrice: 16250,
    exitPrice: 16450,
    stopLoss: 16100,
    takeProfit: 16500,
    size: 0.1,
    entryDate: new Date('2024-11-30T15:30:00'),
    exitDate: new Date('2024-12-01T20:00:00'),
    status: 'CLOSED',
    pnl: 200,
    pnlPercent: 1.23,
    riskRewardRatio: 1.67,
    notes: 'Tech rally on Fed dovish comments. Scaled out at resistance.',
    setup: 'Dip buying on support',
    strategy: 'Support/Resistance',
    emotions: 'Greedy, should have held for full target',
    tags: ['indices', 'nasdaq', 'swing'],
  },
  {
    id: '7',
    symbol: 'EUR/USD',
    direction: 'SHORT',
    entryPrice: 1.0920,
    exitPrice: 1.0870,
    stopLoss: 1.0960,
    takeProfit: 1.0850,
    size: 0.5,
    entryDate: new Date('2024-11-29T14:00:00'),
    exitDate: new Date('2024-11-29T15:30:00'),
    status: 'CLOSED',
    pnl: 250,
    pnlPercent: 0.5,
    riskRewardRatio: 1.75,
    notes: 'Quick scalp on resistance rejection.',
    setup: 'Resistance rejection',
    strategy: 'Scalping',
    emotions: 'Focused',
    tags: ['scalp', 'quick'],
  },
  {
    id: '8',
    symbol: 'GBP/JPY',
    direction: 'LONG',
    entryPrice: 188.50,
    exitPrice: 189.80,
    stopLoss: 187.80,
    takeProfit: 190.00,
    size: 0.3,
    entryDate: new Date('2024-11-28T10:00:00'),
    exitDate: new Date('2024-11-28T18:00:00'),
    status: 'CLOSED',
    pnl: 390,
    pnlPercent: 0.69,
    riskRewardRatio: 2.14,
    notes: 'Strong momentum trade.',
    setup: 'Trend continuation',
    strategy: 'Trend Following',
    emotions: 'Confident',
    tags: ['trend', 'momentum'],
  },
];

export const calculatePortfolioStats = (trades: Trade[]): PortfolioStats => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;

  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

  return {
    totalTrades: closedTrades.length,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    totalPnl,
    avgWin,
    avgLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown: 12.5,
    bestTrade: Math.max(...closedTrades.map(t => t.pnl || 0)),
    worstTrade: Math.min(...closedTrades.map(t => t.pnl || 0)),
    avgRiskReward: closedTrades.reduce((sum, t) => sum + t.riskRewardRatio, 0) / closedTrades.length,
    consecutiveWins: 3,
    consecutiveLosses: 1,
  };
};

export const getDailyStats = (trades: Trade[]): DailyStats[] => {
  const statsMap = new Map<string, DailyStats>();

  trades.filter(t => t.status === 'CLOSED').forEach(trade => {
    const dateKey = trade.exitDate?.toISOString().split('T')[0] || '';
    const existing = statsMap.get(dateKey);

    if (existing) {
      existing.trades++;
      if ((trade.pnl || 0) > 0) existing.wins++;
      else existing.losses++;
      existing.pnl += trade.pnl || 0;
      existing.winRate = (existing.wins / existing.trades) * 100;
    } else {
      statsMap.set(dateKey, {
        date: trade.exitDate || new Date(),
        trades: 1,
        wins: (trade.pnl || 0) > 0 ? 1 : 0,
        losses: (trade.pnl || 0) <= 0 ? 1 : 0,
        pnl: trade.pnl || 0,
        winRate: (trade.pnl || 0) > 0 ? 100 : 0,
      });
    }
  });

  return Array.from(statsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
};
