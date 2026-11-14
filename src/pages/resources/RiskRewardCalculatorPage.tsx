import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DirectionRadios,
  FormulaDisclosure,
  DecimalInput,
  LiveResult,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { calculatorSchema } from '@/config/seo';

type Direction = 'long' | 'short';

/** Decimals typed in a price ("1.2650" → 4), so a per-unit distance shows at the prices' own precision: forex risk 0.0050, not 0.01. At least 2. */
function priceDecimals(...texts: string[]): number {
  return Math.max(2, ...texts.map((t) => t.trim().split('.')[1]?.replace(/\D/g, '').length ?? 0));
}

export function RiskRewardCalculatorPage() {
  const [direction, setDirection] = useState<Direction>('long');
  const [entryText, setEntryText] = useState('100');
  const [stopText, setStopText] = useState('95');
  const [targetText, setTargetText] = useState('115');
  const entryPrice = parseDecimal(entryText);
  const stopLossPrice = parseDecimal(stopText);
  const takeProfitPrice = parseDecimal(targetText);

  const results = useMemo(() => {
    const risk = direction === 'long' ? entryPrice - stopLossPrice : stopLossPrice - entryPrice;
    const reward = direction === 'long' ? takeProfitPrice - entryPrice : entryPrice - takeProfitPrice;

    if (risk <= 0 || reward <= 0) {
      return { ratio: 0, risk: 0, reward: 0, breakevenWinRate: 0, valid: false };
    }

    const ratio = reward / risk;
    const breakevenWinRate = (1 / (1 + ratio)) * 100;

    return { ratio, risk, reward, breakevenWinRate, valid: true };
  }, [direction, entryPrice, stopLossPrice, takeProfitPrice]);

  const decimals = priceDecimals(entryText, stopText, targetText);

  const summary = results.valid
    ? `Risk-reward 1 to ${results.ratio.toFixed(2)}, breakeven win rate ${results.breakevenWinRate.toFixed(1)} percent.`
    : 'The stop loss and take profit are on the wrong side of the entry for this direction.';

  return (
    <ContentPageShell
      title="Risk-reward calculator - free | TradeQut"
      description="Calculate your risk-reward ratio, potential profit and loss, and breakeven win rate for any trade. Free tool for traders."
      path="/resources/risk-reward"
      jsonLd={calculatorSchema(
        'Risk-reward calculator',
        'Determine risk-reward ratio, potential profit/loss, and breakeven win rate for any trade setup.',
        '/resources/risk-reward'
      )}
      maxWidth="max-w-5xl"
    >
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link to="/resources" className="inline-flex min-h-6 max-md:min-h-11 items-center hover:text-foreground">
              Resources
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-foreground">Risk-reward calculator</li>
        </ol>
      </nav>

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Risk-reward calculator</h1>
      <p className="mb-8 text-base text-foreground-soft">Evaluate the risk-reward profile of any trade before you enter it.</p>

      <CalcLayout
        inputs={
          <>
            <DirectionRadios value={direction} onChange={setDirection} />
            <div>
              <label htmlFor="entry-price" className={calcLabelClass}>
                Entry price
              </label>
              <DecimalInput id="entry-price" value={entryText} onChange={setEntryText} />
            </div>
            <div>
              <label htmlFor="stop-loss-price" className={calcLabelClass}>
                Stop loss price
              </label>
              <DecimalInput id="stop-loss-price" value={stopText} onChange={setStopText} />
            </div>
            <div>
              <label htmlFor="take-profit-price" className={calcLabelClass}>
                Take profit price
              </label>
              <DecimalInput id="take-profit-price" value={targetText} onChange={setTargetText} />
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {!results.valid ? (
              <p className="text-sm text-foreground-soft">
                {direction === 'long'
                  ? 'Stop loss must be below entry and take profit must be above entry for a long trade.'
                  : 'Stop loss must be above entry and take profit must be below entry for a short trade.'}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Risk-reward ratio</p>
                <p className="num mb-4 text-2xl font-semibold text-foreground">1 : {results.ratio.toFixed(2)}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Risk (per unit)</dt>
                    <dd className="num text-base font-semibold text-loss">{results.risk.toFixed(decimals)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Reward (per unit)</dt>
                    <dd className="num text-base font-semibold text-profit">{results.reward.toFixed(decimals)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">Breakeven win rate</p>
                <p className="num text-base font-semibold text-foreground">{results.breakevenWinRate.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You need to win at least {results.breakevenWinRate.toFixed(1)}% of your trades at this ratio to break even,
                  before fees.
                </p>
              </>
            )}
            <FormulaDisclosure>
              <p>Risk = distance from entry to stop. Reward = distance from entry to target.</p>
              <p>Ratio = reward ÷ risk. Breakeven win rate = 1 ÷ (1 + ratio).</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Understanding risk-reward ratios
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The risk-reward ratio (R:R) compares how much you stand to lose against how much you
          stand to gain on a trade. A ratio of 1:2 means for every dollar you risk, you expect to
          make two dollars if the trade goes your way. It is one of the most fundamental tools in a
          trader's toolkit because it determines whether a strategy is mathematically viable over a
          large number of trades, independent of the{' '}
          <Link to="/glossary" className="text-primary underline underline-offset-4">
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
          <Link to="/resources/position-size" className="text-primary underline underline-offset-4">
            position sizing
          </Link>{' '}
          is what builds long-term edge. Risk-reward tells you whether a trade is worth taking;
          position sizing tells you how much to commit. Use both calculators together to plan
          trades that protect your capital while maximizing your upside. Tracking your actual R:R
          outcomes in a{' '}
          <Link to="/guide" className="text-primary underline underline-offset-4">
            trading journal
          </Link>{' '}
          helps you identify whether your real-world execution matches your plan.
        </p>
      </section>
    </ContentPageShell>
  );
}
