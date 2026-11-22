import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import {
  CalcLayout,
  DecimalInput,
  DirectionRadios,
  FormulaDisclosure,
  LiveResult,
  calcInputClass,
  calcLabelClass,
  parseDecimal,
} from '@/components/content/calculator';
import { A, Crumbs, Disclaimer, Faq, H2, H3, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { ACCOUNT_CURRENCIES, FOREX_PAIRS, baseCurrencyOf, contractSizeOf, getPair, pipValue, type AccountCurrency, type ForexPair } from '@/content/forexPairs';
import { formatMoney, formatPercent, formatPrice, formatQuantity } from '@/lib/format';
import {
  forexSize,
  priceSize,
  type Direction,
  type ForexError,
  type ForexInput,
  type PriceError,
  type PriceInput,
  type RiskBasis,
} from '@/lib/positionSize';
import { cn } from '@/lib/utils';

const PATH = '/resources/position-size';
const NAME = 'Position size calculator';
const TITLE = 'Position Size Calculator: Forex, Stocks and F&O | TradeQut';
const DESCRIPTION =
  'Size a trade from capital, risk and stop: lots for forex and gold, shares for stocks, whole lots for futures and options. Formula and worked examples.';
const CHECKED = '2026-11-21';

const SEBI_CIRCULAR_URL = 'https://www.sebi.gov.in/sebi_data/attachdocs/oct-2024/1727786261636.pdf';
const SOURCES = [
  {
    label:
      'SEBI circular SEBI/HO/MRD/TPD/P/CIR/2024/132, 1 Oct 2024: Measures to strengthen equity index derivatives framework, para 5.4 (contract size for index derivatives)',
    url: SEBI_CIRCULAR_URL,
    checked: CHECKED,
  },
  {
    label: 'RoboMarkets: EURUSD specification (1 lot = 100,000 EUR, pip 0.0001, lot step 0.01)',
    url: 'https://www.robomarkets.de/en/market-trading/trading/specifications/card/pro-stan/EURUSD',
    checked: CHECKED,
  },
  {
    label: 'RoboMarkets: USDJPY specification (pip 0.01)',
    url: 'https://www.robomarkets.de/en/market-trading/trading/specifications/card/pro-stan/USDJPY',
    checked: CHECKED,
  },
  {
    label: 'RoboMarkets: XAUUSD specification (1 lot = 100 oz, pip 0.01)',
    url: 'https://www.robomarkets.de/en/market-trading/trading/specifications/card/pro-stan/XAUUSD',
    checked: CHECKED,
  },
  {
    label: 'Axi: XAU/USD trading conditions (100 oz per lot)',
    url: 'https://www.axi.com/int/trade/cfds/commodities/precious-metals/xau-usd',
    checked: CHECKED,
  },
];

type Mode = 'forex' | 'price';
type Instrument = 'shares' | 'futures' | 'options';

const FAQ: FaqItem[] = [
  {
    question: 'How do I calculate position size?',
    answer:
      'Decide what you will lose if the stop is hit (capital × risk %, or a fixed amount), then divide it by what one unit loses at the stop. Shares = risk amount ÷ (entry − stop). Futures and options lots = risk amount ÷ ((entry − stop) × lot size). Forex lots = risk amount ÷ (stop in pips × pip value of one lot). Round down so the loss at the stop stays inside the budget: ₹5,000 ÷ ₹28 a share = 178.6, so 178 shares.',
  },
  {
    question: 'How many shares do I buy for my stop loss?',
    answer:
      'Shares = risk amount ÷ distance from entry to stop, rounded down to a whole share. With ₹5,00,000 of capital and 1% risk the budget is ₹5,000. Buying at ₹1,240 with a stop at ₹1,212 risks ₹28 a share, so 178 shares: ₹4,984 at risk and a position worth ₹2,20,720, 44.1% of the capital. If the position would cost more than your capital, it needs margin or leverage, which the calculator does not check.',
  },
  {
    question: 'How do I calculate position size in lots for futures and options?',
    answer:
      'Multiply the stop distance by the lot size to get what one lot loses at the stop, divide the risk amount by it and round down to a whole lot. Quantity = lots × lot size. Type the lot size of your exact contract and expiry from your broker or the exchange: lot sizes are revised, so the calculator does not store them.',
  },
  {
    question: 'What if one lot risks more than my budget?',
    answer:
      'Then no whole lot fits, and the calculator says so: it shows what one lot loses at the stop and the share of capital that is. One lot of an Indian index derivative is large by design. SEBI\'s circular of 1 Oct 2024 says a new index contract must be worth at least ₹15 lakh, and a 1% move against a ₹15 lakh contract is ₹15,000. Trading one lot anyway means risking more than the budget; whether to do that, choose another instrument or skip the trade is your decision.',
  },
  {
    question: 'How is the risk on an options trade worked out?',
    answer:
      'On the premium. For an option you buy, one lot loses (premium at entry − stop premium) × lot size at the stop; with no stop the whole premium, premium × lot size, can be lost. Buying at ₹120 with a stop at ₹80 on a lot of 100 risks ₹4,000 a lot; with no stop it risks ₹12,000. For an option you sell, the stop sits above the entry premium, and the loss can be larger than the stop distance if the premium jumps past the stop.',
  },
  {
    question: 'How do I calculate forex lot size from pips?',
    answer:
      'Lots = risk amount ÷ (stop in pips × pip value of one lot). One lot of EUR/USD is 100,000 euros (RoboMarkets\' specification, for example) and a pip is 0.0001, so a pip on one lot is worth $10. Risking $100 with a 30-pip stop gives 100 ÷ (30 × 10) = 0.333, rounded down to 0.33 lots, or 33,000 euros.',
  },
  {
    question: 'How is lot size worked out for gold (XAU/USD)?',
    answer:
      'The calculator takes one lot of gold as 100 oz, as in the XAU/USD specifications of Axi and RoboMarkets, and counts a pip as 0.10, so a pip on one lot is worth $10. A 40-pip stop is a $4.00 move; risking $120 gives 120 ÷ (40 × 10) = 0.30 lots, or 30 oz. Brokers name the gold pip differently: RoboMarkets lists it as 0.01, so divide a stop counted in 0.01 steps by 10 before you enter it. Check the contract size in your platform\'s symbol specification.',
  },
  {
    question: 'How much should I risk per trade?',
    answer:
      'The calculator does not choose that. It shows what a risk percentage or amount means in lots, shares or contracts, and how much of the budget the rounding leaves unused. To see how the risk per trade changes the chance of a deep drawdown for a given win rate and payoff, use the risk of ruin calculator.',
  },
];

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <fieldset>
      <legend className={calcLabelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex h-10 max-md:h-11 min-w-24 flex-1 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              value === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CurrencySelect({ id, label, value, onChange }: { id: string; label: string; value: AccountCurrency; onChange: (c: AccountCurrency) => void }) {
  return (
    <div>
      <label htmlFor={id} className={calcLabelClass}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as AccountCurrency)} className={calcInputClass}>
        {ACCOUNT_CURRENCIES.map((cur) => (
          <option key={cur} value={cur}>
            {cur}
          </option>
        ))}
      </select>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="num text-base font-semibold text-foreground">{value}</dd>
      {note && <dd className="text-xs text-muted-foreground">{note}</dd>}
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${formatQuantity(n)} ${n === 1 ? one : many}`;
const unitName = (pair: ForexPair) => (pair.contractSize ? 'oz' : baseCurrencyOf(pair));
const lotsText = (lots: number) => `${lots.toFixed(2)} lots`;
const pct = (share: number) => formatPercent(share * 100, share > 0 && share < 0.1 ? 2 : 1);

const budgetError = (e: 'capital' | 'risk' | 'risk-over-capital', basis: RiskBasis, capitalWord: string): string =>
  e === 'capital'
    ? `Enter ${capitalWord === 'balance' ? 'an account balance' : 'your capital'} above 0.`
    : e === 'risk'
      ? basis === 'percent'
        ? 'Enter a risk per trade above 0%.'
        : 'Enter a risk amount above 0.'
      : basis === 'percent'
        ? 'Risk per trade cannot be more than 100%.'
        : `The risk amount cannot be more than the ${capitalWord}.`;

const forexErrorText = (e: ForexError, basis: RiskBasis): string => (e === 'stop' ? 'Enter a stop loss above 0 pips.' : budgetError(e, basis, 'balance'));

function priceErrorText(e: PriceError, basis: RiskBasis, instrument: Instrument, direction: Direction): string {
  switch (e) {
    case 'entry':
      return instrument === 'options' ? 'Enter the premium at entry, above 0.' : 'Enter an entry price above 0.';
    case 'stop':
      return instrument === 'options'
        ? 'Enter a stop on the premium above 0. With no stop, the whole premium is at risk.'
        : 'Enter a stop price above 0.';
    case 'stop-equal':
      return 'The stop is at the entry price, so there is no distance to size from.';
    case 'stop-side':
      return direction === 'long' ? 'For a long trade the stop must be below the entry.' : 'For a short trade the stop must be above the entry.';
    case 'lot-size':
      return 'Enter the lot size of your contract, above 0.';
    default:
      return budgetError(e, basis, 'capital');
  }
}

type PriceField = 'capital' | 'risk' | 'entry' | 'stop' | 'lot';
const priceField = (e: PriceError): PriceField =>
  e === 'capital' ? 'capital' : e === 'risk' || e === 'risk-over-capital' ? 'risk' : e === 'entry' ? 'entry' : e === 'lot-size' ? 'lot' : 'stop';

const usdPerLot = (pair: ForexPair) => pipValue(pair, contractSizeOf(pair), 'USD').inAccount;
const EURUSD = getPair('EUR/USD');
const GOLD = getPair('XAU/USD');
const usd = (n: number) => formatMoney(n, 'USD');
const inr = (n: number) => formatMoney(n, 'INR', { decimals: 0 });

function okForex(i: ForexInput) {
  const r = forexSize(i);
  if (r.status !== 'ok') throw new Error(`position size example: ${r.error}`);
  return r;
}
function okPrice(i: PriceInput) {
  const r = priceSize(i);
  if (r.status !== 'ok') throw new Error(`position size example: ${r.error}`);
  return r;
}

const FX_EUR = { capital: 10000, basis: 'percent', risk: 1, stopPips: 30, pipValuePerLot: usdPerLot(EURUSD), contractSize: contractSizeOf(EURUSD) } as const;
const FX_EUR_R = okForex(FX_EUR);
const FX_GOLD = { capital: 5000, basis: 'amount', risk: 120, stopPips: 40, pipValuePerLot: usdPerLot(GOLD), contractSize: contractSizeOf(GOLD) } as const;
const FX_GOLD_R = okForex(FX_GOLD);
const SHARES = { capital: 500000, basis: 'percent', risk: 1, direction: 'long', entry: 1240, stop: 1212, lotSize: 1 } as const;
const SHARES_R = okPrice(SHARES);
const FUT = { capital: 1000000, basis: 'percent', risk: 1, direction: 'short', entry: 2480, stop: 2502, lotSize: 500 } as const;
const FUT_R = okPrice(FUT);
const FUT_WIDER_R = okPrice({ ...FUT, risk: 1.5 });
const OPT = { capital: 300000, basis: 'percent', risk: 2, direction: 'long', entry: 120, stop: 80, lotSize: 100 } as const;
const OPT_R = okPrice(OPT);

export function PositionSizeCalculatorPage() {
  const [mode, setMode] = useState<Mode>('forex');

  const [balanceText, setBalanceText] = useState('10000');
  const [fxCurrency, setFxCurrency] = useState<AccountCurrency>('USD');
  const [pairIndex, setPairIndex] = useState(0);
  const [fxBasis, setFxBasis] = useState<RiskBasis>('percent');
  const [fxRiskText, setFxRiskText] = useState('1');
  const [stopPipsText, setStopPipsText] = useState('50');

  const [capitalText, setCapitalText] = useState('500000');
  const [pxCurrency, setPxCurrency] = useState<AccountCurrency>('INR');
  const [instrument, setInstrument] = useState<Instrument>('shares');
  const [pxBasis, setPxBasis] = useState<RiskBasis>('percent');
  const [pxRiskText, setPxRiskText] = useState('1');
  const [direction, setDirection] = useState<Direction>('long');
  const [entryText, setEntryText] = useState('1240');
  const [stopText, setStopText] = useState('1212');
  const [lotText, setLotText] = useState('');

  const pair = FOREX_PAIRS[pairIndex];
  const perLot = pipValue(pair, contractSizeOf(pair), fxCurrency).inAccount;
  const fx = useMemo(
    () =>
      forexSize({
        capital: parseDecimal(balanceText),
        basis: fxBasis,
        risk: parseDecimal(fxRiskText),
        stopPips: parseDecimal(stopPipsText),
        pipValuePerLot: perLot,
        contractSize: contractSizeOf(pair),
      }),
    [balanceText, fxBasis, fxRiskText, stopPipsText, perLot, pair],
  );

  const lotsMode = instrument !== 'shares';
  const lotSize = lotsMode ? parseDecimal(lotText) : 1;
  const px = useMemo(
    () =>
      priceSize({
        capital: parseDecimal(capitalText),
        basis: pxBasis,
        risk: parseDecimal(pxRiskText),
        direction,
        entry: parseDecimal(entryText),
        stop: parseDecimal(stopText),
        lotSize,
      }),
    [capitalText, pxBasis, pxRiskText, direction, entryText, stopText, lotSize],
  );

  const fxError = fx.status === 'error' ? forexErrorText(fx.error, fxBasis) : null;
  const fxFieldError = (field: 'balance' | 'risk' | 'stop') => {
    if (fx.status !== 'error') return null;
    const f = fx.error === 'capital' ? 'balance' : fx.error === 'stop' ? 'stop' : 'risk';
    return f === field ? fxError : null;
  };
  const pxError = px.status === 'error' ? priceErrorText(px.error, pxBasis, instrument, direction) : null;
  const pxFieldError = (field: PriceField) => (px.status === 'error' && priceField(px.error) === field ? pxError : null);

  const fxMoney = (n: number) => formatMoney(n, fxCurrency);
  const pxMoney = (n: number) => formatMoney(n, pxCurrency);
  const sizeText = (lots: number) => (lotsMode ? plural(lots, 'lot', 'lots') : plural(lots, 'share', 'shares'));

  const summary =
    mode === 'forex'
      ? fx.status === 'error'
        ? (fxError ?? '')
        : `Position size ${lotsText(fx.lots)}, risk ${fxMoney(fx.riskAtSize)}.`
      : px.status === 'error'
        ? (pxError ?? '')
        : px.oneLotOverBudget
          ? `No whole ${lotsMode ? 'lot' : 'share'} fits: one loses ${pxMoney(px.riskPerLot)} at the stop, over the ${pxMoney(px.budget)} budget.`
          : `Position size ${sizeText(px.lots)}, risk ${pxMoney(px.riskAtSize)}.`;

  const valueLabel = instrument === 'futures' ? 'Contract value' : instrument === 'options' ? (direction === 'long' ? 'Premium paid' : 'Premium received') : 'Position value';
  const costsCapital = instrument === 'shares' || (instrument === 'options' && direction === 'long');

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />

      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Position size calculator for forex, stocks and F&amp;O</h1>
      <p className="mb-6 text-base text-foreground-soft">Lots, shares or contracts from the money you are prepared to lose at your stop.</p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Position size = the amount you risk ÷ what one unit loses at the stop, rounded down. With ₹5,00,000 and 1% risk (₹5,000), buying at ₹1,240 with a
          stop at ₹1,212 risks ₹28 a share: 5,000 ÷ 28 = 178.6, so 178 shares. In forex one lot loses the stop in pips × the pip value: $100 ÷ (30 × $10)
          = 0.33 lots of EUR/USD. For futures and options, divide by the stop distance × the lot size and round down to whole lots.
        </ShortAnswer>
      </div>

      <CalcLayout
        inputs={
          <>
            <ChoiceGroup<Mode>
              legend="Market"
              name="ps-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'forex', label: 'Forex and gold' },
                { value: 'price', label: 'Stocks and F&O' },
              ]}
            />
            {mode === 'forex' ? (
              <>
                <div>
                  <label htmlFor="account-balance" className={calcLabelClass}>
                    Account balance ({fxCurrency})
                  </label>
                  <DecimalInput id="account-balance" value={balanceText} onChange={setBalanceText} error={fxFieldError('balance')} />
                </div>
                <CurrencySelect id="account-currency" label="Account currency" value={fxCurrency} onChange={setFxCurrency} />
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
                <ChoiceGroup<RiskBasis>
                  legend="Risk set as"
                  name="fx-basis"
                  value={fxBasis}
                  onChange={setFxBasis}
                  options={[
                    { value: 'percent', label: '% of balance' },
                    { value: 'amount', label: 'Fixed amount' },
                  ]}
                />
                <div>
                  <label htmlFor="risk-percent" className={calcLabelClass}>
                    {fxBasis === 'percent' ? 'Risk per trade (%)' : `Risk per trade (${fxCurrency})`}
                  </label>
                  <DecimalInput id="risk-percent" value={fxRiskText} onChange={setFxRiskText} error={fxFieldError('risk')} />
                </div>
                <div>
                  <label htmlFor="stop-loss-pips" className={calcLabelClass}>
                    Stop loss distance (pips)
                  </label>
                  <DecimalInput id="stop-loss-pips" value={stopPipsText} onChange={setStopPipsText} error={fxFieldError('stop')} />
                  {pair.contractSize && <p className="mt-1 text-xs text-muted-foreground">A gold pip here is 0.10, so a $4.00 stop is 40 pips.</p>}
                </div>
              </>
            ) : (
              <>
                <ChoiceGroup<Instrument>
                  legend="Instrument"
                  name="ps-instrument"
                  value={instrument}
                  onChange={setInstrument}
                  options={[
                    { value: 'shares', label: 'Shares' },
                    { value: 'futures', label: 'Futures' },
                    { value: 'options', label: 'Options' },
                  ]}
                />
                <div>
                  <label htmlFor="capital" className={calcLabelClass}>
                    Capital ({pxCurrency})
                  </label>
                  <DecimalInput id="capital" value={capitalText} onChange={setCapitalText} error={pxFieldError('capital')} />
                </div>
                <CurrencySelect id="capital-currency" label="Currency" value={pxCurrency} onChange={setPxCurrency} />
                <ChoiceGroup<RiskBasis>
                  legend="Risk set as"
                  name="px-basis"
                  value={pxBasis}
                  onChange={setPxBasis}
                  options={[
                    { value: 'percent', label: '% of capital' },
                    { value: 'amount', label: 'Fixed amount' },
                  ]}
                />
                <div>
                  <label htmlFor="price-risk" className={calcLabelClass}>
                    {pxBasis === 'percent' ? 'Risk per trade (%)' : `Risk per trade (${pxCurrency})`}
                  </label>
                  <DecimalInput id="price-risk" value={pxRiskText} onChange={setPxRiskText} error={pxFieldError('risk')} />
                </div>
                <div>
                  <DirectionRadios value={direction} onChange={setDirection} />
                  <p className="mt-1.5 text-xs text-muted-foreground">Long: you buy first. Short: you sell first, including writing an option.</p>
                </div>
                <div>
                  <label htmlFor="entry-price" className={calcLabelClass}>
                    {instrument === 'options' ? 'Premium at entry' : 'Entry price'}
                  </label>
                  <DecimalInput id="entry-price" value={entryText} onChange={setEntryText} error={pxFieldError('entry')} />
                </div>
                <div>
                  <label htmlFor="stop-price" className={calcLabelClass}>
                    {instrument === 'options' ? 'Stop on the premium' : 'Stop loss price'}
                  </label>
                  <DecimalInput id="stop-price" value={stopText} onChange={setStopText} error={pxFieldError('stop')} />
                </div>
                {lotsMode && (
                  <div>
                    <label htmlFor="lot-size" className={calcLabelClass}>
                      Lot size (units in one lot)
                    </label>
                    <DecimalInput id="lot-size" value={lotText} onChange={setLotText} error={pxFieldError('lot')} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      The lot size belongs to the contract and is revised from time to time. Read it for your exact contract and expiry from your broker&apos;s
                      order window or the exchange; this page does not store lot sizes.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        }
        result={
          <>
            <h2 className="mb-4 text-base font-semibold text-foreground">Result</h2>
            {mode === 'forex' ? (
              fx.status === 'error' ? (
                <p className="text-sm text-foreground-soft">{fxError}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Position size</p>
                  <p className={cn('num text-2xl font-semibold', fx.belowMinimum ? 'text-loss' : 'text-foreground', fx.belowMinimum ? 'mb-2' : 'mb-4')}>
                    {lotsText(fx.lots)}
                  </p>
                  {fx.belowMinimum && (
                    <p className="mb-4 text-sm text-foreground">
                      Even 0.01 lot loses {fxMoney(fx.minLotRisk)} at this stop, more than the {fxMoney(fx.budget)} budget, so no size fits.
                    </p>
                  )}
                  <dl className="grid grid-cols-2 gap-4">
                    <Figure label="Amount at risk" value={fxMoney(fx.riskAtSize)} note={`Budget ${fxMoney(fx.budget)}`} />
                    <Figure label="Pip value per standard lot" value={fxMoney(perLot)} />
                    <Figure label="Position" value={`${formatQuantity(fx.units)} ${unitName(pair)}`} />
                    <Figure label="Budget left unused" value={fxMoney(fx.unused)} note="From rounding down to 0.01 lot" />
                  </dl>
                </>
              )
            ) : px.status === 'error' ? (
              <p className="text-sm text-foreground-soft">{pxError}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Position size</p>
                <p className={cn('num text-2xl font-semibold', px.oneLotOverBudget ? 'mb-2 text-loss' : 'mb-4 text-foreground')}>{sizeText(px.lots)}</p>
                {px.oneLotOverBudget && (
                  <p className="mb-4 text-sm text-foreground">
                    One {lotsMode ? 'lot' : 'share'} loses {pxMoney(px.riskPerLot)} at this stop, {pxMoney(px.riskPerLot - px.budget)} more than the{' '}
                    {pxMoney(px.budget)} budget, so no whole {lotsMode ? 'lot' : 'share'} fits. One {lotsMode ? 'lot' : 'share'} would put {pct(px.oneLotRiskShare)} of the capital at risk.
                  </p>
                )}
                <dl className="grid grid-cols-2 gap-4">
                  <Figure label="Amount at risk" value={pxMoney(px.riskAtSize)} note={`Budget ${pxMoney(px.budget)}`} />
                  <Figure label="Budget left unused" value={pxMoney(px.unused)} />
                  {lotsMode && <Figure label="Loss per lot at the stop" value={pxMoney(px.riskPerLot)} note={`${formatPrice(px.riskPerUnit)} × ${formatQuantity(lotSize)}`} />}
                  {lotsMode && <Figure label="Quantity" value={formatQuantity(px.quantity)} note="Lots × lot size" />}
                  {!px.oneLotOverBudget && (
                    <Figure
                      label={valueLabel}
                      value={pxMoney(px.positionValue)}
                      note={costsCapital ? `${pct(px.capitalShare)} of capital` : instrument === 'futures' ? 'Margin is not checked' : undefined}
                    />
                  )}
                  {!lotsMode && <Figure label="Loss per share at the stop" value={pxMoney(px.riskPerUnit)} />}
                </dl>
                {costsCapital && px.capitalShare > 1 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This costs more than your capital, so it needs margin or leverage, which this calculator does not check.
                  </p>
                )}
                {instrument === 'options' && direction === 'short' && (
                  <p className="mt-3 text-xs text-muted-foreground">A sold option can lose more than the stop distance if the premium jumps past the stop.</p>
                )}
              </>
            )}
            <FormulaDisclosure>
              <p>Risk budget = capital × risk %, or the fixed amount you typed.</p>
              {mode === 'forex' ? (
                <>
                  <p>Lots = risk budget ÷ (stop pips × pip value per standard lot), rounded down to 0.01 lot.</p>
                  <p>
                    Pip value per lot = pip size × contract size (0.0001 or 0.01 for JPY pairs, × 100,000 units; 0.10 × 100 oz for gold), converted to the
                    account currency at approximate rates for {pair.label}. Use your broker&apos;s live value for real trades.
                  </p>
                  <p>If your platform counts 0.01 as a gold pip, divide its pip count by 10 before entering it.</p>
                </>
              ) : (
                <>
                  <p>Loss per unit = |entry − stop|. {lotsMode ? 'Loss per lot = loss per unit × lot size.' : ''}</p>
                  <p>{lotsMode ? 'Lots' : 'Shares'} = risk budget ÷ loss per {lotsMode ? 'lot' : 'share'}, rounded down to a whole {lotsMode ? 'lot' : 'share'}.</p>
                  <p>Amount at risk = size × loss per {lotsMode ? 'lot' : 'share'}; unused = risk budget − amount at risk.</p>
                </>
              )}
              <p>Charges, spread and slippage are not included.</p>
            </FormulaDisclosure>
            <Link to="/signup" className="mt-4 inline-flex min-h-6 max-md:min-h-11 items-center text-sm font-medium text-primary hover:underline">
              Log this trade in your journal &rarr;
            </Link>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>The formula</H2>
        <P>Every mode starts from the same budget and divides it by what one unit of the trade loses if the stop is hit.</P>
        <Table
          head={['Mode', 'Loss of one unit at the stop', 'Size']}
          rows={[
            ['Forex and gold', 'Stop in pips × pip value of one lot', 'Budget ÷ that, rounded down to 0.01 lot'],
            ['Shares', '|Entry − stop|', 'Budget ÷ that, rounded down to a whole share'],
            ['Futures and options', '|Entry − stop| × lot size (for options, on the premium)', 'Budget ÷ that, rounded down to a whole lot'],
          ]}
        />
        <P>
          Budget = capital × risk %, or a fixed amount. Amount at risk = the rounded size × the loss of one unit, which is never more than the budget; the
          difference is left unused. A pip on one lot of EUR/USD is 0.0001 × 100,000 = $10. The method itself, with the reasons to round down, is in{' '}
          <A to="/blog/position-sizing-fixed-risk">position sizing with fixed risk</A>.
        </P>

        <H2>Worked examples: forex and gold</H2>
        <H3>EUR/USD, 1% of a $10,000 account, 30-pip stop</H3>
        <Table
          head={['Step', 'Working']}
          rows={[
            ['Risk budget', `1% × $10,000 = ${usd(FX_EUR_R.budget)}`],
            ['Loss of one lot at the stop', `30 pips × $10.00 = ${usd(FX_EUR.stopPips * FX_EUR.pipValuePerLot)}`],
            ['Lots', `${usd(FX_EUR_R.budget)} ÷ ${usd(FX_EUR.stopPips * FX_EUR.pipValuePerLot)} = ${FX_EUR_R.exactLots.toFixed(3)}, rounded down to ${FX_EUR_R.lots.toFixed(2)}`],
            ['Position', `${FX_EUR_R.lots.toFixed(2)} × 100,000 = ${formatQuantity(FX_EUR_R.units)} EUR`],
            ['Amount at risk', `${usd(FX_EUR_R.riskAtSize)}, with ${usd(FX_EUR_R.unused)} unused`],
          ]}
        />
        <H3>Gold (XAU/USD), a fixed $120 on a $5,000 account, 40-pip stop</H3>
        <Table
          head={['Step', 'Working']}
          rows={[
            ['Stop as a price move', '40 pips × 0.10 = $4.00'],
            ['Loss of one lot at the stop', `40 × $10.00 = ${usd(FX_GOLD.stopPips * FX_GOLD.pipValuePerLot)} (100 oz × $4.00)`],
            ['Lots', `${usd(FX_GOLD_R.budget)} ÷ ${usd(FX_GOLD.stopPips * FX_GOLD.pipValuePerLot)} = ${FX_GOLD_R.lots.toFixed(2)}`],
            ['Position', `${FX_GOLD_R.lots.toFixed(2)} × 100 oz = ${formatQuantity(FX_GOLD_R.units)} oz`],
            ['Amount at risk', `${usd(FX_GOLD_R.riskAtSize)}, ${pct(FX_GOLD_R.riskAtSize / FX_GOLD.capital)} of the account`],
          ]}
        />
        <P>
          For pairs whose quote currency is not your account currency (USD/JPY in a USD account, any pair in an INR account) the pip value depends on a
          rate. The calculator uses approximate reference rates; the <A to="/resources/pip-calculator">pip value calculator</A> shows the pip value on its
          own, and the <A to="/resources/margin-calculator">margin calculator</A> shows what the position needs as margin at your leverage.
        </P>

        <H2>Worked examples: stocks and F&amp;O</H2>
        <H3>Shares: ₹5,00,000 capital, 1% risk, buy at ₹1,240, stop ₹1,212</H3>
        <Table
          head={['Step', 'Working']}
          rows={[
            ['Risk budget', `1% × ₹5,00,000 = ${inr(SHARES_R.budget)}`],
            ['Loss per share at the stop', `₹1,240 − ₹1,212 = ${inr(SHARES_R.riskPerUnit)}`],
            ['Shares', `${inr(SHARES_R.budget)} ÷ ${inr(SHARES_R.riskPerUnit)} = ${SHARES_R.exactLots.toFixed(2)}, rounded down to ${SHARES_R.lots}`],
            ['Amount at risk', `${SHARES_R.lots} × ${inr(SHARES_R.riskPerUnit)} = ${inr(SHARES_R.riskAtSize)}, with ${inr(SHARES_R.unused)} unused`],
            ['Position value', `${SHARES_R.lots} × ₹1,240 = ${inr(SHARES_R.positionValue)}, ${pct(SHARES_R.capitalShare)} of the capital`],
          ]}
        />
        <H3>Futures: sell at ₹2,480, stop ₹2,502, a made-up lot size of 500</H3>
        <Table
          head={['Step', 'Working']}
          rows={[
            ['Risk budget', `1% × ₹10,00,000 = ${inr(FUT_R.budget)}`],
            ['Loss of one lot at the stop', `(₹2,502 − ₹2,480) × 500 = ${inr(FUT_R.riskPerLot)}`],
            ['Lots', `${inr(FUT_R.budget)} ÷ ${inr(FUT_R.riskPerLot)} = ${FUT_R.exactLots.toFixed(2)}, rounded down to ${FUT_R.lots}`],
            ['What the calculator says', `No whole lot fits: one lot would risk ${pct(FUT_R.oneLotRiskShare)} of the capital`],
            [
              'With a 1.5% budget',
              `${inr(FUT_WIDER_R.budget)} ÷ ${inr(FUT_WIDER_R.riskPerLot)} = ${FUT_WIDER_R.exactLots.toFixed(2)}, rounded down to ${FUT_WIDER_R.lots} lot: ${inr(FUT_WIDER_R.riskAtSize)} at risk, ${inr(FUT_WIDER_R.unused)} unused`,
            ],
          ]}
        />
        <P>
          The contract in the 1.5% case is worth 500 × ₹2,480 = {inr(FUT_WIDER_R.positionValue)}, more than the capital. Futures are traded on margin,
          and this calculator does not check whether your account holds enough of it.
        </P>
        <H3>Options: buy at a premium of ₹120, stop ₹80, a made-up lot size of 100</H3>
        <Table
          head={['Step', 'Working']}
          rows={[
            ['Risk budget', `2% × ₹3,00,000 = ${inr(OPT_R.budget)}`],
            ['Loss of one lot at the stop', `(₹120 − ₹80) × 100 = ${inr(OPT_R.riskPerLot)}`],
            ['Lots', `${inr(OPT_R.budget)} ÷ ${inr(OPT_R.riskPerLot)} = ${OPT_R.exactLots.toFixed(2)}, rounded down to ${OPT_R.lots}`],
            ['Amount at risk', `${inr(OPT_R.riskAtSize)}, with ${inr(OPT_R.unused)} unused`],
            ['Premium paid', `100 × ₹120 = ${inr(OPT_R.positionValue)}, ${pct(OPT_R.capitalShare)} of the capital`],
            ['With no stop', `The whole premium, ${inr(OPT_R.positionValue)} a lot, is at risk: more than the budget, so no whole lot fits`],
          ]}
        />

        <H2>Lot size: read it from the contract</H2>
        <P>
          In futures and options the lot size belongs to the contract, not to the calculator. The exchange sets it for each contract and revises it, so type
          the lot shown for your exact contract and expiry in your broker&apos;s order window or in the exchange&apos;s contract specification. This page
          does not list lot sizes.
        </P>
        <P>
          For index derivatives in India, SEBI&apos;s circular of 1 Oct 2024 (SEBI/HO/MRD/TPD/P/CIR/2024/132, para 5.4.1) says a contract must be worth at
          least ₹15 lakh when it is introduced, and that the lot size is fixed so that the contract value on the day of review is between ₹15 lakh and ₹20
          lakh; para 5.4.3 applies this to new index contracts introduced after 20 Nov 2024. Lots are set from prices, so a lot that fitted the band at one
          review can change at the next. It also makes one lot a large position: a 1% move against a ₹15 lakh contract is ₹15,000, the whole 1% budget of
          a ₹15 lakh account. Charges on top of that loss are listed in <A to="/resources/fo-charges-rates">F&amp;O charges and STT rates</A>.
        </P>

        <H2>What this calculator does not do</H2>
        <UL>
          <li>It leaves out charges: brokerage, STT and exchange fees, spread, commission and swap. Add them to the loss at the stop, or leave room for them.</li>
          <li>It assumes the stop fills at the stop price. A gap or a fast market can fill past it, and a sold option can lose far more than the stop distance.</li>
          <li>It does not check margin or whether your account can hold the position.</li>
          <li>It does not use live prices: when the pair&apos;s quote currency is not your account currency, the pip value uses an approximate reference rate.</li>
          <li>It does not know any lot size or your broker&apos;s lot step: you type the F&amp;O lot, forex is rounded to 0.01 lot and shares to whole units, with no fractional shares.</li>
          <li>It does not choose the risk percentage or the trade, and it is not advice.</li>
        </UL>

        <H2>Check the size you actually traded</H2>
        <P>
          The calculator plans one trade; the stop you really used and the loss you really took are in your trade history. In TradeQut&apos;s Analytics
          the Risk tab shows the money at the stop on each trade that has a stop loss, with its share of the balance, and the losing trades that ended
          beyond the stop. See the <A to="/forex-trading-journal">forex trading journal</A> and <A to="/fo-trading-journal">F&amp;O trading journal</A>{' '}
          pages for what is recorded. To plan the target, use the <A to="/resources/risk-reward">risk-reward calculator</A>; to see how the risk per trade
          changes the chance of a deep drawdown, the <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A>.
        </P>

        <Faq items={FAQ} />
        <Sources items={SOURCES} />
        <Disclaimer>
          Educational calculator. It does arithmetic on the numbers you enter and does not know your broker&apos;s contract, charges or margin. TradeQut is a
          journaling and analytics tool, not an investment adviser or research analyst (in India, not a SEBI-registered investment adviser), and nothing
          here is a recommendation to buy or sell any currency, security or contract. Lot sizes and specifications change; check them with your broker or
          the exchange before trading.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
