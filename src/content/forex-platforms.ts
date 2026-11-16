import type { Source } from './components/ArticleParts';
import type { FaqItem } from './product-facts';

/**
 * Facts for the /mt4-trading-journal and /mt5-trading-journal pages. Export steps and columns mirror the MetaTrader
 * parser (JournalAWSSetup src/features/import/parsers/mt.ts: howToExport, sampleColumns, layout); change both together.
 */
export interface MetaTraderPage {
  id: 'mt4' | 'mt5';
  name: string;
  short: string;
  path: string;
  /** What the platform calls the file, as used mid-sentence. */
  fileName: string;
  fileTypes: string;
  h1: string;
  shortAnswer: string;
  exportSteps: string[];
  exportNotes: string[];
  /** Report columns the importer reads, in report order, with what each is used for. */
  columns: [string, string][];
  faq: FaqItem[];
  sources: Source[];
}

const SHARED_COLUMNS = {
  type: 'Buy or sell; balance, credit, deposit and withdrawal rows are skipped',
  sl: 'Stop loss, which gives each trade its R multiple (blank or 0 = no stop)',
  tp: 'Take profit, for planned against captured R',
  entry: 'Entry price',
  exit: 'Exit price',
  commission: 'Added to the trade’s fees',
  swap: 'Added to the trade’s fees, so overnight financing is in net P&L',
  profit: 'The broker’s profit for the trade in the account currency, used as gross P&L',
};

const noPassword = (short: string): FaqItem => ({
  question: `Does TradeQut need my ${short} password, investor password or an EA?`,
  answer: `No. You save the report from ${short} yourself and upload it. TradeQut never asks for a broker login or investor password, installs nothing in the terminal, and automatic sync is planned, not available.`,
});

const serverTime: FaqItem = {
  question: 'Why are the trade times a few hours off?',
  answer:
    'MetaTrader reports use the broker’s server time, not yours. TradeQut reads the report times as UTC and shows a warning on import; if your broker’s server runs at another offset, hour-of-day and weekday results are shifted by that offset. Your broker’s help pages state its server time zone.',
};

export const METATRADER_PAGES: MetaTraderPage[] = [
  {
    id: 'mt4',
    name: 'MetaTrader 4',
    short: 'MT4',
    path: '/mt4-trading-journal',
    fileName: 'Detailed Report',
    fileTypes: 'HTML (.htm or .html)',
    h1: 'MT4 trading journal: import your MetaTrader 4 history',
    shortAnswer:
      'In MetaTrader 4 open Account History, choose All History, right-click and Save as Detailed Report, then drop the .htm file on the TradeQut Import page. Each closed trade comes in with its lots, entry and exit, stop and target, and commission, taxes and swap folded into the fees; you add the setup, session, mistakes and rules, and Analytics shows what makes or loses money.',
    exportSteps: [
      'Open the Terminal window (View → Terminal, or Ctrl+T) and click the Account History tab.',
      'Right-click inside the list and choose All History, or Custom Period for a date range.',
      'Right-click again and choose Save as Detailed Report.',
      'Save the .htm file, then upload it on the Import page in TradeQut. Leave Source on Auto-detect or pick MetaTrader 4.',
    ],
    exportNotes: [
      'Use Save as Detailed Report, the option TradeQut’s import help names. MetaTrader 4’s help describes it as the HTML report with an additional set of parameters; TradeQut reads its closed-transactions table (Ticket, Open Time, Close Time, Size, Item and the rest).',
      'All History has no time limit; Custom Period lets you pick the dates. Importing a period that overlaps one already imported skips the trades you have.',
    ],
    columns: [
      ['Ticket', 'Identifies the trade, so importing the same history again skips it'],
      ['Open Time', 'Entry time'],
      ['Type', SHARED_COLUMNS.type],
      ['Size', 'Position size in lots'],
      ['Item', 'The symbol; broker suffixes such as EURUSD.m or EURUSD# become EURUSD'],
      ['Price', SHARED_COLUMNS.entry],
      ['S / L', SHARED_COLUMNS.sl],
      ['T / P', SHARED_COLUMNS.tp],
      ['Close Time', 'Exit time'],
      ['Price', SHARED_COLUMNS.exit],
      ['Commission', SHARED_COLUMNS.commission],
      ['Taxes', 'Added to the trade’s fees'],
      ['Swap', SHARED_COLUMNS.swap],
      ['Profit', SHARED_COLUMNS.profit],
    ],
    faq: [
      {
        question: 'Which MT4 file does TradeQut import?',
        answer:
          'The Detailed Report saved from the Account History tab, as an HTML file (.htm or .html), up to 4 MB. Closed trades are imported; open trades, pending orders and balance operations are not.',
      },
      noPassword('MT4'),
      {
        question: 'Can I import MT4 history from a prop firm account?',
        answer:
          'Yes, if the firm gives you an MT4 terminal: the report is saved the same way. Mark the account as a prop challenge or a funded account in TradeQut so it sits apart from your own money. If the firm only offers a web dashboard, upload screenshots of the trade list instead.',
      },
      serverTime,
      {
        question: 'What happens to gold, indices and crypto in an MT4 report?',
        answer:
          'They import too. TradeQut tells forex pairs from metals, index CFDs and crypto by the symbol (XAUUSD is a commodity, US30 a CFD), and P&L comes from the report’s Profit column, so contract sizes do not change the result.',
      },
    ],
    sources: [
      { label: 'MetaTrader 4 Help: Account History', url: 'https://www.metatrader4.com/en/trading-platform/help/overview/terminal/terminal_account_history', checked: '2026-11-15' },
    ],
  },
  {
    id: 'mt5',
    name: 'MetaTrader 5',
    short: 'MT5',
    path: '/mt5-trading-journal',
    fileName: 'History report',
    fileTypes: 'HTML or Excel (XLSX)',
    h1: 'MT5 trading journal: import your MetaTrader 5 history',
    shortAnswer:
      'In MetaTrader 5 open the Toolbox History tab, choose the period, right-click, choose Report and save it as HTML or Excel (XLSX), then drop the file on the TradeQut Import page. TradeQut reads the Positions table: lots, entry and exit, stop and target, with commission and swap in the fees. You add the setup, session, mistakes and rules.',
    exportSteps: [
      'Open the Toolbox (View → Toolbox, or Ctrl+T) and click the History tab.',
      'Right-click inside the list and choose the period you want.',
      'Right-click again, choose Report, and pick HTML or Excel (XLSX).',
      'Save the file, then upload it on the Import page in TradeQut. Leave Source on Auto-detect or pick MetaTrader 5.',
    ],
    exportNotes: [
      'TradeQut reads the Positions table of the report: one row per closed position with its open and close time. The orders and deals tables are not needed.',
      'MetaTrader 5’s own help page describes the report as HTML. If your terminal offers no Excel option, use HTML; both are read the same way.',
    ],
    columns: [
      ['Time', 'Entry time'],
      ['Position', 'Identifies the trade, so importing the same history again skips it'],
      ['Symbol', 'The symbol; broker suffixes such as EURUSD.m, EURUSD.pro or EURUSDm become EURUSD'],
      ['Type', SHARED_COLUMNS.type],
      ['Volume', 'Position size in lots'],
      ['Price', SHARED_COLUMNS.entry],
      ['S / L', SHARED_COLUMNS.sl],
      ['T / P', SHARED_COLUMNS.tp],
      ['Time', 'Exit time'],
      ['Price', SHARED_COLUMNS.exit],
      ['Commission', SHARED_COLUMNS.commission],
      ['Swap', SHARED_COLUMNS.swap],
      ['Profit', SHARED_COLUMNS.profit],
    ],
    faq: [
      {
        question: 'Which MT5 file does TradeQut import?',
        answer:
          'The trading history report saved from the Toolbox History tab, as HTML or Excel (XLSX), up to 4 MB. TradeQut reads the Positions table; open positions and balance operations are not imported.',
      },
      noPassword('MT5'),
      {
        question: 'Does it work with prop firm MT5 accounts?',
        answer:
          'Yes, when the firm gives you an MT5 terminal: save the report the same way and import it into an account marked as a prop challenge or funded account. TradeQut records the account’s status (active, breached, passed) but does not track the firm’s loss limits for you; the prop firm drawdown calculator does that arithmetic.',
      },
      serverTime,
      {
        question: 'Will importing the next month create duplicates?',
        answer:
          'No. Each position keeps its MT5 position number, so a report that overlaps one already imported shows those rows as already imported and saves only the new ones.',
      },
    ],
    sources: [
      { label: 'MetaTrader 5 Help: Trading Report', url: 'https://www.metatrader5.com/en/terminal/help/trading_advanced/history_report', checked: '2026-11-15' },
    ],
  },
];

export function getMetaTraderPage(id: MetaTraderPage['id']): MetaTraderPage {
  const p = METATRADER_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown MetaTrader page ${id}`);
  return p;
}
