// One futures position three ways: P&L from entry price, daily mark-to-market (MTM), realised P&L at exit.
// Amounts are in price units x quantity, before charges. Separate from index.ts: this is explanatory, not the journal engine.
import { round2 } from './index';

export type Direction = 'long' | 'short';

export const MAX_SETTLEMENTS = 5;

export interface MtmInput {
  direction: Direction;
  /** Units, i.e. lots x lot size. */
  quantity: number;
  entryPrice: number;
  /** Settlement price at the end of each day the position stays open, oldest first. Empty = squared off the day it was opened. */
  settlements: number[];
  /** Square-off price, after the last settlement. */
  exitPrice: number;
}

export interface MtmRow {
  kind: 'settlement' | 'exit';
  day: number;
  price: number;
  /** (price - entry) x quantity, signed for direction. */
  fromEntry: number;
  /** Change since the previous reference price: the entry price for day 1, the previous settlement after that. */
  mtm: number;
  /** Running sum of `mtm`; equals `fromEntry` on every row. */
  ledgerTotal: number;
}

export type MtmResult = { status: 'ok'; rows: MtmRow[]; realised: number } | { status: 'error'; error: string };

/**
 * `fromEntry` is rounded to 2 decimals and each `mtm` is the difference of two such figures, so the rows add up to
 * `realised` to the paisa for any input, and each row is within 0.01 of the unrounded value.
 */
export function computeMtm(input: MtmInput): MtmResult {
  const { direction, quantity, entryPrice, settlements, exitPrice } = input;
  if (!Number.isFinite(quantity) || quantity <= 0) return { status: 'error', error: 'Quantity must be above zero.' };
  if (![entryPrice, exitPrice, ...settlements].every((p) => Number.isFinite(p) && p > 0)) {
    return { status: 'error', error: 'Every price must be a number above zero.' };
  }
  if (settlements.length > MAX_SETTLEMENTS) return { status: 'error', error: `Use at most ${MAX_SETTLEMENTS} settlement prices.` };

  const sign = direction === 'long' ? 1 : -1;
  let previousFromEntry = 0;
  let ledgerTotal = 0;
  const rows = [...settlements, exitPrice].map((price, i): MtmRow => {
    const fromEntry = round2(sign * (price - entryPrice) * quantity);
    const mtm = round2(fromEntry - previousFromEntry);
    previousFromEntry = fromEntry;
    ledgerTotal = round2(ledgerTotal + mtm);
    return { kind: i < settlements.length ? 'settlement' : 'exit', day: i + 1, price, fromEntry, mtm, ledgerTotal };
  });
  return { status: 'ok', rows, realised: rows[rows.length - 1].fromEntry };
}
