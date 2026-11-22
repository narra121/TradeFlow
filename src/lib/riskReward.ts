/**
 * Risk-reward arithmetic for the calculator (/resources/risk-reward) and the guide (/blog/risk-reward-ratio-guide).
 * Risk and reward are price distances per unit; the ratio is reward ÷ risk, written 1 : ratio. Costs are not included.
 */
import { BREAK_EVEN_RATIOS, breakEvenForRatioPct } from './expectancy';

export type TradeDirection = 'long' | 'short';

export interface RiskRewardInput {
  direction: TradeDirection;
  entry: number;
  stop: number;
  target: number;
}

export type RiskRewardResult =
  | { status: 'ok'; risk: number; reward: number; ratio: number; breakEvenPct: number }
  /** A stop on or past the entry gives no risk; a target on or behind it gives no reward. Both can be wrong at once. */
  | { status: 'error'; stopWrongSide: boolean; targetWrongSide: boolean };

export function riskReward({ direction, entry, stop, target }: RiskRewardInput): RiskRewardResult {
  const sign = direction === 'long' ? 1 : -1;
  const risk = sign * (entry - stop);
  const reward = sign * (target - entry);
  if (!(risk > 0) || !(reward > 0)) return { status: 'error', stopWrongSide: !(risk > 0), targetWrongSide: !(reward > 0) };
  const ratio = reward / risk;
  return { status: 'ok', risk, reward, ratio, breakEvenPct: breakEvenAtRatioPct(ratio) };
}

/**
 * Win rate in percent at which wins of `ratio` R and losses of 1R cancel: 1 ÷ (1 + ratio). `costR` is costs per trade
 * as a share of the risk. NaN for a ratio ≤ 0.
 */
export function breakEvenAtRatioPct(ratio: number, costR = 0): number {
  return breakEvenForRatioPct(ratio, costR) ?? NaN;
}

/** Average result per trade in R at a win rate (percent), with wins of `ratio` R and losses of 1R, before costs. */
export function resultPerTradeR(ratio: number, winRatePct: number): number {
  const p = winRatePct / 100;
  return p * ratio - (1 - p);
}

/** Rows of the break-even tables on the calculator and the guide: the expectancy calculator's list, so all three agree. */
export const RATIO_TABLE = BREAK_EVEN_RATIOS;
