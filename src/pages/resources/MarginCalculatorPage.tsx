import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcInputClass, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Table } from '@/content/components/ArticleParts';
import { ACCOUNT_CURRENCIES, FOREX_PAIRS, contractSizeOf, type AccountCurrency } from '@/content/forexPairs';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney, formatPercent } from '@/lib/format';
import { marginFor, type MarginError } from '@/lib/forex/margin';

const PATH = '/resources/margin-calculator';
const NAME = 'Forex margin and leverage calculator';
const TITLE = 'Forex Margin Calculator With Leverage, Incl. Gold | TradeQut';
const DESCRIPTION =
  'Margin required for a forex or gold (XAU/USD) position at your leverage, in your account currency, with the position value and the lots your balance can hold.';

const LEVERAGES = [1, 2, 5, 10, 20, 30, 50, 100, 200, 400, 500];

const ERRORS: Record<MarginError, string> = {
  price: 'Enter the current price of the pair.',
  lots: 'Enter a position size above 0 lots.',
  leverage: 'Leverage must be 1:1 or more.',
  balance: 'The balance cannot be negative.',
};

const FAQ: FaqItem[] = [
  {
    question: 'How is forex margin calculated?',
    answer:
      'Margin = lots × contract size × price ÷ leverage, in the quote currency, then converted to your account currency. One lot of EUR/USD is 100,000 euros; at 1.0850 that is $108,500, and at 1:30 leverage the margin is $108,500 ÷ 30 = $3,616.67.',
  },
  {
    question: 'How much margin does one lot of gold need?',
    answer:
      'One lot of XAU/USD is 100 troy ounces at most brokers. At $4,200 an ounce the position is worth $420,000, so at 1:100 the margin is $4,200 and at 1:20 it is $21,000. Check the contract size in your platform\'s symbol specification, because some brokers use other sizes.',
  },
  {
    question: 'What does leverage of 1:100 mean?',
    answer:
      'For every 1 of margin you control 100 of position. It does not change what a pip is worth: a 1-lot EUR/USD position gains or loses about $10 a pip at 1:30 or at 1:500. Leverage only decides how much of your balance is tied up as margin, and so how close a losing position comes to a margin call.',
  },
  {
    question: 'What is effective leverage?',
    answer:
      'The value of your open positions divided by your balance. A $108,500 position on a $10,000 account is 10.85 times effective leverage, whatever the broker\'s maximum is. It is the figure that tells you how hard the account moves: a 1% price move is about 10.85% of the balance.',
  },
  {
    question: 'Why does a USD/JPY lot need the same margin at any price?',
    answer:
      'For pairs with USD as the base currency the position is 100,000 dollars per lot, so in a USD account the margin is 100,000 ÷ leverage whatever the rate. For other pairs the price matters, because a lot is 100,000 units of a different currency.',
  },
  {
    question: 'Are these the margins my broker charges?',
    answer:
      'The arithmetic is the standard one, but brokers set their own leverage per instrument, can require more margin around weekends and news, and convert currencies at live rates. The calculator uses your price for the pair and a reference rate for any other conversion; your platform\'s margin figure is the one that counts.',
  },
];

export function MarginCalculatorPage() {
  const [pairIndex, setPairIndex] = useState(0);
  const [priceText, setPriceText] = useState(String(FOREX_PAIRS[0].rate));
  const [lotsText, setLotsText] = useState('1');
  const [leverage, setLeverage] = useState(30);
  const [currency, setCurrency] = useState<AccountCurrency>('USD');
  const [balanceText, setBalanceText] = useState('10000');

  const pair = FOREX_PAIRS[pairIndex];
  const choosePair = (i: number) => {
    setPairIndex(i);
    setPriceText(String(FOREX_PAIRS[i].rate));
  };

  const r = useMemo(
    () => marginFor({ pair, price: parseDecimal(priceText), lots: parseDecimal(lotsText), leverage, account: currency, balance: parseDecimal(balanceText) }),
    [pair, priceText, lotsText, leverage, currency, balanceText],
  );
  const money = (n: number) => formatMoney(n, currency);
  const unitName = contractSizeOf(pair) === 100000 ? `units of ${pair.value.slice(0, 3)}` : 'oz';
  const lots = parseDecimal(lotsText);
  const summary = r.status === 'error' ? ERRORS[r.error] : `Margin ${money(r.margin)} for ${lots} ${lots === 1 ? 'lot' : 'lots'} of ${pair.value} at 1:${leverage}.`;

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Forex margin and leverage calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">The margin a position ties up at your leverage, for currency pairs and gold, in your account currency.</p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Margin = lots × contract size × price ÷ leverage. One lot of EUR/USD at 1.0850 is a $108,500 position, which needs $3,616.67 of margin at 1:30
          and $1,085 at 1:100. One lot of gold (100 oz) at $4,200 needs $4,200 at 1:100. Leverage changes the margin, not what a pip is worth.
        </ShortAnswer>
      </div>

      <CalcLayout
        inputs={
          <>
            <div>
              <label htmlFor="mg-pair" className={calcLabelClass}>Pair</label>
              <select id="mg-pair" value={pairIndex} onChange={(e) => choosePair(Number(e.target.value))} className={calcInputClass}>
                {FOREX_PAIRS.map((p, i) => (
                  <option key={p.value} value={i}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mg-price" className={calcLabelClass}>Price now ({pair.value})</label>
              <DecimalInput id="mg-price" value={priceText} onChange={setPriceText} />
              <p className="mt-1 text-xs text-muted-foreground">Filled with an example price; type your platform&apos;s current price.</p>
            </div>
            <div>
              <label htmlFor="mg-lots" className={calcLabelClass}>Position size (lots)</label>
              <DecimalInput id="mg-lots" value={lotsText} onChange={setLotsText} />
            </div>
            <div>
              <label htmlFor="mg-leverage" className={calcLabelClass}>Leverage</label>
              <select id="mg-leverage" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className={calcInputClass}>
                {LEVERAGES.map((l) => (
                  <option key={l} value={l}>1:{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mg-currency" className={calcLabelClass}>Account currency</label>
              <select id="mg-currency" value={currency} onChange={(e) => setCurrency(e.target.value as AccountCurrency)} className={calcInputClass}>
                {ACCOUNT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mg-balance" className={calcLabelClass}>Account balance (optional)</label>
              <DecimalInput id="mg-balance" value={balanceText} onChange={setBalanceText} />
            </div>
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {r.status === 'error' ? (
              <p className="text-sm text-foreground-soft">{ERRORS[r.error]}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Required margin</p>
                <p className="num mb-4 text-2xl font-semibold text-foreground">{money(r.margin)}</p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Position value</dt>
                    <dd className="num text-base font-semibold text-foreground">{money(r.notional)}</dd>
                    <dd className="text-xs text-muted-foreground">{r.units.toLocaleString('en-US')} {unitName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Margin per lot</dt>
                    <dd className="num text-base font-semibold text-foreground">{money(r.marginPerLot)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Share of balance</dt>
                    <dd className="num text-base font-semibold text-foreground">{r.marginPctOfBalance === null ? 'n/a' : formatPercent(r.marginPctOfBalance, 1)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Effective leverage</dt>
                    <dd className="num text-base font-semibold text-foreground">{r.effectiveLeverage === null ? 'n/a' : `${r.effectiveLeverage.toFixed(2)}×`}</dd>
                  </div>
                </dl>
                {r.maxLots !== null && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    The whole balance would cover the margin of {r.maxLots.toFixed(2)} lots at 1:{leverage}, with nothing left for a losing move.
                  </p>
                )}
              </>
            )}
            <FormulaDisclosure>
              <p>Position value = lots × contract size (100,000 units, or 100 oz of gold) × price, converted to your account currency.</p>
              <p>Margin = position value ÷ leverage. Effective leverage = position value ÷ balance.</p>
              <p>Your price is used for the pair; other conversions use reference rates, not live ones.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>Margin for one lot at common leverage</H2>
        <P>At the example prices in the calculator, in US dollars:</P>
        <Table
          head={['Position', 'Value', '1:30', '1:100', '1:500']}
          rows={[
            ['1 lot EUR/USD at 1.0850', '$108,500', '$3,616.67', '$1,085.00', '$217.00'],
            ['1 lot GBP/USD at 1.2650', '$126,500', '$4,216.67', '$1,265.00', '$253.00'],
            ['1 lot USD/JPY (any price)', '$100,000', '$3,333.33', '$1,000.00', '$200.00'],
            ['1 lot XAU/USD (100 oz) at $4,200', '$420,000', '$14,000.00', '$4,200.00', '$840.00'],
          ]}
        />

        <H2>Margin, pip value and risk are separate numbers</H2>
        <P>
          Margin is collateral: it is returned when you close the trade. What you can lose depends on the size and the stop, not the leverage: one lot of
          EUR/USD with a 20-pip stop risks about $200 at 1:30 and at 1:500. Size the trade from the risk first with the{' '}
          <A to="/resources/position-size">position size calculator</A> (it handles gold too), check the value of a pip with the{' '}
          <A to="/resources/pip-calculator">pip value calculator</A>, then use this page to check the margin fits.
        </P>
        <Callout title="Leverage limits differ by country and broker">
          In some countries regulators cap the leverage a retail account can use, and brokers set their own limits per instrument. Use the leverage your account actually has; this
          page does not say what leverage is allowed where you live.
        </Callout>
        <P>
          Prop-firm accounts often have their own leverage and loss limits; the <A to="/resources/prop-firm-drawdown-calculator">prop firm drawdown
          calculator</A> shows how much room is left. Once you trade, a <A to="/forex-trading-journal">forex trading journal</A> shows the size, stop and
          result of every trade in lots, from your <A to="/mt5-trading-journal">MT5</A> or <A to="/mt4-trading-journal">MT4</A> report.
        </P>

        <Faq items={FAQ} />
        <Disclaimer>
          Educational calculator with example prices and reference exchange rates, not live data. TradeQut is a journaling and analytics tool, not a broker or an
          investment adviser, and nothing here is a recommendation to trade any currency or metal.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
