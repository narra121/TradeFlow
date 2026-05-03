import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { calculatorSchema } from '@/config/seo';

const inputClassName =
  'w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClassName = 'block text-sm font-medium text-foreground mb-1.5';

export function PositionSizeCalculatorPage() {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPips, setStopLossPips] = useState(50);

  const results = useMemo(() => {
    if (accountBalance <= 0 || riskPercent <= 0 || stopLossPips <= 0) {
      return { dollarRisk: 0, positionSize: 0 };
    }

    const dollarRisk = (accountBalance * riskPercent) / 100;
    // Standard lot = 100,000 units; 1 pip on a standard lot = $10
    const pipValuePerLot = 10;
    const positionSize = dollarRisk / (stopLossPips * pipValuePerLot);

    return { dollarRisk, positionSize };
  }, [accountBalance, riskPercent, stopLossPips]);

  return (
    <ContentPageShell
      title="Position Size Calculator - Free | TradeQut"
      description="Calculate the right position size based on your account balance, risk tolerance, and stop loss distance. Free tool for forex and stock traders."
      path="/resources/position-size"
      jsonLd={calculatorSchema(
        'Position Size Calculator',
        'Calculate optimal position size based on account balance, risk percentage, and stop loss distance.',
        '/resources/position-size'
      )}
      navLabel="Position size calculator navigation"
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
          <li className="text-foreground font-medium">Position Size Calculator</li>
        </ol>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
        Position Size Calculator
      </h1>
      <p className="text-lg text-muted-foreground mb-8 sm:mb-10">
        Determine the correct lot size for any trade based on how much you are willing to risk.
      </p>

      {/* Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 sm:mb-16">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <label htmlFor="account-balance" className={labelClassName}>
              Account Balance ($)
            </label>
            <input
              id="account-balance"
              type="number"
              min={0}
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="risk-percent" className={labelClassName}>
              Risk Per Trade (%)
            </label>
            <input
              id="risk-percent"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="stop-loss-pips" className={labelClassName}>
              Stop Loss Distance (pips)
            </label>
            <input
              id="stop-loss-pips"
              type="number"
              min={0}
              step={1}
              value={stopLossPips}
              onChange={(e) => setStopLossPips(Number(e.target.value))}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Dollar Amount at Risk</p>
              <p className="text-2xl font-bold text-foreground">
                ${results.dollarRisk.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Position Size</p>
              <p className="text-2xl font-bold text-primary">
                {results.positionSize.toFixed(4)} lots
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Based on a standard lot (100,000 units) where 1 pip = $10.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Why Position Sizing Matters
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Position sizing is one of the most important concepts in trading risk management. It
          determines how many units of an asset you buy or sell per trade, directly controlling how
          much capital is at risk. Even a strategy with a high{' '}
          <Link to="/glossary" className="text-primary hover:underline">
            win rate
          </Link>{' '}
          can blow up an account if position sizes are too large, because a string of losses is
          statistically inevitable over time. Conversely, sizing too small means you leave potential
          returns on the table.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The most common approach is the fixed-percentage method: you risk a set percentage of your
          account on every trade, typically between 0.5% and 2%. This calculator uses that model. By
          risking the same percentage regardless of account size, your position sizes automatically
          scale up as you grow and scale down after drawdowns, helping preserve capital during
          losing streaks.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Your{' '}
          <Link to="/glossary" className="text-primary hover:underline">
            stop loss
          </Link>{' '}
          distance is the other critical variable. A tighter stop loss lets you trade a larger
          position for the same dollar risk, while a wider stop requires a smaller position. This
          interplay between stop distance and position size is what makes the calculator so useful:
          you can experiment with different scenarios to find the setup that matches both your
          strategy and your risk appetite.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Proper position sizing also ties directly into your{' '}
          <Link to="/resources/risk-reward" className="text-primary hover:underline">
            risk-reward ratio
          </Link>
          . When you know exactly how much you stand to lose on every trade, you can plan your take
          profit levels to ensure a favorable ratio. Over many trades, a disciplined combination of
          consistent position sizing and a positive risk-reward edge is what separates profitable
          traders from those who blow up their accounts. For a deeper look at how risk and reward
          interact, check out our{' '}
          <Link to="/resources/risk-reward" className="text-primary hover:underline">
            risk-reward calculator
          </Link>
          .
        </p>
      </section>
    </ContentPageShell>
  );
}
