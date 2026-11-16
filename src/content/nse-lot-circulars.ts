/**
 * NSE circulars on F&O lot sizes, each opened and read on LOT_DATA_CHECKED. A row is added only after its circular
 * has been opened; the lots are copied from the circular's own table.
 *
 * NSE's Terms of Use bar republishing its website content and data without written permission, so this module holds
 * circular facts only and never the contents of fo_mktlots.csv (the page lets a visitor load that file in the browser).
 * Wording and URLs of the terms: TradeQut-Research/seo/scratch/link-assets/lots/sources.md.
 */

export const LOT_DATA_CHECKED = '2026-11-15';

export const NSE_LOT_FILE_URL = 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv';
export const NSE_TERMS_URL = 'https://www.nseindia.com/static/nse-terms-of-use';
export const NSE_COPYRIGHT_URL = 'https://www.nseindia.com/static/nse-copyright';
export const NSE_CONTRACT_INFO_URL = 'https://www.nseindia.com/products-services/equity-derivatives-contract-information';

const CIRCULAR_BASE = 'https://nsearchives.nseindia.com/content/circulars/';

export const INDEX_COLUMNS = [
  { symbol: 'NIFTY', name: 'Nifty 50' },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank' },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services' },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Mid Select' },
  { symbol: 'NIFTYNXT50', name: 'Nifty Next 50' },
] as const;

export type IndexSymbol = (typeof INDEX_COLUMNS)[number]['symbol'];

/** `from === to` means the circular lists the index and leaves its lot as it was. */
export interface LotChange {
  from: number;
  to: number;
}

export interface IndexLotCircular {
  /** Circular date, YYYY-MM-DD. */
  date: string;
  ref: string;
  number: string;
  url: string;
  effective: string;
  rule: string;
  /** An index missing here is not listed in that circular (it was not yet traded or was out of scope). */
  lots: Partial<Record<IndexSymbol, LotChange>>;
}

/** Newest first. */
export const INDEX_LOT_CIRCULARS: IndexLotCircular[] = [
  {
    date: '2025-10-03',
    ref: 'NSE/FAOP/70616',
    number: '176/2025',
    url: `${CIRCULAR_BASE}FAOP70616.pdf`,
    effective: '28 Oct 2025, end of day',
    rule: 'Existing weekly and monthly contracts keep the old lot until the 30 Dec 2025 expiry. First expiries at the new lot: Nifty weekly 6 Jan 2026, monthly 27 Jan 2026 (Bank Nifty, Fin Services and Mid Select as well). Quarterly and half-yearly contracts switch at the end of the day on 30 Dec 2025.',
    lots: {
      NIFTY: { from: 75, to: 65 },
      BANKNIFTY: { from: 35, to: 30 },
      FINNIFTY: { from: 65, to: 60 },
      MIDCPNIFTY: { from: 140, to: 120 },
      NIFTYNXT50: { from: 25, to: 25 },
    },
  },
  {
    date: '2025-03-28',
    ref: 'NSE/FAOP/67372',
    number: '50/2025',
    url: `${CIRCULAR_BASE}FAOP67372.pdf`,
    effective: '25 Apr 2025',
    rule: 'The monthly expiries of 24 Apr, 29 May and 26 Jun 2025 keep the old lot; the first monthly expiry at the new lot is 31 Jul 2025. New contracts generated from the end of day on 24 Apr 2025, and quarterly contracts available from 25 Apr 2025, carry the new lot. Only Nifty Bank and Nifty Mid Select changed.',
    lots: {
      NIFTY: { from: 75, to: 75 },
      BANKNIFTY: { from: 30, to: 35 },
      FINNIFTY: { from: 65, to: 65 },
      MIDCPNIFTY: { from: 120, to: 140 },
      NIFTYNXT50: { from: 25, to: 25 },
    },
  },
  {
    date: '2024-10-18',
    ref: 'NSE/FAOP/64625',
    number: '128/2024',
    url: `${CIRCULAR_BASE}FAOP64625.pdf`,
    effective: 'New contracts from 20 Nov 2024',
    rule: 'Existing weekly and monthly contracts keep the old lot until their expiry. Quarterly and half-yearly contracts switch at the end of the day on 24 Dec 2024 (Bank Nifty) and 26 Dec 2024 (Nifty). First expiries at the new lot: Nifty weekly 2 Jan 2025, monthly 27 Feb 2025.',
    lots: {
      NIFTY: { from: 25, to: 75 },
      BANKNIFTY: { from: 15, to: 30 },
      FINNIFTY: { from: 25, to: 65 },
      MIDCPNIFTY: { from: 50, to: 120 },
      NIFTYNXT50: { from: 10, to: 25 },
    },
  },
  {
    date: '2024-04-02',
    ref: 'NSE/FAOP/61415',
    number: '37/2024',
    url: `${CIRCULAR_BASE}FAOP61415.pdf`,
    effective: '26 Apr 2024',
    rule: 'Nifty: every contract available from 26 Apr 2024 carries the new lot; the monthly expiry of 25 Apr 2024 did not change. First expiries at the new lot: weekly 2 May 2024, monthly 30 May 2024. Fin Services and Mid Select: first monthly expiry at the new lot July 2024, weekly contracts from August 2024.',
    lots: {
      NIFTY: { from: 50, to: 25 },
      BANKNIFTY: { from: 15, to: 15 },
      FINNIFTY: { from: 40, to: 25 },
      MIDCPNIFTY: { from: 75, to: 50 },
    },
  },
  {
    date: '2023-03-31',
    ref: 'NSE/FAOP/56233',
    number: '62/2023',
    url: `${CIRCULAR_BASE}FAOP56233.pdf`,
    effective: '28 Apr 2023',
    rule: 'Only Nifty Bank changed. The July 2023 monthly expiry and later carry the new lot, the April to June 2023 monthly contracts keep 25, and weekly contracts from August 2023 carry the new lot. Bank Nifty long-term options (more than 3 months) switch after the 30 Jun 2023 expiry.',
    lots: {
      NIFTY: { from: 50, to: 50 },
      BANKNIFTY: { from: 25, to: 15 },
      FINNIFTY: { from: 40, to: 40 },
      MIDCPNIFTY: { from: 75, to: 75 },
    },
  },
  {
    date: '2021-03-31',
    ref: 'NSE/FAOP/47854',
    number: '28/2021',
    url: `${CIRCULAR_BASE}FAOP47854.pdf`,
    effective: '30 Apr 2021',
    rule: 'Only Nifty 50 changed. The July 2021 monthly expiry and later carry the new lot, the May and June 2021 monthly contracts keep 75, and weekly contracts from August 2021 carry the new lot. Nifty long-term options (more than 3 months) switch after the 25 Jun 2021 expiry.',
    lots: {
      NIFTY: { from: 75, to: 50 },
      BANKNIFTY: { from: 25, to: 25 },
      FINNIFTY: { from: 40, to: 40 },
    },
  },
];

export interface StockLotCircular {
  date: string;
  ref: string;
  number: string;
  /** A zip holding the circular PDF and an annexure listing each stock; the annexure is not copied here. */
  url: string;
  effective: string;
  lowered: number;
  raised: number;
  /** Lowered to a lot that is not a multiple of the old one. */
  loweredNotMultiple: number;
  unchanged: number;
  rule: string;
}

/** Newest first. */
export const STOCK_LOT_CIRCULARS: StockLotCircular[] = [
  {
    date: '2026-09-30',
    ref: 'NSE/FAOP/76657',
    number: '134/2026',
    url: `${CIRCULAR_BASE}FAOP76657.zip`,
    effective: '28 Oct 2026',
    lowered: 7,
    raised: 27,
    loweredNotMultiple: 9,
    unchanged: 167,
    rule: 'The 7 lowered lots apply to November 2026 and later expiries. For the 27 raised and the 9 lowered-but-not-a-multiple stocks, the November and December 2026 contracts keep the old lot and January 2027 and later contracts carry the new one. BAJAJHLDNG, IEX and IREDA leave the F&O segment from 28 Oct 2026 and were not reviewed.',
  },
  {
    date: '2026-03-30',
    ref: 'NSE/FAOP/73549',
    number: '41/2026',
    url: `${CIRCULAR_BASE}FAOP73549.zip`,
    effective: '29 Apr 2026',
    lowered: 5,
    raised: 43,
    loweredNotMultiple: 2,
    unchanged: 151,
    rule: 'The 5 lowered lots apply to May 2026 and later expiries. For the 43 raised and the 2 lowered-but-not-a-multiple stocks, the May and June 2026 contracts keep the old lot and July 2026 and later contracts carry the new one. HUDCO, PPLPHARMA, TATATECH and TORNTPOWER leave the F&O segment from 29 Apr 2026 and were not reviewed.',
  },
];

export const FREEZE_LIMITS = {
  ref: 'NSE/FAOP/77189',
  number: '149/2026',
  date: '2026-10-30',
  effective: '2 Nov 2026',
  url: `${CIRCULAR_BASE}FAOP77189.pdf`,
  rows: [
    { symbol: 'NIFTY', limit: 1800 },
    { symbol: 'BANKNIFTY', limit: 900 },
    { symbol: 'FINNIFTY', limit: 1800 },
    { symbol: 'MIDCPNIFTY', limit: 2800 },
    { symbol: 'NIFTYNXT50', limit: 600 },
    { symbol: 'NIFTYFPI', limit: 8500 },
  ],
};
