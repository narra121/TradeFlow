/**
 * Position size from a risk budget, for the public calculator (/resources/position-size): forex lots from a stop in pips,
 * and shares or contract lots from entry and stop prices. Amounts are in the account currency. Sizes are rounded down,
 * so the loss at the stop never exceeds the budget.
 */

export type RiskBasis = 'percent' | 'amount';
export type Direction = 'long' | 'short';

export interface RiskInput {
  capital: number;
  basis: RiskBasis;
  /** Percent of capital when `basis` is 'percent', otherwise an amount in the capital's currency. */
  risk: number;
}

export type BudgetError = 'capital' | 'risk' | 'risk-over-capital';

/** Absorbs float error such as 300 ÷ 0.1 = 2999.9999999999995, which would otherwise floor one unit short. */
const EPS = 1e-9;
/** Forex sizes step in 0.01 lot. */
const STEPS_PER_LOT = 100;

const fin = (n: number) => Number.isFinite(n);

export function riskBudget({ capital, basis, risk }: RiskInput): { status: 'ok'; budget: number } | { status: 'error'; error: BudgetError } {
  if (!fin(capital) || capital <= 0) return { status: 'error', error: 'capital' };
  if (!fin(risk) || risk <= 0) return { status: 'error', error: 'risk' };
  const budget = basis === 'percent' ? (capital * risk) / 100 : risk;
  if (budget > capital) return { status: 'error', error: 'risk-over-capital' };
  return { status: 'ok', budget };
}

export interface ForexInput extends RiskInput {
  stopPips: number;
  /** Account-currency value of one pip on one lot. */
  pipValuePerLot: number;
  /** Units of the base currency (ounces for gold) in one lot. */
  contractSize: number;
}

export type ForexError = BudgetError | 'stop';

export interface ForexResult {
  status: 'ok';
  budget: number;
  exactLots: number;
  /** Rounded down to 0.01 lot; 0 when even 0.01 lot loses more than the budget at the stop. */
  lots: number;
  units: number;
  /** Loss at the stop with `lots`. */
  riskAtSize: number;
  unused: number;
  /** Loss at the stop on 0.01 lot. */
  minLotRisk: number;
  belowMinimum: boolean;
}

export function forexSize(i: ForexInput): ForexResult | { status: 'error'; error: ForexError } {
  const b = riskBudget(i);
  if (b.status === 'error') return b;
  if (!fin(i.stopPips) || i.stopPips <= 0) return { status: 'error', error: 'stop' };
  const perLot = i.stopPips * i.pipValuePerLot;
  const exactLots = b.budget / perLot;
  const lots = Math.floor(exactLots * STEPS_PER_LOT + EPS) / STEPS_PER_LOT;
  const riskAtSize = lots * perLot;
  return {
    status: 'ok',
    budget: b.budget,
    exactLots,
    lots,
    units: lots * i.contractSize,
    riskAtSize,
    unused: Math.max(0, b.budget - riskAtSize),
    minLotRisk: perLot / STEPS_PER_LOT,
    belowMinimum: lots === 0,
  };
}

export interface PriceInput extends RiskInput {
  direction: Direction;
  /** Share price, futures price or option premium at entry. */
  entry: number;
  stop: number;
  /** Units in one lot; 1 for shares. */
  lotSize: number;
}

export type PriceError = BudgetError | 'entry' | 'stop' | 'stop-equal' | 'stop-side' | 'lot-size';

export interface PriceResult {
  status: 'ok';
  budget: number;
  riskPerUnit: number;
  riskPerLot: number;
  exactLots: number;
  /** Whole lots (whole shares when `lotSize` is 1), rounded down; 0 when one lot loses more than the budget. */
  lots: number;
  quantity: number;
  riskAtSize: number;
  unused: number;
  /** quantity × entry: the cost of shares, the premium of options, the contract value of futures. */
  positionValue: number;
  /** positionValue ÷ capital. */
  capitalShare: number;
  oneLotOverBudget: boolean;
  /** riskPerLot ÷ capital. */
  oneLotRiskShare: number;
}

export function priceSize(i: PriceInput): PriceResult | { status: 'error'; error: PriceError } {
  const b = riskBudget(i);
  if (b.status === 'error') return b;
  if (!fin(i.entry) || i.entry <= 0) return { status: 'error', error: 'entry' };
  if (!fin(i.stop) || i.stop <= 0) return { status: 'error', error: 'stop' };
  if (i.stop === i.entry) return { status: 'error', error: 'stop-equal' };
  if (i.direction === 'long' ? i.stop > i.entry : i.stop < i.entry) return { status: 'error', error: 'stop-side' };
  if (!fin(i.lotSize) || i.lotSize <= 0) return { status: 'error', error: 'lot-size' };

  const riskPerUnit = Math.abs(i.entry - i.stop);
  const riskPerLot = riskPerUnit * i.lotSize;
  const exactLots = b.budget / riskPerLot;
  const lots = Math.floor(exactLots + EPS);
  const quantity = lots * i.lotSize;
  const riskAtSize = lots * riskPerLot;
  const positionValue = quantity * i.entry;
  return {
    status: 'ok',
    budget: b.budget,
    riskPerUnit,
    riskPerLot,
    exactLots,
    lots,
    quantity,
    riskAtSize,
    unused: Math.max(0, b.budget - riskAtSize),
    positionValue,
    capitalShare: positionValue / i.capital,
    oneLotOverBudget: lots === 0,
    oneLotRiskShare: riskPerLot / i.capital,
  };
}
