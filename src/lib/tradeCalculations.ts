import { Trade } from '@/types/trade';

export interface TradeStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  avgRiskReward: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  grossProfit: number;
  grossLoss: number;
  expectancy: number;
  sharpeRatio: number;
  avgHoldingTime: number;
  totalVolume: number;
}

/**
 * Calculate comprehensive trading statistics from trades array
 */
export function calculateTradeStats(trades: Trade[]): TradeStats {
  // Exclude trades that belong to the special "-1" account.
  // Backend sometimes uses accountId=-1 for unassigned/invalid trades.
  const eligibleTrades = trades.filter((trade) => {
    const id = trade.accountId;
    if (!id) return true; // No accountId means it's eligible
    const normalized = String(id).trim();
    return normalized !== '-1';
  });

  // Ensure deterministic, chronological calculations for streaks/drawdown.
  // Prefer exitDate when present; otherwise fall back to entryDate.
  const closedTrades = [...eligibleTrades].sort((a, b) => {
    const aTime = new Date(a.exitDate ?? a.entryDate).getTime();
    const bTime = new Date(b.exitDate ?? b.entryDate).getTime();
    return aTime - bTime;
  });
  
  if (closedTrades.length === 0) {
    return {
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      bestTrade: 0,
      worstTrade: 0,
      maxDrawdown: 0,
      avgRiskReward: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      grossProfit: 0,
      grossLoss: 0,
      expectancy: 0,
      sharpeRatio: 0,
      avgHoldingTime: 0,
      totalVolume: 0,
    };
  }

  // Basic stats
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
  const breakeven = closedTrades.filter(t => (t.pnl || 0) === 0);
  
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  
  // Win/Loss averages
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
  
  // Profit metrics
  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Risk/Reward
  // Prefer per-trade R:R if provided; otherwise fall back to avgWin/avgLoss.
  const rrValues = closedTrades
    .map(t => t.riskRewardRatio)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  const avgRiskReward = rrValues.length > 0
    ? rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length
    : (avgLoss > 0 ? avgWin / avgLoss : 0);
  
  // Best/Worst trades
  const bestTrade = Math.max(...closedTrades.map(t => t.pnl || 0));
  const worstTrade = Math.min(...closedTrades.map(t => t.pnl || 0));
  
  // Consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  
  closedTrades.forEach(trade => {
    if ((trade.pnl || 0) > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else if ((trade.pnl || 0) < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    }
  });
  
  // Calculate max drawdown (%)
  // Naive drawdown from a 0 start can exceed 100% if cumulative PnL goes below 0 after a small peak.
  // To keep drawdown meaningful as a percentage, compute it from a shifted equity curve with a
  // strictly-positive starting equity.
  let runningPnl = 0;
  let minRunningPnl = 0;
  for (const trade of closedTrades) {
    runningPnl += (trade.pnl || 0);
    if (runningPnl < minRunningPnl) minRunningPnl = runningPnl;
  }

  const startingEquity = (minRunningPnl < 0 ? -minRunningPnl : 0) + 1;
  let maxDrawdown = 0;
  let peakEquity = startingEquity;
  let equity = startingEquity;

  for (const trade of closedTrades) {
    equity += (trade.pnl || 0);
    if (equity > peakEquity) peakEquity = equity;
    const drawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Expectancy (average profit per trade)
  const expectancy = totalPnl / closedTrades.length;
  
  // Sharpe Ratio (simplified - assumes risk-free rate of 0)
  const pnlArray = closedTrades.map(t => t.pnl || 0);
  const avgPnl = totalPnl / closedTrades.length;
  const variance = pnlArray.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / closedTrades.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgPnl / stdDev) : 0;
  
  // Average holding time (in hours)
  const tradesWithDuration = closedTrades.filter(t => t.exitDate && t.entryDate);
  const avgHoldingTime = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((sum, t) => {
        const duration = new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime();
        return sum + (duration / (1000 * 60 * 60)); // Convert to hours
      }, 0) / tradesWithDuration.length
    : 0;
  
  // Total volume traded
  const totalVolume = closedTrades.reduce((sum, t) => sum + (t.size || 0), 0);

  return {
    totalPnl,
    winRate,
    totalTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade,
    worstTrade,
    maxDrawdown,
    avgRiskReward,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    grossProfit,
    grossLoss,
    expectancy,
    sharpeRatio,
    avgHoldingTime,
    totalVolume,
  };
}

/**
 * Calculate symbol distribution from trades
 */
export function calculateSymbolDistribution(trades: Trade[]): Record<string, number> {
  return trades.reduce((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate strategy distribution from trades
 */
export function calculateStrategyDistribution(trades: Trade[]): Record<string, number> {
  return trades.reduce((acc, trade) => {
    const strategy = trade.strategy || 'Unknown';
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Calculate hourly win rate statistics (0-23 hours)
 */
export function calculateHourlyStats(trades: Trade[]) {
  return Array.from({ length: 24 }, (_, hour) => {
    const tradesInHour = trades.filter(t => {
      const entryDate = new Date(t.entryDate);
      return entryDate.getHours() === hour;
    });
    const wins = tradesInHour.filter(t => (t.pnl || 0) > 0).length;
    const total = tradesInHour.length;
    const totalPnl = tradesInHour.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      hour: `${hour.toString().padStart(2, '0')}`,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      trades: total,
      pnl: totalPnl,
    };
  });
}

/**
 * Calculate daily win rate statistics (by day of week)
 */
export function calculateDailyWinRate(trades: Trade[]) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return dayNames.map((day, index) => {
    const tradesOnDay = trades.filter(t => new Date(t.entryDate).getDay() === index);
    const wins = tradesOnDay.filter(t => (t.pnl || 0) > 0).length;
    const total = tradesOnDay.length;
    const totalPnl = tradesOnDay.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      day,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      trades: total,
      pnl: totalPnl,
    };
  });
}

/**
 * Calculate trade duration statistics
 */
export function calculateTradeDurations(trades: Trade[]) {
  const tradeDurations = trades
    .filter(t => t.exitDate && t.entryDate)
    .map(trade => {
      const exitDate = new Date(trade.exitDate!);
      const entryDate = new Date(trade.entryDate);
      const durationMs = exitDate.getTime() - entryDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      return {
        symbol: trade.symbol,
        duration: durationHours,
        pnl: trade.pnl || 0,
        isWin: (trade.pnl || 0) > 0,
        outcome: trade.outcome,
      };
    });

  if (tradeDurations.length === 0) {
    return {
      durations: [],
      maxDuration: 0,
      minDuration: 0,
      avgDuration: 0,
      medianDuration: 0,
    };
  }

  const sortedDurations = [...tradeDurations].sort((a, b) => a.duration - b.duration);
  const maxDuration = sortedDurations[sortedDurations.length - 1].duration;
  const minDuration = sortedDurations[0].duration;
  const avgDuration = tradeDurations.reduce((sum, t) => sum + t.duration, 0) / tradeDurations.length;
  const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)].duration;

  return {
    durations: tradeDurations,
    maxDuration,
    minDuration,
    avgDuration,
    medianDuration,
  };
}

/**
 * Group trade durations into ranges for visualization
 */
export function groupDurationsByRange(trades: Trade[]) {
  const { durations } = calculateTradeDurations(trades);
  
  const durationRanges = [
    { range: '< 1h', min: 0, max: 1 },
    { range: '1-4h', min: 1, max: 4 },
    { range: '4-8h', min: 4, max: 8 },
    { range: '8-24h', min: 8, max: 24 },
    { range: '> 24h', min: 24, max: Infinity },
  ];

  return durationRanges.map(({ range, min, max }) => {
    const tradesInRange = durations.filter(t => t.duration >= min && t.duration < max);
    const wins = tradesInRange.filter(t => t.isWin).length;
    const losses = tradesInRange.length - wins;
    
    return {
      range,
      wins,
      losses,
      total: tradesInRange.length,
      avgPnl: tradesInRange.length > 0 
        ? tradesInRange.reduce((sum, t) => sum + t.pnl, 0) / tradesInRange.length 
        : 0,
    };
  }).filter(d => d.total > 0);
}

/**
 * Calculate cumulative P&L over time for equity curve
 */
export function calculateCumulativePnL(trades: Trade[]) {
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
  );

  let runningPnl = 0;
  return sortedTrades.map(trade => {
    runningPnl += trade.pnl || 0;
    return {
      date: trade.exitDate || trade.entryDate,
      cumulativePnl: runningPnl,
      tradePnl: trade.pnl || 0,
      symbol: trade.symbol,
    };
  });
}

/**
 * Calculate outcome distribution (TP, SL, BREAKEVEN, PARTIAL)
 */
export function calculateOutcomeDistribution(trades: Trade[]) {
  const distribution = trades.reduce((acc, trade) => {
    const outcome = trade.outcome || 'UNKNOWN';
    acc[outcome] = (acc[outcome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(distribution).map(([outcome, count]) => ({
    outcome,
    count,
    percentage: (count / trades.length) * 100,
  }));
}

/**
 * Calculate session distribution (London, New York, Asian, etc.)
 */
export function calculateSessionDistribution(trades: Trade[]) {
  const distribution = trades.reduce((acc, trade) => {
    const session = trade.session || 'Unknown';
    acc[session] = (acc[session] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(distribution).map(([session, count]) => ({
    session,
    count,
    percentage: (count / trades.length) * 100,
  }));
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/**
 * Format currency with proper decimals
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage with proper decimals
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
