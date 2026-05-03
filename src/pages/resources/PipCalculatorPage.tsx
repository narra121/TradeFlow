import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { calculatorSchema } from '@/config/seo';

const inputClassName =
  'w-full px-4 py-2.5 rounded-xl border border-border/50 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelClassName = 'block text-sm font-medium text-foreground mb-1.5';

const PAIRS = [
  { label: 'EUR/USD', value: 'EUR/USD', rate: 1.085, pipSize: 0.0001, quoteIsUSD: true },
  { label: 'GBP/USD', value: 'GBP/USD', rate: 1.265, pipSize: 0.0001, quoteIsUSD: true },
  { label: 'USD/JPY', value: 'USD/JPY', rate: 155.5, pipSize: 0.01, quoteIsUSD: false },
  { label: 'AUD/USD', value: 'AUD/USD', rate: 0.655, pipSize: 0.0001, quoteIsUSD: true },
  { label: 'USD/CAD', value: 'USD/CAD', rate: 1.365, pipSize: 0.0001, quoteIsUSD: false },
  { label: 'EUR/GBP', value: 'EUR/GBP', rate: 0.8575, pipSize: 0.0001, quoteIsUSD: false },
  { label: 'NZD/USD', value: 'NZD/USD', rate: 0.595, pipSize: 0.0001, quoteIsUSD: true },
] as const;

const LOT_SIZES = [
  { label: 'Standard (100,000)', value: 100000 },
  { label: 'Mini (10,000)', value: 10000 },
  { label: 'Micro (1,000)', value: 1000 },
] as const;

const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;

// Approximate cross-rates to USD for conversion
const TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.085,
  GBP: 1.265,
  INR: 0.01193, // 1 INR ~ 0.01193 USD (i.e. 1 USD ~ 83.8 INR)
};

export function PipCalculatorPage() {
  const [pairIndex, setPairIndex] = useState(0);
  const [lotSize, setLotSize] = useState(100000);
  const [accountCurrency, setAccountCurrency] = useState<string>('USD');

  const results = useMemo(() => {
    const pair = PAIRS[pairIndex];
    // Pip value in quote currency
    const pipValueInQuote = pair.pipSize * lotSize;

    // Convert to USD first
    let pipValueUSD: number;
    if (pair.quoteIsUSD) {
      // Quote currency is USD (e.g., EUR/USD) -- pip value is already in USD
      pipValueUSD = pipValueInQuote;
    } else {
      // Quote currency is not USD -- need to convert
      // For USD/JPY: pip value is in JPY, divide by USD/JPY rate to get USD
      // For USD/CAD: pip value is in CAD, divide by USD/CAD rate to get USD
      // For EUR/GBP: pip value is in GBP, multiply by GBP/USD rate to get USD
      if (pair.value === 'EUR/GBP') {
        const gbpToUsd = TO_USD['GBP'];
        pipValueUSD = pipValueInQuote * gbpToUsd;
      } else {
        // Quote is JPY or CAD; pair rate IS the conversion factor
        pipValueUSD = pipValueInQuote / pair.rate;
      }
    }

    // Convert from USD to account currency
    const usdToAccount = 1 / TO_USD[accountCurrency];
    const pipValueAccount = pipValueUSD * usdToAccount;

    return {
      pipValueInQuote,
      pipValueUSD,
      pipValueAccount,
      quoteCurrency: pair.value.split('/')[1],
    };
  }, [pairIndex, lotSize, accountCurrency]);

  const selectedPair = PAIRS[pairIndex];

  return (
    <ContentPageShell
      title="Pip Value Calculator - Free | TradeQut"
      description="Calculate the value of a pip for any currency pair and lot size in your account currency. Free forex pip calculator."
      path="/resources/pip-calculator"
      jsonLd={calculatorSchema(
        'Pip Value Calculator',
        'Calculate pip value for any currency pair and lot size in your account currency.',
        '/resources/pip-calculator'
      )}
      navLabel="Pip calculator navigation"
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
          <li className="text-foreground font-medium">Pip Value Calculator</li>
        </ol>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
        Pip Value Calculator
      </h1>
      <p className="text-lg text-muted-foreground mb-8 sm:mb-10">
        Find out how much each pip is worth for any currency pair, lot size, and account currency.
      </p>

      {/* Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 sm:mb-16">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <label htmlFor="currency-pair" className={labelClassName}>
              Currency Pair
            </label>
            <select
              id="currency-pair"
              value={pairIndex}
              onChange={(e) => setPairIndex(Number(e.target.value))}
              className={inputClassName}
            >
              {PAIRS.map((pair, i) => (
                <option key={pair.value} value={i}>
                  {pair.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lot-size" className={labelClassName}>
              Lot Size
            </label>
            <select
              id="lot-size"
              value={lotSize}
              onChange={(e) => setLotSize(Number(e.target.value))}
              className={inputClassName}
            >
              {LOT_SIZES.map((ls) => (
                <option key={ls.value} value={ls.value}>
                  {ls.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="account-currency" className={labelClassName}>
              Account Currency
            </label>
            <select
              id="account-currency"
              value={accountCurrency}
              onChange={(e) => setAccountCurrency(e.target.value)}
              className={inputClassName}
            >
              {ACCOUNT_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Pip Value ({accountCurrency})</p>
              <p className="text-2xl font-bold text-primary">
                {results.pipValueAccount.toFixed(4)} {accountCurrency}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Pip Value ({results.quoteCurrency})
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {results.pipValueInQuote.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pip Value (USD)</p>
                <p className="text-lg font-semibold text-foreground">
                  {results.pipValueUSD.toFixed(4)}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {selectedPair.label} &middot; Pip size: {selectedPair.pipSize} &middot; Rate:{' '}
                {selectedPair.rate}
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Exchange rates are approximate and for educational purposes only. Use live rates from
              your broker for actual trading decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Educational content */}
      <section className="prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          What Are Pips and How Do Lot Sizes Work?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          A{' '}
          <Link to="/glossary" className="text-primary hover:underline">
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
          <Link to="/resources/position-size" className="text-primary hover:underline">
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
          <Link to="/resources/position-size" className="text-primary hover:underline">
            position size calculator
          </Link>{' '}
          to determine the ideal lot size for your account balance and risk tolerance, or use the{' '}
          <Link to="/resources/risk-reward" className="text-primary hover:underline">
            risk-reward calculator
          </Link>{' '}
          to evaluate whether the trade setup is worth taking in the first place.
        </p>
      </section>
    </ContentPageShell>
  );
}
