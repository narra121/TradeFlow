import { useMemo, useState } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { CalcLayout, DecimalInput, FormulaDisclosure, LiveResult, calcInputClass, calcLabelClass, parseDecimal } from '@/components/content/calculator';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table } from '@/content/components/ArticleParts';
import { ACCOUNT_CURRENCIES, FOREX_PAIRS, contractSizeOf, pipValue, type AccountCurrency } from '@/content/forexPairs';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatMoney, formatPercent } from '@/lib/format';
import { drawdownRoom, lotsWithinRoom, type DailyBasis, type DrawdownError, type MaxType } from '@/lib/forex/propDrawdown';
import { cn } from '@/lib/utils';

const PATH = '/resources/prop-firm-drawdown-calculator';
const NAME = 'Prop firm drawdown calculator';
const TITLE = 'Prop Firm Drawdown Calculator: Daily and Trailing | TradeQut';
const DESCRIPTION =
  'How much you can still lose today before a prop-firm daily loss or maximum drawdown limit, static or trailing, and the lot size that fits at your stop.';

const FTMO_SOURCE = { label: 'FTMO: Trading Objectives (page modified 2 Nov 2026)', url: 'https://ftmo.com/en/trading-objectives/', checked: '2026-11-15' };

interface Preset {
  label: string;
  dailyPct: string;
  dailyBasis: DailyBasis;
  maxPct: string;
  maxType: MaxType;
  lock: boolean;
  targetPct: string;
}

const PRESETS: Preset[] = [
  { label: 'FTMO 2-Step rules', dailyPct: '5', dailyBasis: 'initial', maxPct: '10', maxType: 'static', lock: false, targetPct: '10' },
  { label: 'FTMO 1-Step rules', dailyPct: '3', dailyBasis: 'initial', maxPct: '10', maxType: 'trailing', lock: false, targetPct: '10' },
];

const ERRORS: Record<DrawdownError, string> = {
  initial: 'Enter the account size the challenge started with.',
  balances: 'Enter the balance at the start of the day and your equity now.',
  'daily-range': 'The daily loss limit must be above 0% and below 100%.',
  'max-range': 'The maximum loss must be above 0% and below 100%.',
  'target-range': 'The profit target cannot be negative.',
};

const FAQ: FaqItem[] = [
  {
    question: 'How is a prop firm daily loss limit calculated?',
    answer:
      'Most firms set it as a percentage, either of the starting account size or of the balance the day began with. The level you must stay above is the day-start balance minus that amount. With a $100,000 account, a 5% limit of the starting size and a day that began at $101,200, the floor is $101,200 − $5,000 = $96,200. Many firms count open trades, so your equity (balance plus open P&L) is what is compared with it.',
  },
  {
    question: 'What is the difference between static and trailing drawdown?',
    answer:
      'A static maximum loss is a fixed level: starting size minus the limit, for example $100,000 − 10% = $90,000, whatever happens later. A trailing limit follows your highest balance up: with a $50,000 account and a $2,500 trailing limit, a peak of $52,000 moves the floor to $49,500. Some firms stop the trail once the floor reaches the starting balance; others let it keep rising. Read your firm\'s rule for which applies and whether it trails at the end of the day or during it.',
  },
  {
    question: 'What does FTMO use?',
    answer:
      'FTMO\'s Trading Objectives page (modified 2 November 2026, read 15 November 2026) gives the 2-Step challenge a Maximum Daily Loss of 5% of the initial capital, recalculated at 00:00 CE(S)T from the previous day\'s closing balance and compared with equity, and a static Maximum Loss of 10%. The 1-Step has a 3% daily loss and a 10% end-of-day trailing maximum loss based on the highest balance at 00:00 CE(S)T. Rules change; check the page before relying on them.',
  },
  {
    question: 'Which limit will I hit first?',
    answer:
      'Whichever floor is higher. Early in a challenge the daily limit is usually the closer one; after a drawdown the overall limit can sit above today\'s daily floor and become the one that ends the account. The calculator shows both floors and says which is binding.',
  },
  {
    question: 'How do I size a trade inside the limits?',
    answer:
      'Divide the room left by the loss of one lot at your stop: lots = room ÷ (stop in pips × pip value per lot). With $2,500 of room, a 25-pip stop on EUR/USD ($10 a pip per lot) fits 10 lots before the limit; that is the most the limit allows, not a size to trade. Fixed risk per trade, well below the room, keeps several losses survivable.',
  },
  {
    question: 'Does spread, commission or swap count?',
    answer:
      'They reduce your equity like any loss. A stop that is hit costs the stop distance plus the spread and commission, and overnight swap moves equity too, so leave a margin below the calculated room.',
  },
  {
    question: 'Does TradeQut track prop-firm limits for me?',
    answer:
      'Not automatically. In TradeQut you mark an account as a prop challenge or a funded account and set its status (active, breached, passed), write your firm\'s limits as rules, mark the trades that broke them and see what each broken rule cost. Analytics shows the current and deepest drawdown of your closed trades. It does not read your live equity and it does not warn you before a limit.',
  },
];

export function PropFirmDrawdownCalculatorPage() {
  const [initialText, setInitialText] = useState('100000');
  const [dayStartText, setDayStartText] = useState('101200');
  const [currentText, setCurrentText] = useState('100400');
  const [peakText, setPeakText] = useState('101800');
  const [dailyPctText, setDailyPctText] = useState('5');
  const [dailyBasis, setDailyBasis] = useState<DailyBasis>('initial');
  const [maxPctText, setMaxPctText] = useState('10');
  const [maxType, setMaxType] = useState<MaxType>('static');
  const [lock, setLock] = useState(false);
  const [targetText, setTargetText] = useState('10');
  const [pairIndex, setPairIndex] = useState(0);
  const [stopText, setStopText] = useState('25');
  const [currency, setCurrency] = useState<AccountCurrency>('USD');

  const load = (p: Preset) => {
    setDailyPctText(p.dailyPct);
    setDailyBasis(p.dailyBasis);
    setMaxPctText(p.maxPct);
    setMaxType(p.maxType);
    setLock(p.lock);
    setTargetText(p.targetPct);
  };

  const r = useMemo(
    () =>
      drawdownRoom({
        initial: parseDecimal(initialText),
        dayStart: parseDecimal(dayStartText),
        current: parseDecimal(currentText),
        peak: parseDecimal(peakText),
        dailyPct: parseDecimal(dailyPctText),
        dailyBasis,
        maxPct: parseDecimal(maxPctText),
        maxType,
        lockAtInitial: lock,
        targetPct: parseDecimal(targetText),
      }),
    [initialText, dayStartText, currentText, peakText, dailyPctText, dailyBasis, maxPctText, maxType, lock, targetText],
  );
  const pair = FOREX_PAIRS[pairIndex];
  const perLot = pipValue(pair, contractSizeOf(pair), currency).inAccount;
  const stop = parseDecimal(stopText);
  const lots = r.status === 'ok' ? lotsWithinRoom(r.room, stop, perLot) : 0;
  const money = (n: number) => formatMoney(n, currency);
  // 'balances' is about the day's start unless that is filled in, then about equity now.
  const balancesField = parseDecimal(dayStartText) > 0 ? 'current' : 'dayStart';
  const fieldError = (e: DrawdownError, field?: 'dayStart' | 'current') =>
    r.status === 'error' && r.error === e && (!field || field === balancesField) ? ERRORS[e] : null;

  const summary =
    r.status === 'error'
      ? ERRORS[r.error]
      : r.breached
        ? `Limit reached: equity is ${money(-r.room)} below the ${r.binding === 'daily' ? 'daily' : 'overall'} floor.`
        : `Room left ${money(r.room)} before the ${r.binding === 'daily' ? 'daily loss' : 'maximum loss'} limit; ${lots.toFixed(2)} lots fit at a ${stop}-pip stop.`;

  const radio = (name: string, value: string, checked: boolean, onChange: () => void, label: string) => (
    <label
      key={value}
      className={cn(
        'flex min-h-10 max-md:min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
        checked ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground-soft hover:bg-secondary',
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );

  return (
    <ContentPageShell title={TITLE} description={DESCRIPTION} path={PATH} jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)} maxWidth="max-w-5xl">
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current={NAME} />
      <h1 className="mb-2 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">Prop firm drawdown calculator</h1>
      <p className="mb-6 text-base text-foreground-soft">
        How much you can still lose today before a daily loss or maximum loss limit, static or trailing, and what lot size that leaves at your stop.
      </p>

      <div className="max-w-[72ch]">
        <ShortAnswer>
          Daily floor = day-start balance − daily limit. Static floor = starting size − maximum loss; a trailing floor is your highest balance − maximum
          loss. The room you have left is your equity minus the higher of the two floors. Example: $100,000 account, 5% daily and 10% static, day began at
          $101,200, equity $100,400: daily floor $96,200, overall floor $90,000, room $4,200.
        </ShortAnswer>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => load(p)}
            className="inline-flex h-9 max-md:h-11 items-center rounded-md border border-input px-3 text-sm text-foreground-soft hover:bg-secondary"
          >
            Load the {p.label}
          </button>
        ))}
      </div>

      <CalcLayout
        inputs={
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="dd-initial" className={calcLabelClass}>Account size at the start</label>
                <DecimalInput id="dd-initial" value={initialText} onChange={setInitialText} error={fieldError('initial')} />
              </div>
              <div>
                <label htmlFor="dd-currency" className={calcLabelClass}>Account currency</label>
                <select id="dd-currency" value={currency} onChange={(e) => setCurrency(e.target.value as AccountCurrency)} className={calcInputClass}>
                  {ACCOUNT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dd-daystart" className={calcLabelClass}>Balance at the start of today</label>
                <DecimalInput id="dd-daystart" value={dayStartText} onChange={setDayStartText} error={fieldError('balances', 'dayStart')} />
              </div>
              <div>
                <label htmlFor="dd-current" className={calcLabelClass}>Equity now (balance plus open P&amp;L)</label>
                <DecimalInput id="dd-current" value={currentText} onChange={setCurrentText} error={fieldError('balances', 'current')} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="dd-daily" className={calcLabelClass}>Daily loss limit (%)</label>
                <DecimalInput id="dd-daily" value={dailyPctText} onChange={setDailyPctText} error={fieldError('daily-range')} />
              </div>
              <fieldset>
                <legend className={calcLabelClass}>Daily limit is a % of</legend>
                <div className="flex gap-2">
                  {radio('dd-basis', 'initial', dailyBasis === 'initial', () => setDailyBasis('initial'), 'Starting size')}
                  {radio('dd-basis', 'dayStart', dailyBasis === 'dayStart', () => setDailyBasis('dayStart'), "Today's start")}
                </div>
              </fieldset>
              <div>
                <label htmlFor="dd-max" className={calcLabelClass}>Maximum loss (%)</label>
                <DecimalInput id="dd-max" value={maxPctText} onChange={setMaxPctText} error={fieldError('max-range')} />
              </div>
              <fieldset>
                <legend className={calcLabelClass}>Maximum loss is</legend>
                <div className="flex gap-2">
                  {radio('dd-type', 'static', maxType === 'static', () => setMaxType('static'), 'Static')}
                  {radio('dd-type', 'trailing', maxType === 'trailing', () => setMaxType('trailing'), 'Trailing')}
                </div>
              </fieldset>
            </div>
            {maxType === 'trailing' && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="dd-peak" className={calcLabelClass}>Highest balance so far</label>
                  <DecimalInput id="dd-peak" value={peakText} onChange={setPeakText} />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                  <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="h-4 w-4 accent-primary" />
                  Trail stops at the starting balance
                </label>
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="dd-target" className={calcLabelClass}>Profit target (%)</label>
                <DecimalInput id="dd-target" value={targetText} onChange={setTargetText} error={fieldError('target-range')} />
              </div>
              <div>
                <label htmlFor="dd-pair" className={calcLabelClass}>Pair</label>
                <select id="dd-pair" value={pairIndex} onChange={(e) => setPairIndex(Number(e.target.value))} className={calcInputClass}>
                  {FOREX_PAIRS.map((p, i) => (
                    <option key={p.value} value={i}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dd-stop" className={calcLabelClass}>Stop (pips)</label>
                <DecimalInput id="dd-stop" value={stopText} onChange={setStopText} />
              </div>
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
                <p className="text-sm text-muted-foreground">
                  {r.breached ? 'Limit reached' : `Room left before the ${r.binding === 'daily' ? 'daily loss limit' : 'maximum loss'}`}
                </p>
                <p className={cn('num mb-4 text-2xl font-semibold', r.breached ? 'text-loss' : 'text-foreground')}>
                  {r.breached ? `${money(-r.room)} past the floor` : money(r.room)}
                </p>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Daily floor</dt>
                    <dd className="num text-base font-semibold text-foreground">{money(r.dailyFloor)}</dd>
                    <dd className="text-xs text-muted-foreground">Limit {money(r.dailyLimit)}, {formatPercent(r.usedDailyPct, 0)} used today</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">{maxType === 'trailing' ? 'Trailing floor' : 'Overall floor'}</dt>
                    <dd className="num text-base font-semibold text-foreground">{money(r.maxFloor)}</dd>
                    <dd className="text-xs text-muted-foreground">Room {money(r.roomMax)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Lots that fit at the stop</dt>
                    <dd className="num text-base font-semibold text-foreground">{lots.toFixed(2)}</dd>
                    <dd className="text-xs text-muted-foreground">{formatMoney(perLot, currency)} a pip per lot</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">To the profit target</dt>
                    <dd className="num text-base font-semibold text-foreground">
                      {r.toTarget === null ? 'No target' : r.toTarget <= 0 ? 'Reached' : money(r.toTarget)}
                    </dd>
                    {r.target !== null && <dd className="text-xs text-muted-foreground">Target equity {money(r.target)}</dd>}
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  The lots are the most the limit allows if the stop is hit, before spread, commission and swap; risk far less on a single trade.
                </p>
              </>
            )}
            <FormulaDisclosure>
              <p>Daily limit = daily % × starting size (or × today&apos;s start). Daily floor = today&apos;s start − daily limit.</p>
              <p>Static floor = starting size − maximum %. Trailing floor = highest balance − maximum % × starting size (capped at the starting balance if the trail stops there).</p>
              <p>Room = equity now − the higher floor. Lots = room ÷ (stop pips × pip value per lot), rounded down to 0.01.</p>
            </FormulaDisclosure>
            <LiveResult text={summary} />
          </>
        }
      />

      <div className="max-w-[72ch]">
        <H2>How prop firms measure loss limits</H2>
        <P>Four choices decide what the numbers mean, and firms make them differently. Find each one in your firm&apos;s rules before you trade:</P>
        <Table
          head={['Choice', 'Options', 'What it changes']}
          rows={[
            ['Daily limit base', 'A % of the starting size, or of the balance the day began with', 'After a winning streak a % of the day-start balance is a larger amount'],
            ['When the day resets', 'A fixed clock time in the firm\'s time zone (FTMO uses 00:00 CE(S)T)', 'Which trades count towards today; an evening trade in Asia can fall on the next day'],
            ['Balance or equity', 'Closed balance only, or equity including open trades', 'With equity, a trade that goes against you can breach the limit before it closes'],
            ['Overall limit', 'Static, trailing at the end of the day, or trailing intraday; with or without a stop at the starting balance', 'A trailing floor rises with every new high, so gains do not widen your room'],
          ]}
        />

        <H2>Worked example: static and trailing</H2>
        <P>
          A $100,000 account with a 5% daily limit of the starting size and a 10% maximum loss. Yesterday closed at $101,200 and equity is now $100,400.
        </P>
        <Table
          head={['', 'Static 10%', 'Trailing 10%, highest balance $101,800']}
          rows={[
            ['Daily floor', '$101,200 − $5,000 = $96,200', '$96,200'],
            ['Overall floor', '$100,000 − $10,000 = $90,000', '$101,800 − $10,000 = $91,800'],
            ['Binding floor', 'Daily, $96,200', 'Daily, $96,200'],
            ['Room left', '$100,400 − $96,200 = $4,200', '$4,200'],
            ['Lots at a 25-pip EUR/USD stop', '$4,200 ÷ (25 × $10) = 16.80', '16.80'],
          ]}
        />
        <P>
          The trailing floor matters later. If the account then falls to $93,000 over several days, the daily floor on a day that starts at $93,000 is
          $88,000, below both overall floors, and the overall limit binds: $3,000 of room under a static limit, $1,200 under the trailing one.
        </P>

        <Callout title="Room is not a position size">
          The lots figure is the size at which one stopped trade would end the account. Sizing every trade to a small fixed share of the room keeps a run
          of losses survivable; the <A to="/resources/risk-of-ruin-calculator">risk of ruin calculator</A> shows how likely a drawdown is at a given risk
          per trade.
        </Callout>

        <H2>Keep the challenge in a journal</H2>
        <P>
          The calculator answers one question for today. A <A to="/prop-firm-trading-journal">prop firm trading journal</A> answers the one that ends most
          challenges: which habits take you close to the limits. In TradeQut an account can be a prop challenge or a funded account with a status
          (active, breached, passed); you write the firm&apos;s rules as your own, mark the trades that broke them, and Analytics shows what the breaks
          cost and your current and deepest drawdown. TradeQut does not read your live equity or warn you before a limit; this calculator and your
          firm&apos;s dashboard do that part. Import the <A to="/mt5-trading-journal">MT5</A> or <A to="/mt4-trading-journal">MT4</A> report from the
          account, or <A to="/import-trades-from-screenshot">screenshots</A> when the firm offers no export.
        </P>
        <P>
          Related: <A to="/resources/position-size">position size calculator</A>, <A to="/resources/forex-market-hours">forex market hours</A> (the daily
          reset is a clock time), and <A to="/blog/prop-trading-challenges">how to pass a prop challenge with a journal</A>.
        </P>

        <Faq items={FAQ} />
        <Sources items={[FTMO_SOURCE]} />
        <Disclaimer>
          Educational calculator. It does arithmetic on the numbers you enter; your firm&apos;s rules and dashboard are the authority. TradeQut is not
          affiliated with any prop firm, is a journaling and analytics tool, not an investment adviser, and nothing here is a recommendation to trade.
        </Disclaimer>
        <SignupCta />
      </div>
    </ContentPageShell>
  );
}
