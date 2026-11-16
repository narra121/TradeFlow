/**
 * Figures for /sebi-fo-study. Each value is copied from the SEBI document and PDF page named in the same row,
 * where PDF page is the page counter of a PDF viewer (the `#page=` fragment), not the printed footer.
 */

export type SebiDocId = 'jan2023' | 'jul2024cash' | 'sep2024' | 'sep2024pr' | 'jul2025' | 'aug2026profit' | 'aug2026behaviour' | 'aug2026pr';

export interface SebiDocument {
  id: SebiDocId;
  /** Short name used in the figures tables. */
  label: string;
  kind: 'Study' | 'Press release';
  /** Full title as listed on sebi.gov.in. */
  title: string;
  /** YYYY-MM-DD publication date on sebi.gov.in. */
  date: string;
  pdfUrl: string;
  pageUrl: string;
  pdfPages: number;
  covers: string;
}

export type SebiGroupId = 'share' | 'amount' | 'costs' | 'behaviour' | 'context';

export interface SebiFigure {
  id: string;
  group: SebiGroupId;
  figure: string;
  value: string;
  period: string;
  doc: SebiDocId;
  /** PDF page counted from 1 on the cover. */
  pdfPage: number;
  /** Section or table inside the document. */
  where: string;
}

export interface SebiYearRow {
  year: string;
  /** Individual traders in SEBI's top-15-broker sample, in lakh. */
  sampleLakh: string;
  lossMakersPct: string;
  netLossCrore: string;
  avgNetLossRupees: string;
}

export interface SebiMethod {
  doc: SebiDocId;
  years: string;
  who: string;
  basis: string;
  data: string;
  pdfPages: number[];
}

export const SEBI_CHECKED = '2026-11-15';

export const SEBI_DOCUMENTS: SebiDocument[] = [
  {
    id: 'jan2023',
    label: 'January 2023 study',
    kind: 'Study',
    title: 'Analysis of Profit and Loss of Individual Traders dealing in Equity F&O Segment',
    date: '2023-01-25',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/jan-2023/1674645296493.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/jan-2023/study-analysis-of-profit-and-loss-of-individual-traders-dealing-in-equity-fando-segment_67525.html',
    pdfPages: 33,
    covers: 'FY19 and FY22; sample of the top 10 brokers',
  },
  {
    id: 'jul2024cash',
    label: 'July 2024 intraday cash study',
    kind: 'Study',
    title: 'Analysis of Intraday trading by Individuals in Equity Cash Segment',
    date: '2024-07-24',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/jul-2024/1721818140715.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/jul-2024/study-analysis-of-intraday-trading-by-individuals-in-equity-cash-segment_84946.html',
    pdfPages: 32,
    covers: 'FY19, FY22 and FY23; intraday trading in the equity cash segment, sample of the top 10 brokers',
  },
  {
    id: 'sep2024',
    label: 'September 2024 study',
    kind: 'Study',
    title: 'Analysis of Profits & Losses in the Equity Derivatives Segment (FY22-FY24)',
    date: '2024-09-23',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/sep-2024/1727085659479.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/sep-2024/study-analysis-of-profits-and-losses-in-the-equity-derivatives-segment-fy22-fy24-_86905.html',
    pdfPages: 33,
    covers: 'FY22 to FY24; sample of the top 15 brokers, plus whole-market NSE data for FY24',
  },
  {
    id: 'sep2024pr',
    label: 'September 2024 press release',
    kind: 'Press release',
    title: 'PR No.22/2024: Updated SEBI Study Reveals 93% of Individual Traders Incurred Losses in Equity F&O between FY22 and FY24; Aggregate Losses Exceed ₹ 1.8 Lakh Crores Over Three Years',
    date: '2024-09-23',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/sep-2024/1727086965496.pdf',
    pageUrl: 'https://www.sebi.gov.in/media-and-notifications/press-releases/sep-2024/updated-sebi-study-reveals-93-of-individual-traders-incurred-losses-in-equity-fando-between-fy22-and-fy24-aggregate-losses-exceed-1-8-lakh-crores-over-three-years_86906.html',
    pdfPages: 3,
    covers: 'Summary of the September 2024 study',
  },
  {
    id: 'jul2025',
    label: 'July 2025 study',
    kind: 'Study',
    title: 'Comparative study of growth in Equity Derivatives Segment vis-à-vis Cash Market after recent measures',
    date: '2025-07-07',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/jul-2025/1751900271726.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/jul-2025/comparative-study-of-growth-in-equity-derivatives-segment-vis-vis-cash-market-after-recent-measures_95105.html',
    pdfPages: 7,
    covers: 'Trading activity December 2024 to May 2025; profit and loss FY22 to FY25 in section C (top 13 brokers)',
  },
  {
    id: 'aug2026profit',
    label: 'August 2026 profitability study',
    kind: 'Study',
    title: 'Profitability of Individual Traders in the Equity Derivatives Segment (FY25–FY26)',
    date: '2026-08-20',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/aug-2026/1787233506209.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/aug-2026/study-profitability-of-individual-traders-in-the-equity-derivatives-segment-fy25-fy26-_103835.html',
    pdfPages: 91,
    covers: 'FY25 and FY26, with FY22 to FY26 trends; sample of the top 15 brokers',
  },
  {
    id: 'aug2026behaviour',
    label: 'August 2026 trading behaviour study',
    kind: 'Study',
    title: 'Trading Behaviour of Individual Traders in the Equity Derivatives Segment',
    date: '2026-08-20',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/aug-2026/1787233601328.pdf',
    pageUrl: 'https://www.sebi.gov.in/reports-and-statistics/research/aug-2026/study-trading-behaviour-of-individual-traders-in-the-equity-derivatives-segment-fy25-fy26-_103836.html',
    pdfPages: 53,
    covers: 'FY25 and FY26: persistence, trading intensity, capital employed and equity holdings',
  },
  {
    id: 'aug2026pr',
    label: 'August 2026 press release',
    kind: 'Press release',
    title: 'PR No.50/2026: SEBI Studies Indicate Key Trends in Retail Participation, Trading Behaviour and Profitability in the Equity Derivatives',
    date: '2026-08-20',
    pdfUrl: 'https://www.sebi.gov.in/sebi_data/attachdocs/aug-2026/1787236407005.pdf',
    pageUrl: 'https://www.sebi.gov.in/media-and-notifications/press-releases/aug-2026/sebi-studies-indicate-key-trends-in-retail-participation-trading-behaviour-and-profitability-in-the-equity-derivatives_103838.html',
    pdfPages: 5,
    covers: 'Summary of the two August 2026 studies',
  },
];

export const SEBI_GROUPS: { id: SebiGroupId; caption: string }[] = [
  { id: 'share', caption: 'Share of individual traders with a loss' },
  { id: 'amount', caption: 'How much individual traders lost' },
  { id: 'costs', caption: 'Transaction costs' },
  { id: 'behaviour', caption: 'Persistence and trading behaviour' },
  { id: 'context', caption: 'Context: whole-market profits and the cash segment' },
];

export const SEBI_FIGURES: SebiFigure[] = [
  {
    id: 'share-fy22-jan2023',
    group: 'share',
    figure: 'Individual traders with a net loss',
    value: '89%',
    period: 'FY22 (top 10 brokers)',
    doc: 'jan2023',
    pdfPage: 4,
    where: 'Executive summary',
  },
  {
    id: 'share-fy24',
    group: 'share',
    figure: 'Individual traders with a net loss',
    value: '91.1%',
    period: 'FY24 (top 15 brokers)',
    doc: 'sep2024',
    pdfPage: 3,
    where: 'Executive summary, item 1',
  },
  {
    id: 'share-fy22-fy24',
    group: 'share',
    figure: 'Individual traders with a net loss over the three years together',
    value: '92.8%',
    period: 'FY22–FY24 combined (113.2 lakh traders)',
    doc: 'sep2024',
    pdfPage: 19,
    where: '§5.5',
  },
  {
    id: 'profit-fy22-fy24',
    group: 'share',
    figure: 'Individual traders with a net profit over the three years together',
    value: '7.2%',
    period: 'FY22–FY24 combined',
    doc: 'sep2024',
    pdfPage: 3,
    where: 'Executive summary, item 6',
  },
  {
    id: 'share-fy25-jul2025',
    group: 'share',
    figure: 'Individual traders with a net loss',
    value: 'Nearly 91%',
    period: 'FY25 (top 13 brokers)',
    doc: 'jul2025',
    pdfPage: 2,
    where: 'Executive summary, para 4',
  },
  {
    id: 'share-fy26',
    group: 'share',
    figure: 'Individual traders with a net loss',
    value: '87.7% (90.9% in FY25)',
    period: 'FY26 (top 15 brokers)',
    doc: 'aug2026profit',
    pdfPage: 47,
    where: '§6.23',
  },
  {
    id: 'share-fy25-fy26',
    group: 'share',
    figure: 'Individual traders with a net loss over the two years together',
    value: '91.0%',
    period: 'FY25–FY26 combined (122.6 lakh traders)',
    doc: 'aug2026profit',
    pdfPage: 53,
    where: '§6.26',
  },
  {
    id: 'gross-fy24',
    group: 'share',
    figure: 'Individual traders with a loss before transaction costs',
    value: '85.1%',
    period: 'FY24',
    doc: 'sep2024',
    pdfPage: 15,
    where: '§5.2',
  },
  {
    id: 'gross-fy26',
    group: 'share',
    figure: 'Individual traders with a loss before transaction costs',
    value: '82.1%',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 47,
    where: '§6.23',
  },
  {
    id: 'futures-options-fy26',
    group: 'share',
    figure: 'Futures traders and options traders with a net loss',
    value: 'About 66% (futures), 87.7% (options)',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 48,
    where: '§6.23',
  },
  {
    id: 'options-share-losses',
    group: 'share',
    figure: 'Share of aggregate individual losses that came from options',
    value: '92%',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 6,
    where: 'Executive summary',
  },
  {
    id: 'loss-fy26',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders',
    value: '₹91,685 crore',
    period: 'FY26 (top 15 brokers)',
    doc: 'aug2026profit',
    pdfPage: 5,
    where: 'Executive summary',
  },
  {
    id: 'loss-fy25-first',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders, as first published',
    value: '₹1,05,603 crore',
    period: 'FY25 (top 13 brokers)',
    doc: 'jul2025',
    pdfPage: 6,
    where: 'Section C, para 18',
  },
  {
    id: 'loss-fy25-revised',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders, as revised',
    value: '₹1,11,788 crore',
    period: 'FY25 (top 15 brokers)',
    doc: 'aug2026profit',
    pdfPage: 46,
    where: '§6.23',
  },
  {
    id: 'loss-fy22-fy24',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders',
    value: '₹1,81,383 crore',
    period: 'FY22–FY24 combined',
    doc: 'sep2024',
    pdfPage: 18,
    where: '§5.5, Table 7',
  },
  {
    id: 'loss-fy25-fy26',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders',
    value: '₹2.03 lakh crore',
    period: 'FY25–FY26 combined',
    doc: 'aug2026profit',
    pdfPage: 53,
    where: '§6.26',
  },
  {
    id: 'loss-fy22-fy26',
    group: 'amount',
    figure: 'Aggregate net loss of individual traders',
    value: 'About ₹3.85 lakh crore',
    period: 'FY22–FY26 combined',
    doc: 'aug2026profit',
    pdfPage: 47,
    where: '§6.23',
  },
  {
    id: 'avg-loss-profit-fy26',
    group: 'amount',
    figure: 'Average loss of a loss-maker; average profit of a profit-maker',
    value: '₹1.47 lakh; ₹1.22 lakh',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 5,
    where: 'Executive summary',
  },
  {
    id: 'large-losses',
    group: 'amount',
    figure: 'Traders who lost more than ₹10 lakh each',
    value: 'About 4.4 lakh traders (about 3.5% of all traders), averaging about ₹30 lakh',
    period: 'FY25–FY26 combined',
    doc: 'aug2026profit',
    pdfPage: 54,
    where: '§6.27',
  },
  {
    id: 'large-profits',
    group: 'amount',
    figure: 'Traders who earned a profit above ₹1 lakh',
    value: 'About 1.1% of traders',
    period: 'FY25–FY26 combined',
    doc: 'aug2026profit',
    pdfPage: 54,
    where: '§6.27',
  },
  {
    id: 'tc-total',
    group: 'costs',
    figure: 'Transaction costs paid by individual traders',
    value: 'About ₹24,800 crore a year',
    period: 'FY25 and FY26',
    doc: 'aug2026profit',
    pdfPage: 65,
    where: '§6.35',
  },
  {
    id: 'tc-mix',
    group: 'costs',
    figure: 'Split of transaction costs',
    value: 'Brokerage 44%, STT 27%, exchange charges 16%, GST 11%, stamp duty 1%, SEBI fees 1%',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 65,
    where: '§6.35',
  },
  {
    id: 'tc-per-trader',
    group: 'costs',
    figure: 'Average transaction cost per trader',
    value: '₹31,628 (₹26,027 in FY25)',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 65,
    where: '§6.35',
  },
  {
    id: 'tc-share-fy26',
    group: 'costs',
    figure: 'Transaction costs as a share of gross losses (loss-makers) and of gross profits (profit-makers)',
    value: '35% and 21%',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 52,
    where: '§6.25',
  },
  {
    id: 'tc-cumulative',
    group: 'costs',
    figure: 'Transaction costs paid by individual traders, cumulative',
    value: 'About ₹1 lakh crore, brokerage almost half',
    period: 'FY22–FY26 combined',
    doc: 'aug2026profit',
    pdfPage: 65,
    where: '§6.35',
  },
  {
    id: 'tc-jan2023',
    group: 'costs',
    figure: 'Extra cost on top of net trading losses, for loss-makers among active traders (outliers excluded)',
    value: '28% of net trading losses',
    period: 'FY22 (top 10 brokers)',
    doc: 'jan2023',
    pdfPage: 30,
    where: '§C.1',
  },
  {
    id: 'persist-loss-fy26',
    group: 'behaviour',
    figure: 'Continuing traders who lost again after losing in each of the two years before',
    value: '90.0%',
    period: 'FY26',
    doc: 'aug2026behaviour',
    pdfPage: 33,
    where: '§5.14, Table 14',
  },
  {
    id: 'five-year',
    group: 'behaviour',
    figure: 'Traders active in all five years: loss in every year; profit in every year',
    value: '65.6%; 0.5%',
    period: 'FY22–FY26 (FY22 cohort)',
    doc: 'aug2026behaviour',
    pdfPage: 35,
    where: '§5.15, Table 16',
  },
  {
    id: 'quarters',
    group: 'behaviour',
    figure: 'Trader-quarters that were loss-making; profitable',
    value: '84.6%; 15.4%',
    period: 'FY25–FY26 (4.02 crore trader-quarters)',
    doc: 'aug2026behaviour',
    pdfPage: 44,
    where: '§5.25',
  },
  {
    id: 'experience',
    group: 'behaviour',
    figure: 'Loss-makers by consecutive years of trading',
    value: '91.0% (one year) to 96.5% (four years)',
    period: 'FY26',
    doc: 'aug2026behaviour',
    pdfPage: 34,
    where: '§5.15, Table 15',
  },
  {
    id: 'gross-market-fy26',
    group: 'context',
    figure: 'Gross trading profit or loss before costs, whole market',
    value: 'Proprietary traders about ₹44,000 crore profit, FPIs about ₹14,000 crore profit, individuals about ₹72,000 crore loss',
    period: 'FY26',
    doc: 'aug2026profit',
    pdfPage: 6,
    where: 'Executive summary',
  },
  {
    id: 'intraday-cash-fy23',
    group: 'context',
    figure: 'Individual intraday traders in the equity cash segment with a net loss',
    value: '71% (about 7 in 10)',
    period: 'FY23 (top 10 brokers)',
    doc: 'jul2024cash',
    pdfPage: 3,
    where: 'Executive summary, item 4',
  },
];

export const SEBI_YEAR_DOC: SebiDocId = 'aug2026profit';
export const SEBI_YEAR_PAGE = 81;
export const SEBI_YEAR_WHERE = 'Annexure, Table 32';

export const SEBI_YEARS: SebiYearRow[] = [
  { year: 'FY22', sampleLakh: '42.74', lossMakersPct: '90.2%', netLossCrore: '40,824', avgNetLossRupees: '95,517' },
  { year: 'FY23', sampleLakh: '58.35', lossMakersPct: '91.7%', netLossCrore: '65,747', avgNetLossRupees: '1,12,677' },
  { year: 'FY24', sampleLakh: '86.26', lossMakersPct: '91.1%', netLossCrore: '74,812', avgNetLossRupees: '86,728' },
  { year: 'FY25', sampleLakh: '98.10', lossMakersPct: '90.9%', netLossCrore: '1,11,788', avgNetLossRupees: '1,13,913' },
  { year: 'FY26', sampleLakh: '78.60', lossMakersPct: '87.7%', netLossCrore: '91,685', avgNetLossRupees: '1,16,654' },
];

export const SEBI_METHOD: SebiMethod[] = [
  {
    doc: 'jan2023',
    years: 'FY22 (and FY19)',
    who: 'Individuals, HUFs and NRIs. Proprietary traders, institutions and partnership firms are excluded.',
    basis: 'Net P&L is the net trading profit or loss realised in the year minus transaction costs.',
    data: 'Top 10 brokers: about 67% of individual F&O turnover in FY22, 45.2 lakh traders in the FY22 sample.',
    pdfPages: [3, 7],
  },
  {
    doc: 'sep2024',
    years: 'FY22 to FY24',
    who: 'Individuals, HUFs and NRIs in the sample.',
    basis: 'Realised P&L. "Losses" means net losses, after transaction costs, unless the text says gross.',
    data: 'Top 15 brokers: about 90% of individual traders and about 75% of individual turnover in FY24. The whole-market NSE section is gross of costs and SEBI says it is not strictly comparable with the sample.',
    pdfPages: [9, 10, 11],
  },
  {
    doc: 'jul2025',
    years: 'FY25 (section C)',
    who: 'Individual traders in equity derivatives.',
    basis: 'Net losses, after accounting for transaction costs.',
    data: 'Top 13 brokers: about 96 lakh of about 107 lakh unique traders.',
    pdfPages: [6],
  },
  {
    doc: 'aug2026profit',
    years: 'FY25 and FY26 (trends from FY22)',
    who: 'Resident individuals, HUFs, NRIs, sole proprietorships and individuals under portfolio management services. SEBI says the group includes both retail and HNI traders.',
    basis: 'Realised profit and loss on squared-off positions, after transaction costs. Open positions at the end of the period are excluded.',
    data: 'Top 15 brokers: 78.60 lakh of 87.71 lakh individual traders in FY26 (89.6%).',
    pdfPages: [5, 14, 16, 18],
  },
  {
    doc: 'aug2026behaviour',
    years: 'FY25 and FY26 (cohorts from FY22)',
    who: 'The same individuals as the profitability study.',
    basis: 'Descriptive and associational. SEBI says the findings do not establish causes.',
    data: 'Client-level profit and loss data from the top 15 brokers. A random sample of 5,050 traders is used only for classifying trading strategy and for returns on capital employed, which this page does not use.',
    pdfPages: [5, 11, 15],
  },
];

export function sebiDoc(id: SebiDocId): SebiDocument {
  const d = SEBI_DOCUMENTS.find((x) => x.id === id);
  if (!d) throw new Error(`unknown SEBI document ${id}`);
  return d;
}

/** Link to a PDF page: viewers open the fragment's page. */
export function sebiPdfPageUrl(id: SebiDocId, pdfPage: number): string {
  return `${sebiDoc(id).pdfUrl}#page=${pdfPage}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `2026-08-20` -> `20 August 2026`. */
export function formatSebiDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
