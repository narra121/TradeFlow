import { describe, it, expect } from 'vitest';
import {
  LIMIT_ONE_CRORE,
  LIMIT_TEN_CRORE,
  compareToLimit,
  computeFoTurnover,
  parseAmount,
  parsePnlList,
  type TurnoverInputs,
} from '../tax/foTurnover';

const zero: TurnoverInputs = { futuresProfits: 0, futuresLosses: 0, optionsProfits: 0, optionsLosses: 0, premiumReceived: 0, otherTurnover: 0 };

describe('computeFoTurnover', () => {
  it('does not net profits against losses: equal profit and loss is twice the amount, not zero', () => {
    const r = computeFoTurnover({ ...zero, futuresProfits: 100_000, futuresLosses: 100_000 });
    expect(r.futures).toBe(200_000);
    expect(r.premiumAdded.total).toBe(200_000);
    expect(r.premiumNotAdded.total).toBe(200_000);
  });

  it('adds futures and options differences for the same total', () => {
    const r = computeFoTurnover({ ...zero, futuresProfits: 600_000, futuresLosses: 590_000, optionsProfits: 250_000, optionsLosses: 310_000 });
    expect(r.futures).toBe(1_190_000);
    expect(r.optionsDifferences).toBe(560_000);
    expect(r.premiumNotAdded.total).toBe(1_750_000);
  });

  it('shows both premium variants: added on top of the differences, or not added separately', () => {
    const r = computeFoTurnover({ ...zero, futuresProfits: 10_000, optionsProfits: 40_000, optionsLosses: 20_000, premiumReceived: 500_000 });
    expect(r.premiumReceived).toBe(500_000);
    expect(r.premiumAdded).toEqual({ options: 560_000, total: 570_000 });
    expect(r.premiumNotAdded).toEqual({ options: 60_000, total: 70_000 });
  });

  it('gives the same total in both variants when no premium is entered', () => {
    const r = computeFoTurnover({ ...zero, optionsProfits: 5_000, optionsLosses: 1_000 });
    expect(r.premiumAdded).toEqual(r.premiumNotAdded);
  });

  it('adds other business turnover to the total, not to options', () => {
    const r = computeFoTurnover({ ...zero, optionsProfits: 1_000, otherTurnover: 2_500_000 });
    expect(r.premiumNotAdded).toEqual({ options: 1_000, total: 2_501_000 });
  });

  it('is zero for all-zero input', () => {
    const r = computeFoTurnover(zero);
    expect(r.premiumAdded).toEqual({ options: 0, total: 0 });
    expect(r.premiumNotAdded).toEqual({ options: 0, total: 0 });
  });

  it('sums paise exactly, without binary floating-point drift', () => {
    const r = computeFoTurnover({ ...zero, futuresProfits: 0.1, futuresLosses: 0.2 });
    expect(r.futures).toBe(0.3);
  });
});

describe('parseAmount', () => {
  it('reads rupee text with the sign, Indian grouping and spaces', () => {
    expect(parseAmount('₹1,25,000.50')).toEqual({ value: 125000.5, error: null });
    expect(parseAmount(' Rs. 2,500 ')).toEqual({ value: 2500, error: null });
    expect(parseAmount('INR 10')).toEqual({ value: 10, error: null });
    expect(parseAmount('+7')).toEqual({ value: 7, error: null });
  });

  it('treats empty and zero as zero without an error', () => {
    expect(parseAmount('')).toEqual({ value: 0, error: null });
    expect(parseAmount('   ')).toEqual({ value: 0, error: null });
    expect(parseAmount('0')).toEqual({ value: 0, error: null });
    expect(parseAmount('₹0.00')).toEqual({ value: 0, error: null });
  });

  it('flags a negative amount instead of using it', () => {
    expect(parseAmount('-5000')).toEqual({ value: 0, error: 'negative' });
    expect(parseAmount('₹-5,000')).toEqual({ value: 0, error: 'negative' });
    expect(parseAmount('(5000)')).toEqual({ value: 0, error: 'negative' });
  });

  it('flags text that is not a single number', () => {
    for (const bad of ['abc', '12abc', '1 2', '1e5', '5%', '₹']) expect(parseAmount(bad).error, bad).toBe('invalid');
  });
});

describe('parsePnlList', () => {
  it('splits profits and losses by sign and counts the lines read', () => {
    expect(parsePnlList('1200\n-300\n450.50\n-50')).toEqual({ profits: 1650.5, losses: 350, lines: 4, ignored: [] });
  });

  it('skips blank lines and accepts commas, the rupee sign, a unicode minus and brackets', () => {
    const text = '₹1,25,000\r\n\r\n  -₹40,000.25  \n\n₹ 2,500\n−1,000\n(500)\n';
    expect(parsePnlList(text)).toEqual({ profits: 127500, losses: 41500.25, lines: 5, ignored: [] });
  });

  it('counts a zero line as read and adds nothing', () => {
    expect(parsePnlList('0\n0.00')).toEqual({ profits: 0, losses: 0, lines: 2, ignored: [] });
  });

  it('returns zeros for an empty paste', () => {
    expect(parsePnlList('')).toEqual({ profits: 0, losses: 0, lines: 0, ignored: [] });
    expect(parsePnlList('\n \n\t\n')).toEqual({ profits: 0, losses: 0, lines: 0, ignored: [] });
  });

  it('reports a header or a line with two numbers instead of summing it', () => {
    const r = parsePnlList('Realised P&L\n1000\n200 300\n-400');
    expect(r).toEqual({ profits: 1000, losses: 400, lines: 2, ignored: ['Realised P&L', '200 300'] });
  });

  it('keeps profits and losses separate so the turnover is their sum, never their difference', () => {
    const list = parsePnlList('500\n-500');
    expect(computeFoTurnover({ ...zero, futuresProfits: list.profits, futuresLosses: list.losses }).futures).toBe(1000);
  });
});

describe('compareToLimit', () => {
  it('reports above, equal and below with the gap in rupees; equal is not above', () => {
    expect(compareToLimit(LIMIT_ONE_CRORE + 0.01, LIMIT_ONE_CRORE)).toEqual({ relation: 'above', difference: 0.01 });
    expect(compareToLimit(LIMIT_ONE_CRORE, LIMIT_ONE_CRORE)).toEqual({ relation: 'equal', difference: 0 });
    expect(compareToLimit(9_500_000, LIMIT_ONE_CRORE)).toEqual({ relation: 'below', difference: 500_000 });
  });

  it('uses one crore and ten crore as the two limits', () => {
    expect(LIMIT_ONE_CRORE).toBe(1_00_00_000);
    expect(LIMIT_TEN_CRORE).toBe(10_00_00_000);
    expect(compareToLimit(50_000_000, LIMIT_TEN_CRORE).relation).toBe('below');
    expect(compareToLimit(50_000_000, LIMIT_ONE_CRORE).relation).toBe('above');
  });
});
