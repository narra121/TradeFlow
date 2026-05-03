export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  formula?: string;
  example?: string;
  relatedTerms: string[];
  relatedArticles: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'breakout',
    term: 'Breakout',
    definition:
      'A breakout occurs when price moves beyond a defined support or resistance level with increased volume or momentum. Breakouts signal potential trend continuation or reversal and are commonly used as entry triggers in technical trading strategies. False breakouts, where price briefly pierces a level then reverses, are a frequent challenge that traders manage with confirmation filters such as volume spikes or candle closes beyond the level.',
    example:
      'A stock consolidates between $48 and $50 for two weeks. When it closes above $50.20 on double the average volume, a breakout trader enters long with a stop just below $50.',
    relatedTerms: ['support-and-resistance', 'pullback', 'volatility', 'day-trading'],
    relatedArticles: [],
  },
  {
    id: 'day-trading',
    term: 'Day Trading',
    definition:
      'Day trading is a style where all positions are opened and closed within the same trading session, avoiding overnight exposure. Day traders rely on intraday price movements and typically use short time-frame charts (1-minute to 15-minute). This approach demands strict discipline, fast execution, and robust risk management because the compressed time window amplifies the impact of transaction costs and emotional decision-making.',
    example:
      'A day trader buys 500 shares of AAPL at $175.20 at 10:15 AM after a momentum signal, sells at $176.10 by 11:00 AM, and is flat before the lunch hour.',
    relatedTerms: ['scalping', 'swing-trading', 'leverage', 'slippage'],
    relatedArticles: ['day-trading-journal'],
  },
  {
    id: 'drawdown',
    term: 'Drawdown',
    definition:
      'Drawdown measures the decline from a peak in account equity to a subsequent trough, expressed as a percentage or currency amount. It quantifies how much a trader has lost relative to their highest equity point before recovering. Monitoring drawdown is essential for risk management because large drawdowns require disproportionately larger gains to recover -- a 50% drawdown, for instance, demands a 100% return just to break even.',
    formula: 'Drawdown = (Peak Equity - Trough Equity) / Peak Equity x 100%',
    example:
      'Your account peaks at $12,000 then drops to $10,200. The drawdown is ($12,000 - $10,200) / $12,000 = 15%.',
    relatedTerms: ['maximum-drawdown', 'equity-curve', 'pnl'],
    relatedArticles: ['track-reduce-drawdown', 'trading-metrics-that-matter'],
  },
  {
    id: 'equity-curve',
    term: 'Equity Curve',
    definition:
      'An equity curve is a graphical representation of a trading account balance plotted over time. It visually reveals the trajectory of performance, including growth phases, drawdown periods, and overall consistency. A smooth, upward-sloping equity curve indicates steady profitability, while jagged or declining curves highlight periods of inconsistency or losses that may warrant strategy adjustments.',
    example:
      'After six months of trading, your equity curve shows a steady climb from $5,000 to $7,200 with two visible drawdown dips of roughly 8% each -- a sign of controlled risk-taking.',
    relatedTerms: ['drawdown', 'maximum-drawdown', 'pnl', 'sharpe-ratio'],
    relatedArticles: ['trading-metrics-that-matter'],
  },
  {
    id: 'expectancy',
    term: 'Expectancy',
    definition:
      'Expectancy is the average amount a trader can expect to gain or lose per trade over a large sample. It combines win rate and the average sizes of wins and losses into a single number that predicts long-term profitability. A positive expectancy means the strategy is statistically profitable over time, while a negative expectancy guarantees eventual loss regardless of any individual winning streak.',
    formula: 'Expectancy = (Win Rate x Avg Win) - (Loss Rate x Avg Loss)',
    example:
      'With a 45% win rate, $300 average win, and $180 average loss, expectancy = (0.45 x $300) - (0.55 x $180) = $135 - $99 = $36 per trade.',
    relatedTerms: ['win-rate', 'risk-reward-ratio', 'profit-factor'],
    relatedArticles: ['trading-metrics-that-matter', 'win-rate-vs-profit-factor'],
  },
  {
    id: 'funded-account',
    term: 'Funded Account',
    definition:
      'A funded account is a trading account provided by a proprietary trading firm to a trader who has passed the firm\'s evaluation process. The trader operates with the firm\'s capital and keeps a negotiated percentage of profits, typically 70-90%. Funded accounts allow skilled traders to access significantly more capital than they personally possess, but come with strict drawdown limits and trading rules that must be followed to retain the account.',
    example:
      'After passing a two-phase evaluation with a $100,000 simulated account, a trader receives a funded account with the same balance and an 80/20 profit split.',
    relatedTerms: ['prop-trading', 'drawdown', 'maximum-drawdown', 'trading-plan'],
    relatedArticles: ['prop-trading-challenges'],
  },
  {
    id: 'leverage',
    term: 'Leverage',
    definition:
      'Leverage is the use of borrowed capital to increase the size of a trading position beyond what the trader\'s own funds would allow. It is expressed as a ratio such as 10:1, meaning $1 of equity controls $10 of position value. While leverage amplifies potential profits, it equally amplifies losses and can lead to rapid account depletion if risk is not carefully managed through position sizing and stop-losses.',
    formula: 'Leverage Ratio = Total Position Value / Account Equity',
    example:
      'With $5,000 in your account and 20:1 leverage, you can control a $100,000 position. A 1% move against you wipes out 20% of your equity.',
    relatedTerms: ['margin', 'position-sizing', 'drawdown'],
    relatedArticles: ['risk-reward-ratio-guide'],
  },
  {
    id: 'liquidity',
    term: 'Liquidity',
    definition:
      'Liquidity refers to how easily an asset can be bought or sold at its current market price without causing a significant price movement. Highly liquid markets, such as major forex pairs or large-cap stocks, have tight bid-ask spreads and deep order books that allow large trades with minimal slippage. Low liquidity leads to wider spreads and greater price impact, increasing transaction costs and execution risk.',
    example:
      'EUR/USD is one of the most liquid markets in the world, with daily volume exceeding $700 billion. A small-cap penny stock with $50,000 daily volume is comparatively illiquid.',
    relatedTerms: ['slippage', 'spread', 'volatility'],
    relatedArticles: [],
  },
  {
    id: 'lot-size',
    term: 'Lot Size',
    definition:
      'Lot size is the standardized quantity of an asset in a single trading contract, most commonly used in forex. A standard lot represents 100,000 units of the base currency, a mini lot is 10,000 units, and a micro lot is 1,000 units. Choosing the appropriate lot size is fundamental to position sizing and risk management because it directly determines the dollar value of each pip movement.',
    example:
      'Trading 1 standard lot of EUR/USD means each pip movement equals approximately $10. With a micro lot, each pip is worth approximately $0.10.',
    relatedTerms: ['pip', 'position-sizing', 'leverage', 'margin'],
    relatedArticles: ['forex-trading-journal'],
  },
  {
    id: 'margin',
    term: 'Margin',
    definition:
      'Margin is the collateral a trader must deposit with their broker to open and maintain a leveraged position. It is not a fee or transaction cost but rather a portion of account equity set aside as a good-faith deposit. If the account equity falls below the maintenance margin requirement due to adverse price movement, the broker issues a margin call, requiring the trader to deposit additional funds or face automatic liquidation of positions.',
    formula: 'Required Margin = Position Size / Leverage Ratio',
    example:
      'To open a $50,000 forex position with 50:1 leverage, you need $1,000 in margin. If the trade moves against you and your equity drops below the maintenance margin, you receive a margin call.',
    relatedTerms: ['leverage', 'position-sizing', 'lot-size'],
    relatedArticles: ['forex-trading-journal'],
  },
  {
    id: 'maximum-drawdown',
    term: 'Maximum Drawdown',
    definition:
      'Maximum drawdown (Max DD) is the largest peak-to-trough decline in account equity over a specific period, representing the worst-case loss scenario historically experienced. It is the single most important risk metric for evaluating a trading strategy because it reveals the deepest valley a trader has had to endure. Prop firms and fund managers commonly set maximum drawdown limits, and exceeding them often results in account termination.',
    formula: 'Max Drawdown = max(Peak[i] - Trough[i]) / Peak[i] x 100% for all i',
    example:
      'Over a year of trading, your account hit a high of $25,000 and dropped to $19,500 at its lowest point before recovering. Your maximum drawdown is ($25,000 - $19,500) / $25,000 = 22%.',
    relatedTerms: ['drawdown', 'equity-curve', 'funded-account', 'prop-trading'],
    relatedArticles: ['track-reduce-drawdown', 'prop-trading-challenges'],
  },
  {
    id: 'pip',
    term: 'Pip',
    definition:
      'A pip (percentage in point) is the smallest standard price increment in a forex quote, typically the fourth decimal place for most currency pairs (0.0001) and the second decimal place for JPY pairs (0.01). Pips provide a universal unit for measuring price changes and calculating profit or loss across different currency pairs. Some brokers quote an additional fractional pip (pipette), extending the precision to a fifth decimal place.',
    formula: 'Pip Value = (Pip Size / Exchange Rate) x Lot Size',
    example:
      'If EUR/USD moves from 1.1050 to 1.1073, the move is 23 pips. On a standard lot, each pip is worth about $10, so the gain is approximately $230.',
    relatedTerms: ['lot-size', 'spread', 'leverage'],
    relatedArticles: ['forex-trading-journal'],
  },
  {
    id: 'pnl',
    term: 'P&L (Profit and Loss)',
    definition:
      'P&L (profit and loss) is the net monetary result of a trade, a series of trades, or an account over a given period. Realized P&L reflects closed positions, while unrealized P&L accounts for open positions at current market prices. Tracking P&L systematically, broken down by day, week, instrument, or strategy, is the foundation of performance analysis in a trading journal.',
    formula: 'P&L = (Exit Price - Entry Price) x Position Size - Commissions - Fees',
    example:
      'You buy 200 shares at $45.00 and sell at $47.50 with $10 total commission. P&L = ($47.50 - $45.00) x 200 - $10 = $490.',
    relatedTerms: ['equity-curve', 'drawdown', 'win-rate', 'profit-factor'],
    relatedArticles: ['trading-metrics-that-matter'],
  },
  {
    id: 'position-sizing',
    term: 'Position Sizing',
    definition:
      'Position sizing determines how many units of an asset to buy or sell on a given trade, based on account size, risk tolerance, and the distance to the stop-loss. It is arguably the most critical component of risk management because it directly controls how much capital is at risk on each trade. Common methods include fixed-percentage risk (typically 1-2% of account per trade), fixed-dollar risk, and the Kelly criterion.',
    formula: 'Position Size = (Account Equity x Risk %) / (Entry Price - Stop Loss Price)',
    example:
      'With a $20,000 account risking 1% per trade ($200) and a stop-loss 50 cents below entry, your position size is $200 / $0.50 = 400 shares.',
    relatedTerms: ['stop-loss', 'risk-reward-ratio', 'leverage', 'lot-size'],
    relatedArticles: ['risk-reward-ratio-guide', 'build-trading-plan'],
  },
  {
    id: 'profit-factor',
    term: 'Profit Factor',
    definition:
      'Profit factor is the ratio of total gross profits to total gross losses over a set of trades. A profit factor above 1.0 means the strategy is profitable overall, with values above 1.5 generally considered good and above 2.0 considered excellent. Unlike win rate alone, profit factor accounts for the magnitude of wins and losses, making it a more holistic measure of trading system quality.',
    formula: 'Profit Factor = Gross Profits / Gross Losses',
    example:
      'Over 100 trades, your winners totaled $8,500 and your losers totaled $5,200. Profit factor = $8,500 / $5,200 = 1.63.',
    relatedTerms: ['win-rate', 'expectancy', 'pnl', 'risk-reward-ratio'],
    relatedArticles: ['win-rate-vs-profit-factor', 'trading-metrics-that-matter'],
  },
  {
    id: 'prop-trading',
    term: 'Prop Trading',
    definition:
      'Proprietary (prop) trading is when a trader uses a firm\'s capital rather than their own personal funds to execute trades. Modern online prop firms typically require traders to pass an evaluation challenge demonstrating consistent profitability and disciplined risk management. Once funded, traders share profits with the firm while the firm absorbs the financial risk. This model has grown rapidly as it allows talented traders to scale without needing significant personal capital.',
    example:
      'A trader pays a $500 evaluation fee, passes a $200,000 challenge by meeting the 10% profit target within 30 days without exceeding the 5% daily or 10% total drawdown limits, and receives a funded account.',
    relatedTerms: ['funded-account', 'maximum-drawdown', 'trading-plan', 'drawdown'],
    relatedArticles: ['prop-trading-challenges'],
  },
  {
    id: 'pullback',
    term: 'Pullback',
    definition:
      'A pullback is a temporary reversal in the direction of an existing trend, offering potential entry points at more favorable prices. In an uptrend, a pullback is a brief decline before the price resumes its upward movement; in a downtrend, it is a short rally before continuation lower. Pullback trading is popular because it allows entries with tighter stop-losses and better risk-reward ratios compared to chasing breakouts.',
    example:
      'A stock in a strong uptrend rises from $60 to $68, pulls back to $65 near its 20-day moving average, then resumes climbing. A pullback trader enters at $65 with a stop at $63.',
    relatedTerms: ['breakout', 'support-and-resistance', 'swing-trading'],
    relatedArticles: [],
  },
  {
    id: 'risk-reward-ratio',
    term: 'Risk-Reward Ratio',
    definition:
      'The risk-reward ratio (R:R) compares the potential loss on a trade to the potential gain, measured from the entry price to the stop-loss and take-profit levels respectively. A ratio of 1:3 means you risk $1 to potentially make $3. This metric is central to trade planning because even a strategy with a low win rate can be profitable if the reward consistently outpaces the risk per trade.',
    formula: 'R:R = (Entry - Stop Loss) / (Take Profit - Entry)',
    example:
      'You enter a trade at $100 with a stop-loss at $98 and a take-profit at $106. Risk = $2, reward = $6, so R:R = 1:3.',
    relatedTerms: ['stop-loss', 'take-profit', 'expectancy', 'position-sizing'],
    relatedArticles: ['risk-reward-ratio-guide', 'trading-metrics-that-matter'],
  },
  {
    id: 'scalping',
    term: 'Scalping',
    definition:
      'Scalping is an ultra-short-term trading style that aims to capture very small price movements, typically holding positions for seconds to a few minutes. Scalpers execute a high volume of trades per session and rely on tight spreads, fast execution, and minimal slippage. Profitability depends on a high win rate combined with strict exits, since each individual gain is small and a single large loss can erase many winning trades.',
    example:
      'A scalper enters ES futures on a 1-tick pullback in an uptrend, targets 4 ticks profit ($50), and places a 3-tick stop ($37.50). They execute 40-60 such trades per session.',
    relatedTerms: ['day-trading', 'spread', 'slippage', 'liquidity'],
    relatedArticles: ['day-trading-journal'],
  },
  {
    id: 'sharpe-ratio',
    term: 'Sharpe Ratio',
    definition:
      'The Sharpe ratio measures risk-adjusted return by calculating the excess return of a strategy above the risk-free rate per unit of volatility. A higher Sharpe ratio indicates better compensation for the risk taken, with values above 1.0 considered acceptable, above 2.0 very good, and above 3.0 exceptional. It is widely used by institutional traders and fund managers to compare strategies on a level playing field regardless of their absolute returns.',
    formula: 'Sharpe Ratio = (Strategy Return - Risk-Free Rate) / Standard Deviation of Returns',
    example:
      'Your strategy returns 24% annually with a 12% standard deviation, and the risk-free rate is 4%. Sharpe ratio = (24% - 4%) / 12% = 1.67.',
    relatedTerms: ['volatility', 'equity-curve', 'expectancy', 'drawdown'],
    relatedArticles: ['trading-metrics-that-matter'],
  },
  {
    id: 'slippage',
    term: 'Slippage',
    definition:
      'Slippage is the difference between the expected execution price of a trade and the actual price at which it is filled. It most commonly occurs during periods of high volatility, around major news events, or in low-liquidity markets. Slippage can be positive (filled at a better price) or negative (filled at a worse price), and it directly impacts trading costs and the accuracy of backtesting results versus live performance.',
    example:
      'You place a market buy order expecting a fill at $150.00, but the order executes at $150.12 due to a sudden price spike. That $0.12 difference is negative slippage.',
    relatedTerms: ['spread', 'liquidity', 'volatility'],
    relatedArticles: [],
  },
  {
    id: 'spread',
    term: 'Spread',
    definition:
      'The spread is the difference between the bid price (what buyers will pay) and the ask price (what sellers will accept) for an asset. It represents a built-in transaction cost on every trade and is the primary source of revenue for market makers. Tighter spreads are found in highly liquid instruments like major forex pairs and large-cap stocks, while exotic pairs and small-cap stocks tend to have wider spreads.',
    formula: 'Spread = Ask Price - Bid Price',
    example:
      'EUR/USD is quoted at 1.1050/1.1052. The spread is 2 pips. On a standard lot, this costs approximately $20 as an implicit entry fee.',
    relatedTerms: ['pip', 'liquidity', 'slippage'],
    relatedArticles: ['forex-trading-journal'],
  },
  {
    id: 'stop-loss',
    term: 'Stop-Loss',
    definition:
      'A stop-loss is a pre-set order that automatically closes a position when the price reaches a specified level, limiting the maximum loss on a trade. It is the single most important risk management tool available to traders because it enforces discipline and prevents catastrophic losses from runaway positions. Stop-losses can be placed at fixed price levels, percentages, or based on technical levels such as below support or beyond an ATR multiple.',
    example:
      'You buy a stock at $50.00 and set a stop-loss at $48.50, limiting your risk to $1.50 per share (3%). If the stock drops to $48.50, the position is automatically closed.',
    relatedTerms: ['take-profit', 'risk-reward-ratio', 'position-sizing', 'slippage'],
    relatedArticles: ['risk-reward-ratio-guide', 'build-trading-plan'],
  },
  {
    id: 'support-and-resistance',
    term: 'Support and Resistance',
    definition:
      'Support is a price level where buying pressure historically prevents further decline, while resistance is a level where selling pressure prevents further advance. These levels form the backbone of technical analysis and are used to identify entry points, exit targets, and stop-loss placements. When a support level breaks, it often becomes resistance and vice versa, a concept known as polarity.',
    example:
      'A stock repeatedly bounces off $42.00 (support) and reverses near $48.00 (resistance). A trader buys near $42.00 with a stop at $41.50 and targets $47.50.',
    relatedTerms: ['breakout', 'pullback', 'take-profit', 'stop-loss'],
    relatedArticles: [],
  },
  {
    id: 'swing-trading',
    term: 'Swing Trading',
    definition:
      'Swing trading is a medium-term strategy where positions are held for several days to a few weeks, aiming to capture a single "swing" or directional move within a trend. Swing traders typically use daily and 4-hour charts and combine technical analysis with broader market context. This approach balances the time commitment of day trading with the patience required for long-term investing, making it popular among part-time traders.',
    example:
      'A swing trader identifies a stock that has pulled back to its 50-day moving average in an uptrend, enters long, and holds for 8 days until the stock reaches the prior high.',
    relatedTerms: ['day-trading', 'pullback', 'support-and-resistance', 'take-profit'],
    relatedArticles: [],
  },
  {
    id: 'take-profit',
    term: 'Take-Profit',
    definition:
      'A take-profit order automatically closes a position when the price reaches a predetermined favorable level, locking in gains. Setting take-profit targets is crucial for maintaining disciplined exits, as traders often let greed override their plan and hold positions too long, watching profits evaporate. Take-profit levels are commonly set at key resistance or support zones, round numbers, or calculated from the risk-reward ratio.',
    example:
      'You enter a long trade at $80.00 with a 1:2 risk-reward ratio, placing your stop-loss at $78.00 and your take-profit at $84.00. When the stock hits $84.00, the position closes automatically with a $4.00 per share gain.',
    relatedTerms: ['stop-loss', 'risk-reward-ratio', 'support-and-resistance'],
    relatedArticles: ['risk-reward-ratio-guide'],
  },
  {
    id: 'trading-plan',
    term: 'Trading Plan',
    definition:
      'A trading plan is a comprehensive written document that defines a trader\'s strategy, risk parameters, entry and exit criteria, position sizing rules, and performance goals. It serves as an objective rulebook that removes emotional decision-making from the trading process. Without a plan, traders tend to make impulsive decisions driven by fear or greed, leading to inconsistent results and larger drawdowns.',
    example:
      'A trading plan might specify: trade only the first two hours of the session, risk no more than 1% per trade, take only pullback entries in trending markets, and stop trading for the day after three consecutive losses.',
    relatedTerms: ['trading-psychology', 'position-sizing', 'stop-loss', 'risk-reward-ratio'],
    relatedArticles: ['build-trading-plan', 'trading-psychology-managing-emotions'],
  },
  {
    id: 'trading-psychology',
    term: 'Trading Psychology',
    definition:
      'Trading psychology encompasses the emotional and mental factors that influence trading decisions, including fear, greed, overconfidence, revenge trading, and loss aversion. It is widely considered the most challenging aspect of trading because even a profitable strategy will fail if the trader cannot execute it consistently under psychological pressure. Developing emotional discipline through journaling, rules-based systems, and self-awareness is essential for long-term trading success.',
    example:
      'After three losing trades, a trader feels the urge to double their position size to "make it back" -- a classic revenge-trading impulse. Their trading plan forbids this, so they take a 15-minute break instead.',
    relatedTerms: ['trading-plan', 'drawdown', 'win-rate'],
    relatedArticles: ['trading-psychology-managing-emotions', 'build-trading-plan'],
  },
  {
    id: 'volatility',
    term: 'Volatility',
    definition:
      'Volatility measures the magnitude and frequency of price fluctuations in an asset or market over a given period. High volatility means large price swings and greater uncertainty, while low volatility indicates calm, range-bound conditions. Traders use volatility metrics like standard deviation, ATR (Average True Range), and the VIX index to calibrate position sizes, set stop-losses, and identify optimal trading conditions for their strategy.',
    example:
      'A stock with 30% annualized volatility is expected to move roughly 30% from its current price over the next year. A scalper might avoid this stock during low-volatility lunch hours and focus on the volatile market open.',
    relatedTerms: ['liquidity', 'slippage', 'sharpe-ratio', 'stop-loss'],
    relatedArticles: [],
  },
  {
    id: 'win-rate',
    term: 'Win Rate',
    definition:
      'Win rate is the percentage of total trades that result in a profit, calculated by dividing the number of winning trades by the total number of trades. While a high win rate feels psychologically rewarding, it does not guarantee profitability on its own -- a trader can win 80% of the time but still lose money if the average loss far exceeds the average win. Win rate must always be evaluated alongside risk-reward ratio and profit factor for a complete picture of strategy performance.',
    formula: 'Win Rate = (Number of Winning Trades / Total Trades) x 100%',
    example:
      'Out of 50 trades in a month, 28 were profitable. Win rate = 28 / 50 x 100% = 56%.',
    relatedTerms: ['profit-factor', 'expectancy', 'risk-reward-ratio', 'pnl'],
    relatedArticles: ['win-rate-vs-profit-factor', 'trading-metrics-that-matter'],
  },
];
