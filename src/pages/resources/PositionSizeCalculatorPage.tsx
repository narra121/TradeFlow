import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  FormulaDisclosure,
  DecimalInput,
  LiveResult,
  calcInputClass,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { calculatorSchema } from '@/config/seo';
import { ACCOUNT_CURRENCIES, FOREX_PAIRS, contractSizeOf, pipValue, type AccountCurrency } from '@/content/forexPairs';
import { formatMoney } from '@/lib/format';

export function PositionSizeCalculatorPage() {
  const [balanceText, setBalanceText] = useState('10000');
  const [riskText, setRiskText] = useState('1');
  const [stopText, setStopText] = useState('50');
  const accountBalance = parseDecimal(balanceText);
  const riskPercent = parseDecimal(riskText);
  const stopLossPips = parseDecimal(stopText);
  const [pairIndex, setPairIndex] = useState(0);
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrency>('USD');

  const pair = FOREX_PAIRS[pairIndex];
  const results = useMemo(() => {
    const perLot = pipValue(pair, contractSizeOf(pair), accountCurrency).inAccount;
    if (accountBalance <= 0 || riskPercent <= 0 || stopLossPips <= 0) {
      return { risk: 0, positionSize: 0, perLot };
    }
    const risk = (accountBalance * riskPercent) / 100;
    return { risk, positionSize: risk / (stopLossPips * perLot), perLot };
  }, [accountBalance, riskPercent, stopLossPips, pair, accountCurrency]);
  const inputError =
    accountBalance <= 0
      ? 'Enter an account balance above 0.'
      : riskPercent <= 0
        ? 'Enter a risk per trade above 0%.'
        : stopLossPips <= 0
          ? 'Enter a stop loss above 0 pips.'
          : null;

  const summary = inputError ?? `Position size ${results.positionSize.toFixed(2)} lots, risk ${formatMoney(results.risk, accountCurrency)}.`;

  return (
    <ContentPageShell
      title="Position size calculator - free | TradeQut"
      description="Calculate the right position size based on your account balance, risk tolerance, and stop loss distance. Free tool for forex traders."
      path="/resources/position-size"
      jsonLd={calculatorSchema(
        'Position size calculator',
        'Calculate position size from account balance, risk percentage, stop distance and the pair pip value.',
        '/resources/position-size'
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
          <li className="font-medium text-foreground">Position size calculator</li>
        </ol>
      </nav>

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Position size calculator</h1>
      <p className="mb-8 text-base text-foreground-soft">
        Determine the lot size for a forex trade from how much you are willing to risk.
      </p>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="account-balance" className={calcLabelClass}>
                Account balance ({accountCurrency})
              </label>
              <DecimalInput id="account-balance" value={balanceText} onChange={setBalanceText} />
            </div>
            <div>
              <label htmlFor="account-currency" className={calcLabelClass}>
                Account currency
              </label>
              <select
                id="account-currency"
                value={accountCurrency}
                onChange={(e) => setAccountCurrency(e.target.value as AccountCurrency)}
                className={calcInputClass}
              >
                {ACCOUNT_CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="currency-pair" className={calcLabelClass}>
                Pair
              </label>
              <select id="currency-pair" value={pairIndex} onChange={(e) => setPairIndex(Number(e.target.value))} className={calcInputClass}>
                {FOREX_PAIRS.map((p, i) => (
                  <option key={p.value} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="risk-percent" className={calcLabelClass}>
                Risk per trade (%)
              </label>
              <DecimalInput id="risk-percent" value={riskText} onChange={setRiskText} />
            </div>
            <div>
              <label htmlFor="stop-loss-pips" className={calcLabelClass}>
                Stop loss distance (pips)
              </label>
              <DecimalInput id="stop-loss-pips" value={stopText} onChange={setStopText} />
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {inputError ? (
              <p className="text-sm text-foreground-soft">{inputError}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Position size</p>
                <p className="num mb-4 text-2xl font-semibold text-foreground">{results.positionSize.toFixed(2)} lots</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Amount at risk</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {formatMoney(results.risk, accountCurrency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Pip value per standard lot</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {formatMoney(results.perLot, accountCurrency)}
                    </dd>
                  </div>
                </dl>
              </>
            )}
            <FormulaDisclosure>
              <p>Amount at risk = balance × risk %.</p>
              <p>Position size (lots) = amount at risk ÷ (stop pips × pip value per standard lot).</p>
              <p>Pip value uses approximate rates for {pair.label}; use your broker&apos;s live value for real trades.</p>
              <p>For gold one lot is 100 oz and one pip is 0.10, so a pip is worth $10 a lot; if your broker counts 0.01 as a pip, enter ten times the pips.</p>
            </FormulaDisclosure>
            <Link to="/signup" className="mt-4 inline-flex min-h-6 max-md:min-h-11 items-center text-sm font-medium text-primary hover:underline">
              Log this trade in your journal &rarr;
            </Link>
            <LiveResult text={summary} />
          </>
        }
      />

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Why position sizing matters
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Position sizing is one of the most important concepts in trading risk management. It
          determines how many units of an asset you buy or sell per trade, directly controlling how
          much capital is at risk. Even a strategy with a high{' '}
          <Link to="/glossary" className="text-primary underline underline-offset-4">
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
          <Link to="/glossary" className="text-primary underline underline-offset-4">
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
          <Link to="/resources/risk-reward" className="text-primary underline underline-offset-4">
            risk-reward ratio
          </Link>
          . When you know exactly how much you stand to lose on every trade, you can plan your take
          profit levels to ensure a favorable ratio. Over many trades, a disciplined combination of
          consistent position sizing and a positive risk-reward edge is what separates profitable
          traders from those who blow up their accounts. For a deeper look at how risk and reward
          interact, check out our{' '}
          <Link to="/resources/risk-reward" className="text-primary underline underline-offset-4">
            risk-reward calculator
          </Link>
          .
        </p>
      </section>
    </ContentPageShell>
  );
}
