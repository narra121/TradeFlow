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
  | 'lossStreak'
  | 'breakEvenWinRate'
  | 'payoff'
  | 'expectancyR'
  | 'resultBridge'
  | 'concentration'
  | 'evidence'
  | 'beyondStop'
  | 'plannedVsCaptured'
  | 'riskPerTrade'
  | 'drawdownNow'
  | 'longestUnderwater'
  | 'scenario'
  | 'holdingMedian'
  | 'tradeNumber'
  | 'tradesPerDay'
  | 'vsNormal'
  | 'whatIf'
  | 'twoWay';

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
    definition: 'The average result of a trade in units of the risk you planned: how far the price moved for you, divided by the distance from entry to stop. Trades without a stop loss or an exit price are left out. It is before fees.',
    formula: 'Direction × (exit − entry) ÷ |entry − stop|, averaged over the trades with a stop',
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
  breakEvenWinRate: {
    label: 'Break-even win rate',
    definition: 'The win rate at which your net result would be zero, given how large your wins are against your losses. Above it the period makes money; below it, it loses.',
    formula: '1 ÷ (1 + average win ÷ average loss)',
  },
  payoff: {
    label: 'Payoff',
    definition: 'How large an average win is against an average loss.',
    formula: 'Average win ÷ average loss',
  },
  expectancyR: {
    label: 'Expectancy in R',
    definition: 'The average result per trade in R, with the range it probably lies in (95%, from resampling your own trades). While the range includes zero, the period does not show an edge yet.',
    formula: 'Average R of the trades with a stop; range = 2.5th to 97.5th percentile of 2,000 resampled averages',
    glossary: 'expectancy',
  },
  resultBridge: {
    label: 'Where the result came from',
    definition: 'Your net result split into gross profit, losses within the risk you planned, losses past the stop, losses on trades without a stop, and fees. The parts add up to the net. Fees are shown apart; the other parts are before fees.',
    formula: 'Loss beyond the stop = the part of a loss past −1R, on trades that ended below −1.05R (5% allowance for slippage)',
  },
  concentration: {
    label: 'Dependence on a few trades',
    definition: 'How much of your profit came from your three best trades, and what the period would show without them.',
    formula: 'Profit of the 3 best trades ÷ gross profit; net − their profit',
  },
  evidence: {
    label: 'Evidence',
    definition: 'Whether a difference is large and steady enough to act on. Edge or leak needs 30 trades in the group and 30 outside it, a difference that clears a strict threshold for the number of groups compared, and the same direction in the older and newer half of your trades. Anything else is a pattern to watch, or too early to tell under 30 trades.',
    formula: 'Welch t-test on R against all other trades, Bonferroni-corrected at 5%, same sign in both halves',
  },
  beyondStop: {
    label: 'Losses beyond the stop',
    definition: 'Losing trades that ended past the stop you planned (worse than −1.05R, allowing 5% for slippage), and the money lost past that planned risk.',
    formula: 'Count of trades with R below −1.05; sum of the loss past −1R',
  },
  plannedVsCaptured: {
    label: 'Planned against captured',
    definition: 'On winning trades with a target: the reward you planned in R against the R you took, and how many reached the target.',
    formula: 'Average planned R:R against average realised R of those winners; captured ÷ planned',
  },
  riskPerTrade: {
    label: 'Risk per trade',
    definition: 'The money at stake between entry and stop on each trade, and the trades that risked more than 1.5 times your usual (median) amount.',
    formula: '|Entry − stop| × quantity × multiplier; median and largest; share of the starting balance',
  },
  drawdownNow: {
    label: 'Drawdown now',
    definition: 'How far the account is below its highest closing point in the period, in money.',
    formula: 'Highest cumulative net so far − cumulative net at the last close',
    glossary: 'maximum-drawdown',
  },
  longestUnderwater: {
    label: 'Longest below the high',
    definition: 'The most calendar days the account spent below a previous high before getting back to it (or until now).',
    formula: 'Longest run of days from a high to the next new high',
  },
  scenario: {
    label: 'Next 100 trades (scenario)',
    definition: 'Your own trades, drawn at random 5,000 times to build 100-trade sequences. It shows the spread of outcomes if your next trades resemble your past ones. It is a scenario, not a forecast.',
    formula: 'Bootstrap of your trade results: 5,000 runs of 100 trades; 5th, 50th and 95th percentile',
  },
  holdingMedian: {
    label: 'Holding time',
    definition: 'The middle holding time of winning trades against losing trades. Losers held longer than winners often means late exits or moved stops.',
    formula: 'Median of (exit time − entry time), winners and losers apart',
  },
  tradeNumber: {
    label: 'Trade number in the day',
    definition: 'Results of your 1st, 2nd, 3rd and later trades of each day.',
    formula: 'Trades ranked by entry time within each day, in your time zone',
  },
  tradesPerDay: {
    label: 'Trades per day',
    definition: 'Your days grouped by how many trades you took, with the result of an average day in each group.',
    formula: 'Average day = net of the group ÷ days in the group',
  },
  vsNormal: {
    label: 'Avg R vs normal',
    definition: 'The average R of the trades with this behaviour against the average R of the comparison group named under the behaviour.',
    formula: 'Average R of the flagged trades against average R of the comparison group',
  },
  whatIf: {
    label: 'What-if replay',
    definition: 'Your period replayed without the trades a rule would have blocked. It only removes trades that happened, so it predicts nothing.',
    formula: 'Net and average R of the trades the rule keeps',
  },
  twoWay: {
    label: 'Then by',
    definition: 'Your trades split by two things at once. Cells are small, so this is for exploring only: cells under 30 trades are greyed.',
    formula: 'Trades grouped by both values; evidence judged with every cell as a candidate',
  },
};
