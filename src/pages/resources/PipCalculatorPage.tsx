import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  FormulaDisclosure,
  LiveResult,
  calcInputClass,
  calcLabelClass,
} from '@/components/content/calculator';
import { calculatorSchema } from '@/config/seo';
import { formatMoney } from '@/lib/format';
import {
  ACCOUNT_CURRENCIES,
  FOREX_PAIRS,
  LOT_SIZES,
  contractSizeOf,
  pipValue,
  type AccountCurrency,
} from '@/content/forexPairs';

export function PipCalculatorPage() {
  const [pairIndex, setPairIndex] = useState(0);
  const [lots, setLots] = useState<number>(1);
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrency>('USD');

  const selectedPair = FOREX_PAIRS[pairIndex];
  const contract = contractSizeOf(selectedPair);
  const unitName = contract === 100000 ? 'units' : 'oz';
  const results = useMemo(() => pipValue(selectedPair, lots * contract, accountCurrency), [selectedPair, lots, contract, accountCurrency]);
  const decimals = results.inAccount < 1 ? 4 : 2;
  // Each currency is shown once: the headline is the account currency.
  const showQuote = results.quoteCurrency !== accountCurrency;
  const showUsd = accountCurrency !== 'USD' && results.quoteCurrency !== 'USD';
  const summary = `Pip value ${formatMoney(results.inAccount, accountCurrency, { decimals })} for ${selectedPair.label}, ${lots} lot.`;

  return (
    <ContentPageShell
      title="Pip value calculator - free | TradeQut"
      description="Calculate the value of a pip for any currency pair and lot size in your account currency. Free forex pip calculator."
      path="/resources/pip-calculator"
      jsonLd={calculatorSchema(
        'Pip value calculator',
        'Calculate pip value for any currency pair and lot size in your account currency.',
        '/resources/pip-calculator'
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
          <li className="font-medium text-foreground">Pip value calculator</li>
        </ol>
      </nav>

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Pip value calculator</h1>
      <p className="mb-8 text-base text-foreground-soft">
        Find out how much each pip is worth for any currency pair, lot size, and account currency.
      </p>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="currency-pair" className={calcLabelClass}>
                Currency pair
              </label>
              <select id="currency-pair" value={pairIndex} onChange={(e) => setPairIndex(Number(e.target.value))} className={calcInputClass}>
                {FOREX_PAIRS.map((pair, i) => (
                  <option key={pair.value} value={i}>
                    {pair.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lot-size" className={calcLabelClass}>
                Lot size
              </label>
              <select id="lot-size" value={lots} onChange={(e) => setLots(Number(e.target.value))} className={calcInputClass}>
                {LOT_SIZES.map((ls) => (
                  <option key={ls.value} value={ls.value}>
                    {ls.label} ({ls.value} lot = {(ls.value * contract).toLocaleString('en-US')} {unitName})
                  </option>
                ))}
              </select>
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
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            <p className="text-sm text-muted-foreground">Pip value ({accountCurrency})</p>
            <p className="num mb-4 text-2xl font-semibold text-foreground">
              {formatMoney(results.inAccount, accountCurrency, { decimals })}
            </p>
            {(showQuote || showUsd) && (
              <dl className="grid grid-cols-2 gap-4">
                {showQuote && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Pip value ({results.quoteCurrency})</dt>
                    <dd className="num text-base font-semibold text-foreground">{formatMoney(results.inQuote, results.quoteCurrency, { decimals: results.inQuote < 1 ? 4 : 2 })}</dd>
                  </div>
                )}
                {showUsd && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Pip value (USD)</dt>
                    <dd className="num text-base font-semibold text-foreground">{formatMoney(results.inUsd, 'USD', { decimals: results.inUsd < 1 ? 4 : 2 })}</dd>
                  </div>
                )}
              </dl>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {selectedPair.label} &middot; Pip size {selectedPair.pipSize} &middot; Rate {selectedPair.rate}
            </p>
            <FormulaDisclosure>
              <p>Pip value in the quote currency = pip size × lots × contract size (100,000 units a lot; 100 oz for gold).</p>
              <p>Converted to USD with the pair rate when USD is the base, at a reference rate for crosses, then to your account currency.</p>
            </FormulaDisclosure>
            <p className="mt-4 rounded border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
              Exchange rates are approximate and for education only. Use live rates from your broker for real trades.
            </p>
            <LiveResult text={summary} />
          </>
        }
      />

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          What are pips and how do lot sizes work?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          A{' '}
          <Link to="/glossary" className="text-primary underline underline-offset-4">
            pip
          </Link>{' '}
          (percentage in point) is the smallest standard price movement in a currency pair. For
          most pairs, one pip equals 0.0001 (the fourth decimal place). For Japanese yen pairs
          like USD/JPY, one pip equals 0.01 (the second decimal place) because the yen is quoted
          with fewer decimals. Understanding pip values is essential because it translates price
          movement into actual profit or loss in your account currency.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Lot sizes determine how many units of the base currency you are trading. A standard lot
          is 100,000 units, a mini lot is 10,000, and a micro lot is 1,000. The larger the lot
          size, the more each pip is worth. For example, on EUR/USD with a standard lot, one pip
          equals $10. With a mini lot, it equals $1. With a micro lot, it equals $0.10. Choosing
          the right lot size is directly connected to your{' '}
          <Link to="/resources/position-size" className="text-primary underline underline-offset-4">
            position sizing strategy
          </Link>
          .
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          When the quote currency of a pair is not your account currency, you need to convert the
          pip value using the current exchange rate. For a USD-quoted pair like EUR/USD, the pip
          value is already in US dollars. For a pair like USD/JPY, the raw pip value is in
          Japanese yen, so you divide by the USD/JPY rate to get the value in USD. This extra
          conversion step is why pip calculators are so useful: they handle the math for you.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Knowing the pip value before entering a trade lets you calculate exact dollar risk and
          combine it with your stop loss distance to determine proper position sizing. For example,
          if you know one pip on a mini lot of GBP/USD is worth $1 and your stop loss is 30 pips
          away, your total risk on that trade is $30. Pair this with our{' '}
          <Link to="/resources/position-size" className="text-primary underline underline-offset-4">
            position size calculator
          </Link>{' '}
          to determine the ideal lot size for your account balance and risk tolerance, or use the{' '}
          <Link to="/resources/risk-reward" className="text-primary underline underline-offset-4">
            risk-reward calculator
          </Link>{' '}
          to evaluate whether the trade setup is worth taking in the first place.
        </p>
      </section>
    </ContentPageShell>
  );
}
