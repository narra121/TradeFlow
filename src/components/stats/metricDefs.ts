export type MetricKey =
  | 'balance'
  | 'netPnl'
  | 'winRate'
  | 'profitFactor'
  | 'avgR'
  | 'plannedRR'
  | 'maxDrawdown'
  | 'expectancy'
  | 'trades'
  | 'avgWin'
  | 'avgLoss'
  | 'bestWorst'
  | 'winStreak'
  | 'lossStreak';

export interface MetricDef {
  label: string;
  definition: string;
  formula: string;
  /** Id of the term in `content/glossary/terms.ts`, linked as `/glossary#<id>`. */
  glossary?: string;
}

/** What every statistic label explains in its popover (E-025). Wording follows how `/stats` computes the figure. */
export const METRICS: Record<MetricKey, MetricDef> = {
  balance: {
    label: 'Balance',
    definition: 'The current balance of the account shown: the starting balance plus the net result of its trades.',
    formula: 'Starting balance + net P&L of the account',
  },
  netPnl: {
    label: 'Net P&L',
    definition: 'What the closed trades in the period made or lost, after fees where they are recorded.',
    formula: 'Sum of the net P&L of every trade in the period',
    glossary: 'pnl',
  },
  winRate: {
    label: 'Win rate',
    definition: 'The share of trades that closed with a profit. It says how often you win, not how much.',
    formula: 'Winning trades ÷ all trades × 100',
    glossary: 'win-rate',
  },
  profitFactor: {
    label: 'Profit factor',
    definition: 'How many times your gross profit covers your gross loss. Above 1.00 the period made money. It reads ∞ when there are wins and no losses.',
    formula: 'Gross profit ÷ gross loss',
    glossary: 'profit-factor',
  },
  avgR: {
    label: 'Avg R',
    definition: 'The average result of a trade measured in units of what you risked on it. A trade without a recorded stop loss has no R and is left out.',
    formula: 'Net P&L ÷ initial risk, averaged over trades with a stop',
    glossary: 'risk-reward-ratio',
  },
  plannedRR: {
    label: 'Planned R:R',
    definition: 'The average reward-to-risk ratio you planned at entry (target distance ÷ stop distance). It is a plan, not a result.',
    formula: '|Take profit − entry| ÷ |Entry − stop loss|, averaged',
    glossary: 'risk-reward-ratio',
  },
  maxDrawdown: {
    label: 'Max drawdown',
    definition: 'The largest fall of the equity curve from a peak to the next low in the period, as a share of the starting balance.',
    formula: 'Largest (peak − later low) ÷ starting balance × 100',
    glossary: 'maximum-drawdown',
  },
  expectancy: {
    label: 'Expectancy',
    definition: 'What an average trade has made in this period. Positive means the approach paid per trade; it needs a sample of at least 30 trades to mean much.',
    formula: '(Win rate × average win) − (loss rate × average loss)',
    glossary: 'expectancy',
  },
  trades: {
    label: 'Trades',
    definition: 'The number of closed trades in the period and scope shown.',
    formula: 'Count of trades',
  },
  avgWin: {
    label: 'Avg win',
    definition: 'The average profit of the trades that won.',
    formula: 'Gross profit ÷ winning trades',
  },
  avgLoss: {
    label: 'Avg loss',
    definition: 'The average loss of the trades that lost, shown as a negative amount.',
    formula: 'Gross loss ÷ losing trades',
  },
  bestWorst: {
    label: 'Best / worst',
    definition: 'The single largest winning and losing trade of the period.',
    formula: 'Highest and lowest net P&L of one trade',
  },
  winStreak: {
    label: 'Longest win streak',
    definition: 'The most winning trades in a row in the period.',
    formula: 'Longest run of consecutive winning trades',
  },
  lossStreak: {
    label: 'Longest loss streak',
    definition: 'The most losing trades in a row in the period.',
    formula: 'Longest run of consecutive losing trades',
  },
};
