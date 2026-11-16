/**
 * Expectancy and break-even win rate for the public calculator (/resources/expectancy-calculator).
 * Amounts are in one unit throughout: account currency, or R when the average loss is 1R.
 * Charges are a cost on every trade, so a net win is avgWin − charges and a net loss is avgLoss + charges.
 */

export interface ExpectancyInput {
  /** Percent, 0 to 100. */
  winRatePct: number;
  avgWin: number;
  /** Size of the average loss; the sign is ignored (−50 and 50 both mean a 50 loss). */
  avgLoss: number;
  /** Per trade, round trip; 0 when not entered. */
  charges?: number;
}

export type ExpectancyError = 'win-rate-range' | 'negative-win' | 'negative-charges' | 'not-a-number';

export interface ExpectancyResult {
  status: 'ok';
  /** Net of charges, per trade. */
  expectancy: number;
  /** Before charges, per trade. */
  grossExpectancy: number;
  /** Expectancy ÷ average loss; null when the average loss is 0 (no risk unit). */
  expectancyR: number | null;
  /** avgWin ÷ avgLoss; null when the average loss is 0. */
  rewardRisk: number | null;
  /** Percent; null when there are no wins and no losses to compare (avgWin + avgLoss = 0). May exceed 100: charges eat the whole win. */
  breakEvenPct: number | null;
  breakEvenGrossPct: number | null;
  /** Gross profit ÷ gross loss, both after charges; Infinity when nothing loses, null when wins do not cover charges. */
  profitFactor: number | null;
}

export type ExpectancyOutcome = ExpectancyResult | { status: 'error'; error: ExpectancyError };

/** Break-even win rate in percent: the p that solves p·(W − c) = (1 − p)·(L + c), i.e. (L + c) ÷ (W + L). */
export function breakEvenWinRatePct(avgWin: number, avgLoss: number, charges = 0): number | null {
  const loss = Math.abs(avgLoss);
  if (avgWin + loss <= 0) return null;
  return ((loss + charges) / (avgWin + loss)) * 100;
}

/**
 * Break-even win rate for a reward:risk of 1:`rewardRisk`, with charges expressed as a share of the risk
 * (`chargesInR` = charges ÷ average loss). Null for a ratio ≤ 0.
 */
export function breakEvenForRatioPct(rewardRisk: number, chargesInR = 0): number | null {
  if (!(rewardRisk > 0)) return null;
  return ((1 + chargesInR) / (1 + rewardRisk)) * 100;
}

export function computeExpectancy(input: ExpectancyInput): ExpectancyOutcome {
  const { winRatePct, avgWin } = input;
  const charges = input.charges ?? 0;
  if (![winRatePct, avgWin, input.avgLoss, charges].every(Number.isFinite)) return { status: 'error', error: 'not-a-number' };
  if (winRatePct < 0 || winRatePct > 100) return { status: 'error', error: 'win-rate-range' };
  if (avgWin < 0) return { status: 'error', error: 'negative-win' };
  if (charges < 0) return { status: 'error', error: 'negative-charges' };

  const loss = Math.abs(input.avgLoss);
  const p = winRatePct / 100;
  const q = 1 - p;
  const grossExpectancy = p * avgWin - q * loss;
  const expectancy = grossExpectancy - charges;
  const netWin = avgWin - charges;
  const netLoss = loss + charges;

  let profitFactor: number | null;
  if (p > 0 && netWin <= 0) profitFactor = null;
  else if (q === 0 || netLoss === 0) profitFactor = p > 0 ? Infinity : null;
  else profitFactor = (p * netWin) / (q * netLoss);

  return {
    status: 'ok',
    expectancy,
    grossExpectancy,
    expectancyR: loss > 0 ? expectancy / loss : null,
    rewardRisk: loss > 0 ? avgWin / loss : null,
    breakEvenPct: breakEvenWinRatePct(avgWin, loss, charges),
    breakEvenGrossPct: breakEvenWinRatePct(avgWin, loss, 0),
    profitFactor,
  };
}

/** Reward:risk ratios shown in the break-even table. */
export const BREAK_EVEN_RATIOS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5] as const;
