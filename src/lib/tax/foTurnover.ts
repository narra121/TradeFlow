/**
 * F&O turnover for tax-audit purposes by the ICAI method: Guidance Note on Tax Audit under section 44AB of the
 * Income-tax Act, 1961 (Revised 2026, 11th edition), para 5.11(b). Limits are section 44AB(a) as printed in para 3.1.
 * Amounts are rupees. Sums run in whole paise so totals and limit comparisons are exact.
 */

export const LIMIT_ONE_CRORE = 10_000_000;
/** Applies in place of one crore when cash receipts and cash payments are each 5% or less of the totals. */
export const LIMIT_TEN_CRORE = 100_000_000;

const toPaise = (rupees: number): number => Math.round(rupees * 100);

const CURRENCY_MARKS = /₹|\brs\.?|\binr\b/gi;

/** One signed number from text such as "₹1,25,000.50", "-500", "−500" or "(500)"; null when the text is not a single number. */
function numberFrom(text: string): number | null {
  let s = text.replace(CURRENCY_MARKS, '').replace(/[, ]/g, '').replace(/[−–]/g, '-').trim();
  const bracketed = /^\((.*)\)$/.exec(s);
  if (bracketed) s = `-${bracketed[1].trim()}`;
  const m = /^([+-]?)\s*(\d+\.?\d*|\.\d+)$/.exec(s);
  if (!m) return null;
  return m[1] === '-' ? -Number(m[2]) : Number(m[2]);
}

export type AmountError = 'invalid' | 'negative';
export interface Amount {
  value: number;
  error: AmountError | null;
}

/** A field that holds a rupee amount of zero or more. Empty is 0; text that is not a number, and a negative number, are errors (value 0). */
export function parseAmount(text: string): Amount {
  if (text.trim() === '') return { value: 0, error: null };
  const n = numberFrom(text);
  if (n === null) return { value: 0, error: 'invalid' };
  if (n < 0) return { value: 0, error: 'negative' };
  return { value: n, error: null };
}

export interface PnlList {
  /** Sum of the positive lines. */
  profits: number;
  /** Sum of the negative lines, as a positive number. */
  losses: number;
  /** Lines read as a number, zero included. */
  lines: number;
  /** Non-blank lines that are not a single number (a header, two numbers on one line); they add nothing. */
  ignored: string[];
}

/** One realised P&L per line; blank lines are skipped. */
export function parsePnlList(text: string): PnlList {
  let profits = 0;
  let losses = 0;
  let lines = 0;
  const ignored: string[] = [];
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const n = numberFrom(line);
    if (n === null) {
      ignored.push(line);
      continue;
    }
    lines++;
    if (n > 0) profits += toPaise(n);
    else if (n < 0) losses += toPaise(-n);
  }
  return { profits: profits / 100, losses: losses / 100, lines, ignored };
}

/** Every amount is zero or more; profits and losses are both entered as positive numbers. */
export interface TurnoverInputs {
  futuresProfits: number;
  futuresLosses: number;
  optionsProfits: number;
  optionsLosses: number;
  /** Premium received on options sold. */
  premiumReceived: number;
  /** Turnover from other business that the user adds to the same total. */
  otherTurnover: number;
}

export interface TurnoverReading {
  options: number;
  total: number;
}

export interface TurnoverResult {
  futures: number;
  optionsDifferences: number;
  premiumReceived: number;
  other: number;
  /** Para 5.11(b)(ii), first sentence: the premium received on options sold is added to the differences. */
  premiumAdded: TurnoverReading;
  /** Para 5.11(b)(ii), second sentence read as "the premium is already in the figures": nothing is added for it. */
  premiumNotAdded: TurnoverReading;
}

/** Profits and losses are added as positive amounts, never netted (para 5.11(a) and (b)(i)). */
export function computeFoTurnover(i: TurnoverInputs): TurnoverResult {
  const futures = toPaise(i.futuresProfits) + toPaise(i.futuresLosses);
  const differences = toPaise(i.optionsProfits) + toPaise(i.optionsLosses);
  const premium = toPaise(i.premiumReceived);
  const other = toPaise(i.otherTurnover);
  return {
    futures: futures / 100,
    optionsDifferences: differences / 100,
    premiumReceived: premium / 100,
    other: other / 100,
    premiumAdded: { options: (differences + premium) / 100, total: (futures + differences + premium + other) / 100 },
    premiumNotAdded: { options: differences / 100, total: (futures + differences + other) / 100 },
  };
}

export type Relation = 'above' | 'equal' | 'below';

/** Section 44AB(a) speaks of turnover that "exceeds" the limit: equal is not above. */
export function compareToLimit(total: number, limit: number): { relation: Relation; difference: number } {
  const diff = toPaise(total) - toPaise(limit);
  return { relation: diff > 0 ? 'above' : diff < 0 ? 'below' : 'equal', difference: Math.abs(diff) / 100 };
}
