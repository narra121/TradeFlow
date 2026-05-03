import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { calculatorSchema } from '@/config/seo';

const inputClassName =
  'w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClassName = 'block text-sm font-medium text-foreground mb-1.5';

type Direction = 'long' | 'short';

export function RiskRewardCalculatorPage() {
  const [direction, setDirection] = useState<Direction>('long');
  const [entryPrice, setEntryPrice] = useState(100);
  const [stopLossPrice, setStopLossPrice] = useState(95);
  const [takeProfitPrice, setTakeProfitPrice] = useState(115);

  const results = useMemo(() => {
    const risk =
      direction === 'long' ? entryPrice - stopLossPrice : stopLossPrice - entryPrice;
    const reward =
      direction === 'long' ? takeProfitPrice - entryPrice : entryPrice - takeProfitPrice;

    if (risk <= 0 || reward <= 0) {
      return { ratio: 0, risk: 0, reward: 0, breakevenWinRate: 0, valid: false };
    }

    const ratio = reward / risk;
    const breakevenWinRate = (1 / (1 + ratio)) * 100;

    return { ratio, risk, reward, breakevenWinRate, valid: true };
  }, [direction, entryPrice, stopLossPrice, takeProfitPrice]);

  return (
    <ContentPageShell
      title="Risk-Reward Calculator - Free | TradeQut"
      description="Calculate your risk-reward ratio, potential profit and loss, and breakeven win rate for any trade. Free tool for traders."
      path="/resources/risk-reward"
      jsonLd={calculatorSchema(
        'Risk-Reward Calculator',
        'Determine risk-reward ratio, potential profit/loss, and breakeven win rate for any trade setup.',
        '/resources/risk-reward'
      )}
      navLabel="Risk-reward calculator navigation"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link to="/resources" className="hover:text-foreground transition-colors">
              Resources
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium">Risk-Reward Calculator</li>
        </ol>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
        Risk-Reward Calculator
      </h1>
      <p className="text-lg text-muted-foreground mb-8 sm:mb-10">
        Evaluate the risk-reward profile of any trade before you enter it.
      </p>

      {/* Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 sm:mb-16">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Direction toggle */}
          <div>
            <span className={labelClassName}>Direction</span>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  direction === 'long'
                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                    : 'border-border/50 text-muted-foreground hover:border-border'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  direction === 'short'
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : 'border-border/50 text-muted-foreground hover:border-border'
                }`}
              >
                Short
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="entry-price" className={labelClassName}>
              Entry Price
            </label>
            <input
              id="entry-price"
              type="number"
              min={0}
              step={0.01}
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="stop-loss-price" className={labelClassName}>
              Stop Loss Price
            </label>
            <input
              id="stop-loss-price"
              type="number"
              min={0}
              step={0.01}
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="take-profit-price" className={labelClassName}>
              Take Profit Price
            </label>
            <input
              id="take-profit-price"
              type="number"
              min={0}
              step={0.01}
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
          {!results.valid ? (
            <p className="text-sm text-muted-foreground">
              {direction === 'long'
                ? 'Stop loss must be below entry and take profit must be above entry for a long trade.'
                : 'Stop loss must be above entry and take profit must be below entry for a short trade.'}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Risk-Reward Ratio</p>
                <p className="text-2xl font-bold text-primary">
                  1 : {results.ratio.toFixed(2)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Risk (per unit)</p>
                  <p className="text-lg font-semibold text-red-500">
                    ${results.risk.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reward (per unit)</p>
                  <p className="text-lg font-semibold text-green-500">
                    ${results.reward.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground">Breakeven Win Rate</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.breakevenWinRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You need to win at least {results.breakevenWinRate.toFixed(1)}% of your trades
                  at this R:R to break even.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Understanding Risk-Reward Ratios
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The risk-reward ratio (R:R) compares how much you stand to lose against how much you
          stand to gain on a trade. A ratio of 1:2 means for every dollar you risk, you expect to
          make two dollars if the trade goes your way. It is one of the most fundamental tools in a
          trader's toolkit because it determines whether a strategy is mathematically viable over a
          large number of trades, independent of the{' '}
          <Link to="/glossary" className="text-primary hover:underline">
            win rate
          </Link>
          .
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The breakeven win rate is directly derived from the R:R ratio. With a 1:2 ratio, you
          only need to win 33.3% of your trades to break even. With a 1:1 ratio, you need 50%.
          This is why many professional traders focus on setups with at least a 1:2 risk-reward
          profile: it gives them a larger margin for error and still allows profitability even when
          most trades are losers.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Direction matters when calculating risk and reward. For a long trade you buy at the entry
          price, your stop loss sits below entry, and your take profit sits above. For a short
          trade, the logic reverses: your stop loss is above entry and take profit is below. This
          calculator handles both scenarios with the direction toggle so you can evaluate any
          setup accurately.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Combining a good risk-reward ratio with proper{' '}
          <Link to="/resources/position-size" className="text-primary hover:underline">
            position sizing
          </Link>{' '}
          is what builds long-term edge. Risk-reward tells you whether a trade is worth taking;
          position sizing tells you how much to commit. Use both calculators together to plan
          trades that protect your capital while maximizing your upside. Tracking your actual R:R
          outcomes in a{' '}
          <Link to="/guide" className="text-primary hover:underline">
            trading journal
          </Link>{' '}
          helps you identify whether your real-world execution matches your plan.
        </p>
      </section>
    </ContentPageShell>
  );
}
