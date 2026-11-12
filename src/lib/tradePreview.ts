import type { AssetClass, TradeDirection, TradeOutcome } from '@/types/trade';
import { computePnl } from '@/lib/pnl';

export const ASSET_CLASSES: { value: AssetClass; label: string; qtyLabel: string }[] = [
  { value: 'forex', label: 'Forex', qtyLabel: 'Lots' },
  { value: 'stock', label: 'Stocks', qtyLabel: 'Qty' },
  { value: 'futures', label: 'Futures', qtyLabel: 'Contracts' },
  { value: 'options', label: 'Options', qtyLabel: 'Lots' },
  { value: 'crypto', label: 'Crypto', qtyLabel: 'Units' },
  { value: 'commodity', label: 'Commodity', qtyLabel: 'Lots' },
  { value: 'cfd', label: 'CFD', qtyLabel: 'Lots' },
];

export const FOREX_LOT_SIZE = 100_000;

export function quantityLabel(assetClass: AssetClass | undefined): string {
  return ASSET_CLASSES.find((a) => a.value === assetClass)?.qtyLabel ?? 'Lots';
}

/** Stocks and crypto trade in plain units; every other class needs a per-lot multiplier. */
export function needsLotSize(assetClass: AssetClass | undefined): boolean {
  return assetClass !== 'stock' && assetClass !== 'crypto';
}

export function defaultLotSize(assetClass: AssetClass | undefined): number | undefined {
  return assetClass === 'forex' ? FOREX_LOT_SIZE : undefined;
}

const FX_CODES = new Set(['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'ZAR', 'MXN', 'TRY', 'PLN', 'CNH', 'INR']);

/**
 * The asset class of a trade saved before the field existed: a six-letter pair of currency codes is forex, anything
 * else (NSE stocks, indices) is treated as plain units with lot size 1, never as 100,000-unit forex lots.
 */
export function inferAssetClass(symbol: string): AssetClass {
  const letters = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.length >= 6 && FX_CODES.has(letters.slice(0, 3)) && FX_CODES.has(letters.slice(3, 6)) ? 'forex' : 'stock';
}

/** Quote currency of a forex pair: last three letters of the first six, so broker suffixes (EURUSD.m) are ignored. */
export function forexQuoteCurrency(symbol: string): string | null {
  const letters = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.length >= 6 ? letters.slice(3, 6) : null;
}

export interface PreviewInput {
  direction: TradeDirection;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number | null;
  lotSize: number | null;
  fees: number | null;
  assetClass: AssetClass;
  symbol: string;
  accountCurrency: string | null;
  entryTime: Date | null;
  exitTime: Date | null;
}

export interface Preview {
  /** True when the P&L can be computed in the account currency without guessing. */
  canAuto: boolean;
  /** Why not, in words for the hint under the field. */
  reason: string | null;
  quoteCurrency: string | null;
  gross: number | null;
  net: number | null;
  riskAmount: number | null;
  realisedR: number | null;
  plannedRR: number | null;
  holdingMinutes: number | null;
  warnings: string[];
}

const num = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v);

export function computePreview(i: PreviewInput): Preview {
  const dir = i.direction === 'LONG' ? 1 : -1;
  const multiplier = needsLotSize(i.assetClass) ? (num(i.lotSize) && i.lotSize > 0 ? i.lotSize : null) : 1;
  const quote = i.assetClass === 'forex' || i.assetClass === 'cfd' ? forexQuoteCurrency(i.symbol) : i.accountCurrency;

  let reason: string | null = null;
  if (!num(i.entryPrice) || !num(i.exitPrice) || !num(i.quantity)) reason = 'Enter price, exit and quantity first.';
  else if (multiplier === null) reason = 'Enter the lot size to calculate P&L.';
  else if ((i.assetClass === 'forex' || i.assetClass === 'cfd') && quote && i.accountCurrency && quote !== i.accountCurrency)
    reason = `Quoted in ${quote}; enter the P&L in ${i.accountCurrency}.`;

  const hasInputs = num(i.entryPrice) && num(i.exitPrice) && num(i.quantity) && multiplier !== null;
  const pnl = hasInputs
    ? computePnl({ side: i.direction === 'LONG' ? 'BUY' : 'SELL', quantity: i.quantity!, entryPrice: i.entryPrice!, exitPrice: i.exitPrice!, multiplier: multiplier!, fees: num(i.fees) ? i.fees : 0 })
    : null;
  const gross = pnl ? pnl.grossPnl : null;
  const canAuto = hasInputs && reason === null;
  const fees = num(i.fees) ? i.fees : 0;
  const net = pnl && canAuto ? pnl.netPnl : null;

  const stopDistance = num(i.entryPrice) && num(i.stopLoss) && i.stopLoss > 0 ? Math.abs(i.entryPrice - i.stopLoss) : null;
  const riskAmount = stopDistance !== null && num(i.quantity) && multiplier !== null ? stopDistance * i.quantity * multiplier : null;
  const realisedR = riskAmount && riskAmount > 0 && gross !== null ? (canAuto ? (gross - fees) / riskAmount : gross / riskAmount) : null;
  const plannedRR =
    stopDistance && stopDistance > 0 && num(i.entryPrice) && num(i.takeProfit) && i.takeProfit > 0
      ? Math.abs(i.takeProfit - i.entryPrice) / stopDistance
      : null;

  const warnings: string[] = [];
  if (num(i.entryPrice) && num(i.stopLoss) && i.stopLoss > 0) {
    if (dir === 1 && i.stopLoss >= i.entryPrice) warnings.push('Stop loss is above entry for a long.');
    if (dir === -1 && i.stopLoss <= i.entryPrice) warnings.push('Stop loss is below entry for a short.');
  }
  if (num(i.entryPrice) && num(i.takeProfit) && i.takeProfit > 0) {
    if (dir === 1 && i.takeProfit <= i.entryPrice) warnings.push('Take profit is below entry for a long.');
    if (dir === -1 && i.takeProfit >= i.entryPrice) warnings.push('Take profit is above entry for a short.');
  }

  const holdingMinutes =
    i.entryTime && i.exitTime && i.exitTime.getTime() >= i.entryTime.getTime() ? Math.round((i.exitTime.getTime() - i.entryTime.getTime()) / 60000) : null;

  return { canAuto, reason, quoteCurrency: quote, gross, net, riskAmount, realisedR, plannedRR, holdingMinutes, warnings };
}

/** Outcome that follows the P&L until the user picks one: win → TP hit, loss → SL hit, flat → Breakeven. */
export function outcomeForPnl(pnl: number | null): TradeOutcome | null {
  if (pnl === null || !Number.isFinite(pnl)) return null;
  const r = Number(pnl.toFixed(2));
  return r > 0 ? 'TP' : r < 0 ? 'SL' : 'BREAKEVEN';
}

export function pnlConflictsWithOutcome(pnl: number | null, outcome: TradeOutcome | null): boolean {
  if (pnl === null || outcome === null) return false;
  if (outcome === 'TP') return pnl < 0;
  if (outcome === 'SL') return pnl > 0;
  return false;
}
