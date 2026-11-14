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
          'No. The tradebook lists executions: symbol, date, buy or sell, quantity, price, and order and trade IDs. Charges are on your contract notes and in the Console P&L report. TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each imported trade at the rates in force on the trade date.',
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
      'Download the Trade Report from the Reports section of Upstox and upload it to TradeQut. Each buy and sell is paired into a trade, charges are estimated per trade, and the journal shows net P&L by strategy, weekday and hour, with the rules you broke and what they cost.',
    exportSteps: [
      'Open Upstox on the web or in the app and go to Reports.',
      'Open Trade Report (Tradebook).',
      'Choose the segment and the date range.',
      'Download the report as CSV or XLSX.',
    ],
    exportNotes: ['Menu names can differ between the app and the website and change between versions; look for the report that lists one row per executed trade with a trade number.'],
    columns: ['Scrip Name', 'Symbol', 'Trade Num', 'Trade Date', 'Trade Time', 'Exchange', 'Segment', 'Side', 'Qty', 'Price', 'Order Num'],
    ownTools:
      'Upstox has a free Trading Insights tool: you upload an F&O profit-and-loss statement with at least 20 trades, from any broker, and it reports profit factor, results by index, calls against puts, risk-to-reward and signs of overtrading. It is a one-off report on a statement. A journal keeps every trade with your own setup, mistake and rule notes, so the same questions can be asked again next month.',
    faq: [
      {
        question: 'Which Upstox file does TradeQut read?',
        answer:
          'The Trade Report (Tradebook) from the Reports section, as CSV or XLSX. TradeQut recognises it by its Trade Num and Scrip Name columns and reads the symbol, side, quantity, price, date and time of each execution.',
      },
      {
        question: 'Are Upstox charges included in the P&L?',
        answer:
          'The trade report lists executions, not charges. TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each trade at the rates in force on the trade date and records them as the fees of that trade. Your contract note is the authoritative figure.',
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
    columns: ['Stock name', 'Symbol', 'ISIN', 'Type', 'Quantity', 'Value', 'Exchange', 'Exchange Order Id', 'Executed date and time', 'Order status'],
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
      'Download the Trade History (Tradebook) report from Angel One on the web and upload it to TradeQut. The executions are paired into trades, charges are estimated per trade, and the journal shows net P&L by strategy, weekday and hour, with the cost of each mistake and broken rule.',
    exportSteps: [
      'Sign in to Angel One on the web and open Reports.',
      'Open Trade History (some versions call it Tradebook).',
      'Choose the date range.',
      'Download the report as CSV or XLSX.',
    ],
    exportNotes: ['Menu names can change between versions; look for the report with one row per executed trade, a Trade No and a Transaction Type column.'],
    columns: ['Trade No', 'Order No', 'Symbol', 'Exchange', 'Segment', 'Transaction Type', 'Quantity', 'Trade Price', 'Trade Date', 'Trade Time'],
    faq: [
      {
        question: 'Which Angel One report does TradeQut read?',
        answer:
          'The Trade History (Tradebook) report as CSV or XLSX. TradeQut recognises it by its Trade No, Transaction Type and Trade Price columns and reads the symbol, quantity, price, date and time of each execution.',
      },
      {
        question: 'Are Angel One brokerage and taxes included?',
        answer:
          'The report lists executions, not charges. TradeQut estimates brokerage, STT, exchange transaction charges, SEBI fee, stamp duty and GST for each trade at the rates in force on the trade date. Your contract note is the authoritative figure.',
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
    fileName: 'trade history',
    h1: 'Dhan trading journal: import your trade history',
    shortAnswer:
      'Download the Trade History report from Dhan on the web and upload it to TradeQut. The executions are paired into trades, charges are estimated per trade, and the journal adds what a statement cannot: your setup, your mistakes, the rules you broke and what each one cost.',
    exportSteps: ['Sign in to Dhan on the web and open Reports.', 'Open Trade History.', 'Choose the date range.', 'Download the report as CSV or XLSX.'],
    exportNotes: ['Look for the report with one row per executed trade, with Trade No, Buy/Sell and Trade Price columns.'],
    columns: ['Date', 'Time', 'Name', 'Buy/Sell', 'Exchange', 'Segment', 'Quantity/Lot', 'Trade Price', 'Order No', 'Trade No'],
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
          'The Trade History report from Reports on Dhan web, as CSV or XLSX. TradeQut recognises it by its Name, Buy/Sell, Trade Price and Trade No columns.',
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
