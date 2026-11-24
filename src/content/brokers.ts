import type { Source } from './components/ArticleParts';
import { IMPORT_SOURCES, type FaqItem } from './product-facts';

type ImportId = (typeof IMPORT_SOURCES)[number]['id'];

/**
 * Per-broker facts for the /<broker>-trading-journal pages. Export steps and columns mirror the import parsers
 * (JournalAWSSetup src/features/import/parsers/fills.ts: howToExport, sampleColumns); change both together.
 */
export interface BrokerPage {
  id: 'zerodha' | 'upstox' | 'groww' | 'angel-one' | 'dhan';
  importId: ImportId;
  name: string;
  path: string;
  /** What the broker calls the file, lower case, as used mid-sentence. */
  fileName: string;
  h1: string;
  shortAnswer: string;
  exportSteps: string[];
  exportNotes: string[];
  /** Header names the importer looks for, as they appear in the broker's file. */
  columns: string[];
  /** What the broker's own tools already show, read from the broker's page in `ownToolsSource`. Absent = nothing verified. */
  ownTools?: string;
  extraSections?: { heading: string; paragraphs: string[] }[];
  faq: FaqItem[];
  sources: Source[];
}

const NSE_STT: Source = {
  label: 'NSE circular 02/2026 (NSE/FATAX/73524): changes in rates of Securities Transaction Tax, 31 March 2026',
  url: 'https://nsearchives.nseindia.com/content/circulars/FATAX73524.pdf',
  checked: '2026-11-12',
};

const noPassword = (name: string, app: string): FaqItem => ({
  question: `Does TradeQut need my ${name} login or connect to ${app}?`,
  answer: `No. You download the file from ${name} yourself and upload it to TradeQut. TradeQut never asks for a broker password, and automatic broker sync is planned, not available.`,
});

export const BROKER_PAGES: BrokerPage[] = [
  {
    id: 'zerodha',
    importId: 'zerodha',
    name: 'Zerodha',
    path: '/zerodha-trading-journal',
    fileName: 'Console tradebook',
    h1: 'Zerodha trading journal: analyse your Console tradebook',
    shortAnswer:
      'Download the tradebook from Zerodha Console as CSV or XLSX and drop it on the TradeQut Import page. TradeQut pairs the fills into trades, estimates the charges on each one, and shows net P&L by strategy, weekday, hour, call or put and expiry day, plus what each broken rule cost.',
    exportSteps: [
      'Sign in to Zerodha Console (console.zerodha.com) with your Kite credentials.',
      'Open Reports, then Tradebook.',
      'Select the segment (for example Equity or F&O), choose a date range and click the arrow button.',
      'Download the result; the control beside the Download button lets you choose XLSX or CSV.',
    ],
    exportNotes: [
      'Zerodha allows at most 365 days per download. For a longer history, download one file per period and import them one after another; trades already in the account are skipped.',
      'Each segment is a separate download, so F&O and equity are two files.',
    ],
    columns: ['symbol', 'isin', 'trade_date', 'exchange', 'segment', 'series', 'trade_type', 'quantity', 'price', 'trade_id', 'order_id', 'order_execution_time'],
    ownTools:
      'Console already gives you the tradebook, a P&L report and tags. Zerodha introduced tags in 2021 as a way to keep an investment journal on holdings and follow investing goals. What Console does not record is why you took a trade, which rule it broke, or how your results split by setup and time of day; that is the part a separate journal adds.',
    extraSections: [
      {
        heading: 'Tradebook or P&L statement: which file to import',
        paragraphs: [
          'The tradebook lists every execution with its time, so TradeQut can rebuild each trade with an entry, an exit and a holding time. Use it whenever you can.',
          'The Console P&L statement (Reports, then P&L) is a per-symbol summary without trade times. TradeQut reads it too, but hour-of-day and holding-time analysis need the tradebook.',
        ],
      },
      {
        heading: 'Check the import against Console',
        paragraphs: [
          'After importing a month, compare the gross P&L in TradeQut with the Console P&L report for the same dates. They should agree before charges; a difference points to missing rows or to a position opened before the first day of the file, so widen the date range.',
          'The charges TradeQut adds are estimates. Your contract notes and the Console P&L report carry the charged amounts.',
        ],
      },
    ],
    faq: [
      {
        question: 'Does Zerodha have a trading journal?',
        answer:
          'Zerodha Console gives you the tradebook, P&L reports and tags, which Zerodha introduced in 2021 as an investment journal for holdings. To record the setup, the mistakes and the rules behind each trade and analyse results by them, import the tradebook into a separate journal such as TradeQut.',
      },
      {
        question: 'Does the Zerodha tradebook include charges?',
        answer:
          "No. The tradebook lists executions: symbol, date, buy or sell, quantity, price, and order and trade IDs. Charges are on your contract notes and in the Console P&L report. For each imported trade TradeQut estimates brokerage from the broker's standard plan, and STT, the NSE transaction charge and IPFT contribution, SEBI fee, stamp duty and GST from a dated table of rates. For NSE trades from 1 October 2024 those statutory charges use the rates in force on the trade date; for older trades the transaction charge is an approximation, because NSE then charged it by each broker's monthly volume, and small differences in the SEBI fee and GST are possible. STT on an option exercised at expiry is not included.",
      },
      {
        question: 'How do I analyse more than one year of Zerodha trades?',
        answer:
          'Console limits each tradebook download to 365 days. Download one file per year and import them one after another into the same TradeQut account; trades that were already imported are marked and skipped, so overlapping date ranges are safe.',
      },
      {
        question: 'Can I import both equity and F&O tradebooks?',
        answer: 'Yes. Console gives one file per segment. Import each file into the same account and TradeQut keeps the trades together, with the asset class on each trade.',
      },
      noPassword('Zerodha', 'Kite'),
    ],
    sources: [
      {
        label: 'Zerodha Support: where to see the trades taken for a period (Tradebook in Console)',
        url: 'https://support.zerodha.com/category/console/reports/articles/where-can-i-see-all-the-trades-i-ve-taken-for-a-particular-period',
        checked: '2026-11-11',
      },
      { label: 'Zerodha Z-Connect: Tagging on Console: Investment journal (1 June 2021)', url: 'https://zerodha.com/z-connect/console/tagging-on-console-trading-journal', checked: '2026-11-14' },
      NSE_STT,
    ],
  },
  {
    id: 'upstox',
    importId: 'upstox',
    name: 'Upstox',
    path: '/upstox-trading-journal',
    fileName: 'trade report',
    h1: 'Upstox trading journal: import your trade report',
    shortAnswer:
      'Download the Trade report from the Reports section of Upstox and upload it to TradeQut. Each buy and sell is paired into a trade, charges are estimated per trade, and the journal shows net P&L by strategy, weekday and hour, with the rules you broke and what they cost.',
    exportSteps: [
      'Sign in to Upstox on the web (account.upstox.com) and go to Reports.',
      'Open Trade.',
      'Choose the segment and the period.',
      'Download the report as Excel (XLSX).',
    ],
    exportNotes: ['Menu names can differ between the app and the website and change between versions; look for the report that lists one row per executed trade with a Trade Num and a Trade Time.'],
    columns: ['Date', 'Company', 'Amount', 'Exchange', 'Segment', 'Scrip Code', 'Instrument Type', 'Strike Price', 'Expiry', 'Trade Num', 'Trade Time', 'Side', 'Quantity', 'Price'],
    ownTools:
      'Upstox has a free Trading Insights tool: you upload an F&O profit-and-loss statement with at least 20 trades, from any broker, and it reports profit factor, results by index, calls against puts, risk-to-reward and signs of overtrading. It is a one-off report on a statement. A journal keeps every trade with your own setup, mistake and rule notes, so the same questions can be asked again next month.',
    faq: [
      {
        question: 'Which Upstox file does TradeQut read?',
        answer:
          'The Trade report from the Reports section of Upstox web, as XLSX. TradeQut recognises it by its Trade Num, Trade Time, Scrip Code and Instrument Type columns, reads the side, quantity, price, date and time of each execution, and builds each option or future from its Scrip Code, Instrument Type, Strike Price and Expiry.',
      },
      {
        question: 'Are Upstox charges included in the P&L?',
        answer:
          "The trade report lists executions, not charges. For each trade TradeQut estimates brokerage from the broker's standard plan, and STT, the NSE transaction charge and IPFT contribution, SEBI fee, stamp duty and GST from a dated table of rates. For NSE trades from 1 October 2024 those statutory charges use the rates in force on the trade date; for older trades the transaction charge is an approximation, because NSE then charged it by each broker's monthly volume, and small differences in the SEBI fee and GST are possible. STT on an option exercised at expiry is not included. The total is recorded as the fees of that trade. Your contract note is the authoritative figure.",
      },
      noPassword('Upstox', 'your Upstox account'),
    ],
    sources: [{ label: 'Upstox: Trading Insights', url: 'https://upstox.com/trading-insights/', checked: '2026-11-14' }, NSE_STT],
  },
  {
    id: 'groww',
    importId: 'groww',
    name: 'Groww',
    path: '/groww-trading-journal',
    fileName: 'order history',
    h1: 'Groww trading journal: import your order history',
    shortAnswer:
      'Download the Order History report from Groww (Stocks or F&O) and upload it to TradeQut. Executed orders become trades with an entry and an exit, charges are estimated per trade, and the journal shows which setups, hours and broken rules make or lose money.',
    exportSteps: [
      'Open Groww and go to your Profile.',
      'Open Reports, then Order History.',
      'Choose Stocks or F&O and the date range.',
      'Download the report as XLSX or CSV.',
    ],
    exportNotes: [
      'The Groww file is a list of orders, so it can include orders that never traded. TradeQut skips rows whose status is rejected, cancelled, pending, open, expired or failed.',
      'The file gives the value of each order; when there is no price column TradeQut divides the value by the quantity to get the price.',
    ],
    columns: ['Stock name', 'Symbol', 'ISIN', 'Type', 'Quantity', 'Value', 'Exchange', 'Exchange Order Id', 'Execution date and time', 'Order status'],
    faq: [
      {
        question: 'Does TradeQut import cancelled or rejected Groww orders?',
        answer:
          'No. The order history lists every order with its status. Rows marked rejected, cancelled, pending, open, expired or failed are skipped, and the review table shows what will be saved before anything is imported.',
      },
      {
        question: 'Can I journal Groww F&O trades as well as stocks?',
        answer:
          'Yes. Download the Order History for F&O and for Stocks as separate reports and import both into the same account. Each trade carries its asset class, so you can view options, futures and shares together or apart.',
      },
      noPassword('Groww', 'your Groww account'),
    ],
    sources: [NSE_STT],
  },
  {
    id: 'angel-one',
    importId: 'angelone',
    name: 'Angel One',
    path: '/angel-one-trading-journal',
    fileName: 'trade history',
    h1: 'Angel One trading journal: import your trade history',
    shortAnswer:
      'Download the trade history from Trades and charges in the Angel One app and upload it to TradeQut. The executions are paired into trades, charges are estimated per trade, and the journal shows net P&L by strategy, weekday and hour, with the cost of each mistake and broken rule.',
    exportSteps: [
      'Open the Angel One app and go to Account.',
      'Open Trades and charges.',
      'Choose the date range.',
      'Choose Download trade history (an Excel file).',
    ],
    exportNotes: [
      'Menu names can change between versions; look for the file with one row per executed trade and Scrip/Contract, Buy/Sell, Order ID and Trade ID columns.',
      'The file has trade dates but no times of day, so each trade is placed at the start of its day and the fills of one day are taken in trade-number order.',
    ],
    columns: ['Scrip/Contract', 'Buy/Sell', 'Buy Price', 'Sell Price', 'Quantity', 'Brokerage', 'Order Type', 'Segment', 'Exchange', 'Order ID', 'Trade ID', 'Date'],
    faq: [
      {
        question: 'Which Angel One report does TradeQut read?',
        answer:
          'The trade history from Account → Trades and charges, as XLSX (a CSV saved from it also works). TradeQut recognises it by its Scrip/Contract, Buy/Sell, Order ID and Trade ID columns and reads the contract, side, quantity, price and date of each execution; the file has no time of day.',
      },
      {
        question: 'Are Angel One brokerage and taxes included?',
        answer:
          "Yes, as estimates. For each trade TradeQut estimates brokerage from the broker's standard plan, and STT, the NSE transaction charge and IPFT contribution, SEBI fee, stamp duty and GST from a dated table of rates. For NSE trades from 1 October 2024 those statutory charges use the rates in force on the trade date; for older trades the transaction charge is an approximation, because NSE then charged it by each broker's monthly volume, and small differences in the SEBI fee and GST are possible. STT on an option exercised at expiry is not included. Your contract note is the authoritative figure.",
      },
      noPassword('Angel One', 'your Angel One account'),
    ],
    sources: [NSE_STT],
  },
  {
    id: 'dhan',
    importId: 'dhan',
    name: 'Dhan',
    path: '/dhan-trading-journal',
    fileName: 'global transaction report',
    h1: 'Dhan trading journal: import your Global Transaction Report',
    shortAnswer:
      'Download the Global Transactions report from the Journal section of Dhan and upload it to TradeQut. Each day’s buys and sells of a contract are paired into trades with the charges Dhan lists, and the journal adds what a statement cannot: your setup, your mistakes, the rules you broke and what each one cost.',
    exportSteps: ['Sign in to Dhan and open Journal.', 'Open Global Transactions.', 'Choose the period.', 'Download the report as CSV.'],
    exportNotes: [
      'Dhan does not offer a download of individual trades: Past Trades can only be viewed. The Global Transaction Report has one row per contract per day with that day’s buy and sell totals, so TradeQut records trades by day, at average prices and without times of day.',
    ],
    columns: ['Date', 'Scrip Name', 'Exchange', 'Bill No.', 'Buy Qty.', 'Buy Value', 'Sell Qty.', 'Sell Value', 'Brokerage', 'GST', 'STT', 'SEBI Fees', 'Stamp Duty', 'Txn. Charges', 'Oth. Charges', 'Gross Amount'],
    ownTools:
      'Dhan has its own Trader’s Diary, which Dhan describes as a way to track past trades and monitor profit and loss. It shows buy value, sell value, realised P&L, charges and net realised P&L by day, by month or for a custom range of up to three months. If that answers your questions, you may not need anything else. A separate journal helps when you trade with more than one broker, want a longer history in one view, or want to record setups, mistakes and rules against each trade.',
    faq: [
      {
        question: 'Dhan already has a Trader’s Diary. Why use a separate journal?',
        answer:
          'The Trader’s Diary reports P&L and charges for trades placed with Dhan, for ranges of up to three months. TradeQut keeps trades from several brokers in one place and adds your own notes: the setup, the mistake, the rule a trade broke, and analytics by strategy, weekday and hour built on those notes.',
      },
      {
        question: 'Which Dhan file does TradeQut read?',
        answer:
          'The Global Transaction Report from Journal → Global Transactions, as CSV. TradeQut recognises it by its Scrip Name, Bill No., Buy Qty., Buy Value, Sell Qty. and Sell Value columns, and takes the brokerage, STT, GST and other charges from the report itself.',
      },
      noPassword('Dhan', 'your Dhan account'),
    ],
    sources: [
      {
        label: 'Dhan Support: What is a Trader’s Diary and how does it work?',
        url: 'https://dhan.co/support/statements-and-ledger/trader-s-diary/what-is-a-trader-s-diary-and-how-does-it-work/',
        checked: '2026-11-14',
      },
      NSE_STT,
    ],
  },
];

export function getBrokerPage(id: BrokerPage['id']): BrokerPage {
  const b = BROKER_PAGES.find((x) => x.id === id);
  if (!b) throw new Error(`unknown broker page ${id}`);
  return b;
}
