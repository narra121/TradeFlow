/**
 * Statutory charges on NSE equity futures and options (index and stock), by trade date. Every row is read from the
 * document named in it. Append a row when a rate changes; never edit an old one. Rates are percentages as printed in
 * the source: 0.0125 means 0.0125%. Amounts are rupees and are estimates: the contract note is authoritative.
 */

export const RATES_CHECKED_ON = '2026-11-15';

export interface RateSource {
  /** First trade date (YYYY-MM-DD) the row applies to. */
  effectiveFrom: string;
  circular: string;
  /** Date (YYYY-MM-DD) of the circular or notification the rate was read from. */
  circularDate: string;
  /** URL of the document the rate was read from. */
  source: string;
  note?: string;
}

export interface SttRow extends RateSource {
  futuresSell: number;
  optionsSell: number;
  /** Payable by the purchaser, on the intrinsic value of an option exercised. */
  optionsExercised: number;
}

export const STT_ROWS: SttRow[] = [
  {
    effectiveFrom: '2016-06-01',
    futuresSell: 0.01,
    optionsSell: 0.05,
    optionsExercised: 0.125,
    circular: 'NSE/FATAX/32385',
    circularDate: '2016-05-16',
    source: 'https://nsearchives.nseindia.com/content/circulars/FATAX32385.pdf',
  },
  {
    effectiveFrom: '2023-04-01',
    futuresSell: 0.0125,
    optionsSell: 0.0625,
    optionsExercised: 0.125,
    circular: 'NSE/FATAX/56235',
    circularDate: '2023-04-01',
    source: 'https://nsearchives.nseindia.com/content/circulars/FATAX56235.pdf',
  },
  {
    effectiveFrom: '2024-10-01',
    futuresSell: 0.02,
    optionsSell: 0.1,
    optionsExercised: 0.125,
    circular: 'NSE/FATAX/63809',
    circularDate: '2024-09-09',
    source: 'https://nsearchives.nseindia.com/content/circulars/FATAX63809.pdf',
  },
  {
    effectiveFrom: '2026-04-01',
    futuresSell: 0.05,
    optionsSell: 0.15,
    optionsExercised: 0.15,
    circular: 'NSE/FATAX/73524',
    circularDate: '2026-03-31',
    source: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
  },
];

export interface ExchangeSide {
  /** NSE transaction charge, each side. */
  charge: number;
  /** NSE IPFT contribution levied on the trading member, each side. */
  ipft: number;
}

export interface ExchangeRow extends RateSource {
  /** null: the charge was a volume slab of the trading member, so no single rate applies to a trade. */
  rates: { futures: ExchangeSide; options: ExchangeSide } | null;
  /** IPFT while `rates` is null: the contribution was a flat rate per crore even when the charge was a slab. */
  slabIpft?: { futures: number; options: number };
}

export const EXCHANGE_ROWS: ExchangeRow[] = [
  {
    effectiveFrom: '2023-04-01',
    rates: null,
    slabIpft: { futures: 0.0001, options: 0.0005 },
    circular: 'NSE/FA/56129',
    circularDate: '2023-03-24',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA56129.pdf',
    note: 'Volume slabs per lakh: futures Rs 1.90 to 1.75, options Rs 50.00 to 30.00 (flat Rs 2,500 a month up to Rs 3 crore of premium); IPFT contribution raised to Rs 10 per crore (futures) and Rs 50 per crore (options).',
  },
  {
    effectiveFrom: '2024-04-01',
    rates: null,
    slabIpft: { futures: 0.0001, options: 0.0005 },
    circular: 'NSE/FA/61137',
    circularDate: '2024-03-14',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA61137.pdf',
    note: 'Volume slabs per lakh: futures Rs 1.88 to 1.73, options Rs 49.50 to 29.50 (flat Rs 2,500 a month up to Rs 3 crore of premium).',
  },
  {
    effectiveFrom: '2024-10-01',
    rates: { futures: { charge: 0.00173, ipft: 0.0001 }, options: { charge: 0.03503, ipft: 0.0005 } },
    circular: 'NSE/FA/64232',
    circularDate: '2024-09-27',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA64232.pdf',
    note: 'Flat Rs 1.73 per lakh (futures) and Rs 35.03 per lakh of premium (options). The IPFT contribution of Rs 10 and Rs 50 per crore is stated in NSE/FA/73061.',
  },
  {
    effectiveFrom: '2026-03-01',
    rates: { futures: { charge: 0.0018299, ipft: 0.0000001 }, options: { charge: 0.0355299, ipft: 0.0000001 } },
    circular: 'NSE/FA/73061',
    circularDate: '2026-02-27',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA73061.pdf',
    note: 'IPFT contribution rolled back to Rs 0.01 per crore and the transaction charge raised by the same amount: the total outflow is unchanged at 0.00183% (futures) and 0.03553% (options).',
  },
];

export interface SebiRow extends RateSource {
  pct: number;
}

export const SEBI_ROWS: SebiRow[] = [
  {
    effectiveFrom: '2019-04-01',
    pct: 0.0001,
    circular: 'NSE/FA/40632',
    circularDate: '2019-04-02',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA40632.pdf',
    note: 'Rs 10 per crore of turnover (SEBI notification of 22 Mar 2019). On options, turnover is the premium traded.',
  },
  {
    effectiveFrom: '2020-06-01',
    pct: 0.00005,
    circular: 'NSE/FA/44514',
    circularDate: '2020-05-29',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA44514.pdf',
    note: 'Brokers pay 50% of the fee from 1 Jun 2020 to 31 Mar 2021 (SEBI notification of 8 May 2020).',
  },
  {
    effectiveFrom: '2021-04-01',
    pct: 0.0001,
    circular: 'NSE/FA/44514',
    circularDate: '2020-05-29',
    source: 'https://nsearchives.nseindia.com/content/circulars/FA44514.pdf',
    note: 'The 50% relief in the same circular ended on 31 Mar 2021.',
  },
  {
    effectiveFrom: '2026-01-07',
    pct: 0.0001,
    circular: 'SEBI (Stock Brokers) Regulations, 2026, regulation 41',
    circularDate: '2026-01-07',
    source: 'https://www.sebi.gov.in/sebi_data/attachdocs/jan-2026/1767852346757.pdf',
    note: 'Restates Rs 10 per crore for equity derivatives; the 1992 regulations are repealed. No change in rate.',
  },
];

export interface StampRow extends RateSource {
  /** Payable by the buyer. */
  futuresBuy: number;
  optionsBuy: number;
}

export const STAMP_ROWS: StampRow[] = [
  {
    effectiveFrom: '2020-07-01',
    futuresBuy: 0.002,
    optionsBuy: 0.003,
    circular: 'Indian Stamp Act, 1899, Schedule I, Article 56A(d)',
    circularDate: '2020-03-30',
    source: 'https://dor.gov.in/files/inline-documents/Indian_Stamp_Act_1899.pdf',
    note: 'In force from 1 Jul 2020 (S.O. 1226(E) of 30 Mar 2020; NSE Clearing NCL/CMPT/44033). NSE Clearing NCL/CMPT/43116 states the rates and the buyer as payer; options are valued at the premium.',
  },
];

export interface GstRow extends RateSource {
  /** On brokerage and the exchange transaction charge. */
  services: number;
  /** On the SEBI turnover fee; 0 while SEBI's services were exempt. */
  sebiFee: number;
}

export const GST_ROWS: GstRow[] = [
  {
    effectiveFrom: '2017-07-01',
    services: 18,
    sebiFee: 0,
    circular: 'Notification 11/2017-Central Tax (Rate)',
    circularDate: '2017-06-28',
    source: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification11-CGST.pdf',
    note: 'Heading 9971, entry (v): 9% central tax plus 9% state or union territory tax, or 18% integrated tax (Notification 8/2017-Integrated Tax (Rate)). SEBI fees were exempt until 17 Jul 2022.',
  },
  {
    effectiveFrom: '2022-07-18',
    services: 18,
    sebiFee: 18,
    circular: 'NSE/FATAX/52993',
    circularDate: '2022-07-18',
    source: 'https://nsearchives.nseindia.com/content/circulars/FATAX52993.pdf',
    note: 'GST at 18% on the fees payable to SEBI from 18 Jul 2022 (Notification 04/2022-Central Tax (Rate)).',
  },
];

export interface DatedRow {
  effectiveFrom: string;
}

/** The row in force on `date`: the last row whose effectiveFrom is on or before it. Rows are sorted ascending. */
export function rowOn<T extends DatedRow>(rows: readonly T[], date: string): T | undefined {
  let found: T | undefined;
  for (const row of rows) if (row.effectiveFrom <= date) found = row;
  return found;
}

export const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** A rate without exponent notation or trailing zeros: 0.0000001 → "0.0000001", 0.0125 → "0.0125". */
export const formatPct = (n: number): string => `${n.toFixed(7).replace(/0+$/, '').replace(/\.$/, '')}%`;

export type Leg = 'futures-buy' | 'futures-sell' | 'options-buy' | 'options-sell' | 'options-exercised';
export type PartKey = 'stt' | 'exchange' | 'ipft' | 'sebi' | 'stamp' | 'gst';

export interface Part {
  /** null: no verified rate for this date or leg, so no amount is shown. */
  amount: number | null;
  /** Percent applied; null when no rate was applied. */
  ratePct: number | null;
  /** Why the amount is 0 or not shown; for a charged part, a note about the rate. */
  note?: string;
  row?: RateSource;
}

export interface Charges {
  parts: Record<PartKey, Part>;
  /** As typed, 0 for an exercised option. */
  brokerage: number;
  /** Brokerage plus every part that has an amount. */
  total: number;
  /** False when a part has no verified amount, so the total is partial. */
  complete: boolean;
  pctOfValue: number | null;
}

export interface ChargeInput {
  /** Trade date, YYYY-MM-DD. */
  date: string;
  leg: Leg;
  /** Traded value (futures), premium value (options), intrinsic value (exercised option), in rupees. */
  value: number;
  brokerage: number;
}

const r2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;
const clean = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

const NOT_VERIFIED = 'not shown: source not verified for this date';
const missing = (note: string): Part => ({ amount: null, ratePct: null, note });
const notCharged = (note: string): Part => ({ amount: 0, ratePct: null, note });
const charged = (value: number, pct: number, row: RateSource, note?: string): Part => ({
  amount: r2((value * pct) / 100),
  ratePct: pct,
  row,
  note,
});

export function calculateCharges(input: ChargeInput): Charges {
  const { date, leg } = input;
  const exercised = leg === 'options-exercised';
  const value = clean(input.value);
  const brokerage = exercised ? 0 : r2(clean(input.brokerage));
  const side = leg.startsWith('futures') ? 'futures' : 'options';
  const known = isIsoDate(date);

  const sttRow = known ? rowOn(STT_ROWS, date) : undefined;
  const exchangeRow = known ? rowOn(EXCHANGE_ROWS, date) : undefined;
  const sebiRow = known ? rowOn(SEBI_ROWS, date) : undefined;
  const stampRow = known ? rowOn(STAMP_ROWS, date) : undefined;
  const gstRow = known ? rowOn(GST_ROWS, date) : undefined;
  const sides = exchangeRow?.rates?.[side];

  let stt: Part;
  if (!sttRow) stt = missing(NOT_VERIFIED);
  else if (leg === 'futures-sell') stt = charged(value, sttRow.futuresSell, sttRow, 'on the sale, payable by the seller');
  else if (leg === 'options-sell') stt = charged(value, sttRow.optionsSell, sttRow, 'on the premium of the sale, payable by the seller');
  else if (exercised) stt = charged(value, sttRow.optionsExercised, sttRow, 'on the intrinsic value, payable by the purchaser');
  else stt = notCharged('no STT on buying a futures contract or an option');

  const notForExercise = missing('not calculated for exercised options');
  const slabs = missing(`not shown: the rate was a volume slab of the broker (${exchangeRow?.circular})`);
  const volumeSlabsOrMissing = exchangeRow ? slabs : missing(NOT_VERIFIED);
  const exchange = exercised ? notForExercise : sides && exchangeRow ? charged(value, sides.charge, exchangeRow) : volumeSlabsOrMissing;
  const ipftPct = sides?.ipft ?? exchangeRow?.slabIpft?.[side];
  const ipft = exercised ? notForExercise : ipftPct !== undefined && exchangeRow ? charged(value, ipftPct, exchangeRow) : volumeSlabsOrMissing;
  const sebi = exercised
    ? missing('not calculated for exercised options: the fee also applies to the notional value')
    : sebiRow
      ? charged(value, sebiRow.pct, sebiRow)
      : missing(NOT_VERIFIED);

  let stamp: Part;
  if (exercised) stamp = notForExercise;
  else if (leg === 'futures-sell' || leg === 'options-sell') stamp = notCharged('stamp duty is charged on the buyer');
  else if (!stampRow) stamp = missing(NOT_VERIFIED);
  else stamp = charged(value, leg === 'futures-buy' ? stampRow.futuresBuy : stampRow.optionsBuy, stampRow);

  let gst: Part;
  if (exercised) gst = notForExercise;
  else if (!gstRow) gst = missing(NOT_VERIFIED);
  else if (exchange.amount === null || sebi.amount === null) gst = missing('not shown: needs the exchange charge and the SEBI fee');
  else {
    const exactExchange = (value * (sides?.charge ?? 0)) / 100;
    const exactSebi = (value * (sebiRow?.pct ?? 0)) / 100;
    gst = {
      amount: r2(((brokerage + exactExchange) * gstRow.services + exactSebi * gstRow.sebiFee) / 100),
      ratePct: gstRow.services,
      row: gstRow,
      note: `on brokerage and the exchange transaction charge${gstRow.sebiFee === 0 ? '' : ' and the SEBI fee'}; the IPFT contribution is not in the base`,
    };
  }

  const parts: Record<PartKey, Part> = { stt, exchange, ipft, sebi, stamp, gst };
  const list = Object.values(parts);
  const total = r2(brokerage + list.reduce((sum, p) => sum + (p.amount ?? 0), 0));
  return {
    parts,
    brokerage,
    total,
    complete: list.every((p) => p.amount !== null),
    pctOfValue: value > 0 ? (total / value) * 100 : null,
  };
}

export interface RateChange {
  effectiveFrom: string;
  charge: string;
  /** null when the row before it is not in this table. */
  before: string | null;
  now: string;
  circular: string;
  circularDate: string;
  source: string;
}

const sttText = (r: SttRow): string =>
  `futures sale ${formatPct(r.futuresSell)}, options sale ${formatPct(r.optionsSell)}, options exercised ${formatPct(r.optionsExercised)}`;

const exchangeText = (r: ExchangeRow): string =>
  r.rates
    ? `futures ${formatPct(r.rates.futures.charge)} + IPFT ${formatPct(r.rates.futures.ipft)}, options ${formatPct(r.rates.options.charge)} + IPFT ${formatPct(r.rates.options.ipft)}`
    : `volume slabs (${r.circular})${r.slabIpft ? `; IPFT futures ${formatPct(r.slabIpft.futures)}, options ${formatPct(r.slabIpft.options)}` : ''}`;

/** Every row dated on or after `since` that changes a rate, each with the row it replaced in the same series, oldest first. */
export function rateChangesSince(since: string): RateChange[] {
  const out: RateChange[] = [];
  const add = <T extends RateSource>(rows: readonly T[], charge: string, text: (r: T) => string) => {
    rows.forEach((row, i) => {
      if (row.effectiveFrom < since) return;
      const before = i > 0 ? text(rows[i - 1]) : null;
      if (before === text(row)) return;
      out.push({
        effectiveFrom: row.effectiveFrom,
        charge,
        before,
        now: text(row),
        circular: row.circular,
        circularDate: row.circularDate,
        source: row.source,
      });
    });
  };
  add(STT_ROWS, 'STT', sttText);
  add(EXCHANGE_ROWS, 'NSE transaction charge and IPFT', exchangeText);
  add(SEBI_ROWS, 'SEBI turnover fee', (r) => formatPct(r.pct));
  add(STAMP_ROWS, 'Stamp duty (buyer)', (r) => `futures ${formatPct(r.futuresBuy)}, options ${formatPct(r.optionsBuy)}`);
  add(GST_ROWS, 'GST', (r) => `${formatPct(r.services)} on brokerage and exchange charges, ${formatPct(r.sebiFee)} on the SEBI fee`);
  return out.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}
